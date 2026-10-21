#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Write};
use std::mem::size_of;
use std::net::TcpListener;
use std::ptr;
use std::slice;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::sync_channel;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use nnnoiseless::DenoiseState;
use rtrb::{Consumer, Producer, RingBuffer};
use serde::{Deserialize, Serialize};
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
};
use windows::core::{implement, w, ComInterface, HRESULT, Result, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, WAIT_OBJECT_0};
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, BITMAPINFO, BITMAPINFOHEADER,
    DIB_RGB_COLORS, RGBQUAD,
};
use windows::Win32::Media::Audio::{
    eRender, AudioSessionStateExpired, ActivateAudioInterfaceAsync,
    IActivateAudioInterfaceAsyncOperation, IActivateAudioInterfaceCompletionHandler,
    IActivateAudioInterfaceCompletionHandler_Impl, IAudioCaptureClient, IAudioClient,
    IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2,
    IAudioSessionNotification, IAudioSessionNotification_Impl, IMMDeviceEnumerator,
    MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
    AUDCLNT_STREAMFLAGS_EVENTCALLBACK, AUDCLNT_STREAMFLAGS_LOOPBACK,
    AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY, DEVICE_STATE_ACTIVE, WAVEFORMATEX,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
    TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{
    CreateEventW, OpenProcess, QueryFullProcessImageNameW, WaitForMultipleObjects,
    PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE,
};
use windows::Win32::UI::Shell::ExtractIconExW;
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};

#[repr(C)]
struct AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
    target_process_id: u32,
    process_loopback_mode: u32,
}

#[repr(C)]
struct AUDIOCLIENT_ACTIVATION_PARAMS {
    activation_type: u32,
    process_loopback_params: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS,
}

#[repr(C)]
struct PropVariantBlob {
    vt: u16,
    reserved: [u16; 3],
    cb_size: u32,
    _pad: u32,
    blob_data: *const u8,
}

#[implement(IActivateAudioInterfaceCompletionHandler)]
struct ActivationHandler {
    tx: std::sync::mpsc::SyncSender<Result<IAudioClient>>,
}

impl IActivateAudioInterfaceCompletionHandler_Impl for ActivationHandler {
    #[allow(non_snake_case)]
    fn ActivateCompleted(
        &self,
        activateoperation: Option<&IActivateAudioInterfaceAsyncOperation>,
    ) -> Result<()> {
        let res = (|| unsafe {
            let op = activateoperation.ok_or_else(|| windows::core::Error::from_win32())?;
            let mut hr = HRESULT(0);
            let mut unk = None;
            op.GetActivateResult(&mut hr, &mut unk)?;
            hr.ok()?;
            let client: IAudioClient =
                unk.ok_or_else(|| windows::core::Error::from_win32())?.cast()?;
            Ok(client)
        })();

        let _ = self.tx.send(res);
        Ok(())
    }
}

struct ThrottleNotifier {
    dirty: Mutex<bool>,
    cvar: Condvar,
}

impl ThrottleNotifier {
    fn new() -> Self {
        Self {
            dirty: Mutex::new(true),
            cvar: Condvar::new(),
        }
    }

    fn trigger(&self) {
        if let Ok(mut d) = self.dirty.lock() {
            *d = true;
            self.cvar.notify_one();
        }
    }
}

#[implement(IAudioSessionNotification)]
struct SessionNotificationHandler {
    notifier: Arc<ThrottleNotifier>,
}

impl IAudioSessionNotification_Impl for SessionNotificationHandler {
    #[allow(non_snake_case)]
    fn OnSessionCreated(&self, _newsession: Option<&IAudioSessionControl>) -> Result<()> {
        self.notifier.trigger();
        Ok(())
    }
}

// --- DSP 等化器與動態音量平衡資料結構 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EqBandDto {
    pub freq: f32,
    pub gain_db: f32,
    pub q: f32,
}

fn default_eq_bands() -> Vec<EqBandDto> {
    vec![
        EqBandDto { freq: 60.0, gain_db: 0.0, q: 0.7 },
        EqBandDto { freq: 150.0, gain_db: 0.0, q: 1.0 },
        EqBandDto { freq: 400.0, gain_db: 0.0, q: 1.4 },
        EqBandDto { freq: 1000.0, gain_db: 0.0, q: 1.4 },
        EqBandDto { freq: 2500.0, gain_db: 0.0, q: 1.4 },
        EqBandDto { freq: 6000.0, gain_db: 0.0, q: 1.0 },
        EqBandDto { freq: 12000.0, gain_db: 0.0, q: 0.7 },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EqConfigDto {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_eq_bands")]
    pub bands: Vec<EqBandDto>,
}

impl Default for EqConfigDto {
    fn default() -> Self {
        Self {
            enabled: false,
            bands: default_eq_bands(),
        }
    }
}

// 系統混音 (喇叭 / OBS) 動態音量平衡預設值: -80 / 30 / -10 / 0 / -20 / 40
fn def_spk_noise_floor() -> f32 { -80.0 }
fn def_spk_boost() -> f32 { 30.0 }
fn def_spk_safe_min() -> f32 { -10.0 }
fn def_spk_safe_max() -> f32 { 0.0 }
fn def_spk_down_cut() -> f32 { -20.0 }
fn def_spk_loud_max() -> f32 { 40.0 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoostConfigDto {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "def_spk_noise_floor")]
    pub noise_floor_db: f32,
    #[serde(default = "def_spk_boost")]
    pub boost_db: f32,
    #[serde(default = "def_spk_safe_min")]
    pub safe_min_db: f32,
    #[serde(default = "def_spk_safe_max")]
    pub safe_max_db: f32,
    #[serde(default = "def_spk_down_cut")]
    pub downward_cut_db: f32,
    #[serde(default = "def_spk_loud_max")]
    pub loud_max_db: f32,
}

impl Default for BoostConfigDto {
    fn default() -> Self {
        Self {
            enabled: false,
            noise_floor_db: def_spk_noise_floor(),
            boost_db: def_spk_boost(),
            safe_min_db: def_spk_safe_min(),
            safe_max_db: def_spk_safe_max(),
            downward_cut_db: def_spk_down_cut(),
            loud_max_db: def_spk_loud_max(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChannelDspDto {
    #[serde(default)]
    pub eq: EqConfigDto,
    #[serde(default)]
    pub boost: BoostConfigDto,
}

// --- 麥克風擴充模組設定結構 (預設值: -55 / 10 / -35 / 0 / -20 / 40) ---

fn default_mic_input() -> String { "__DEFAULT__".to_string() }
fn default_mic_output() -> String { "__NONE__".to_string() }
fn default_mic_vol() -> f32 { 1.0 }
fn default_hpf_hz() -> f32 { 80.0 }
fn default_nr_pre_gain() -> f32 { 1.0 }
fn default_nr_vad() -> f32 { 0.45 }
fn default_nr_wet() -> f32 { 0.95 }

fn def_mic_noise_floor() -> f32 { -55.0 }
fn def_mic_boost() -> f32 { 10.0 }
fn def_mic_safe_min() -> f32 { -35.0 }
fn def_mic_safe_max() -> f32 { 0.0 }
fn def_mic_down_cut() -> f32 { -20.0 }
fn def_mic_loud_max() -> f32 { 40.0 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicConfigDto {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub self_monitor: bool,
    #[serde(default = "default_mic_input")]
    pub input_device: String,
    #[serde(default = "default_mic_output")]
    pub output_device: String,
    #[serde(default = "default_mic_vol")]
    pub output_volume: f32,

    // 第 1 關：前置高通濾波器 (HPF 低切)
    #[serde(default)]
    pub hpf_enabled: bool,
    #[serde(default = "default_hpf_hz")]
    pub hpf_cutoff_hz: f32,

    // 第 2 關：AI 智慧雜訊抑制 (輸入前增益 + VAD 人聲權重門檻 + 降噪深度)
    #[serde(default)]
    pub nr_enabled: bool,
    #[serde(default = "default_nr_pre_gain")]
    pub nr_pre_gain: f32,
    #[serde(default = "default_nr_vad")]
    pub nr_vad_thresh: f32,
    #[serde(default = "default_nr_wet")]
    pub nr_wet_mix: f32,

    // 第 3 關：7 段人聲等化器 (7-Band EQ)
    #[serde(default)]
    pub eq: EqConfigDto,

    // 第 4 關：動態音量平衡 (6 參數統一規格)
    #[serde(default)]
    pub dyn_enabled: bool,
    #[serde(default = "def_mic_noise_floor")]
    pub noise_floor_db: f32,
    #[serde(default = "def_mic_boost")]
    pub upward_boost_db: f32,
    #[serde(default = "def_mic_safe_min")]
    pub safe_min_db: f32,
    #[serde(default = "def_mic_safe_max")]
    pub safe_max_db: f32,
    #[serde(default = "def_mic_down_cut")]
    pub downward_cut_db: f32,
    #[serde(default = "def_mic_loud_max")]
    pub loud_max_db: f32,
}

impl Default for MicConfigDto {
    fn default() -> Self {
        Self {
            enabled: false,
            self_monitor: false,
            input_device: default_mic_input(),
            output_device: default_mic_output(),
            output_volume: default_mic_vol(),
            hpf_enabled: false,
            hpf_cutoff_hz: default_hpf_hz(),
            nr_enabled: false,
            nr_pre_gain: default_nr_pre_gain(),
            nr_vad_thresh: default_nr_vad(),
            nr_wet_mix: default_nr_wet(),
            eq: EqConfigDto::default(),
            dyn_enabled: false,
            noise_floor_db: def_mic_noise_floor(),
            upward_boost_db: def_mic_boost(),
            safe_min_db: def_mic_safe_min(),
            safe_max_db: def_mic_safe_max(),
            downward_cut_db: def_mic_down_cut(),
            loud_max_db: def_mic_loud_max(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicLevelsDto {
    pub input_db: f32,
    pub output_db: f32,
    pub is_running: bool,
    pub conflict_warning: Option<String>,
}

// --- 單一 config.json 資料結構 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalVolumeStateDto {
    pub mon_vol: f32,
    pub str_vol: f32,
    pub mon_muted: bool,
    pub str_muted: bool,
    pub panic_muted: bool,
    #[serde(default)]
    pub mon_dsp: Option<ChannelDspDto>,
    #[serde(default)]
    pub str_dsp: Option<ChannelDspDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppChannelVolumeDto {
    pub mon_vol: f32,
    pub str_vol: f32,
    pub mon_muted: bool,
    pub str_muted: bool,
    #[serde(default)]
    pub mon_dsp: Option<ChannelDspDto>,
    #[serde(default)]
    pub str_dsp: Option<ChannelDspDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileDto {
    pub name: String,
    pub global: GlobalVolumeStateDto,
    #[serde(default)]
    pub customized_apps: HashMap<String, AppChannelVolumeDto>,
    #[serde(default)]
    pub mic: MicConfigDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullConfigDto {
    #[serde(default = "default_blackhole")]
    pub blackhole_device: String,
    #[serde(default = "default_monitor")]
    pub monitor_device: String,
    #[serde(default = "default_obs_port")]
    pub obs_port: u16,
    #[serde(default = "default_buffer_size")]
    pub buffer_size: u32,

    #[serde(default = "default_active_profile_id")]
    pub active_profile_id: String,
    #[serde(default = "default_profiles")]
    pub profiles: HashMap<String, ProfileDto>,
}

fn default_blackhole() -> String { "__DEFAULT__".to_string() }
fn default_monitor() -> String { "Line (AG06/AG03)".to_string() }
fn default_obs_port() -> u16 { 9876 }
fn default_buffer_size() -> u32 { 256 }
fn default_active_profile_id() -> String { "prof_1".to_string() }
fn default_profiles() -> HashMap<String, ProfileDto> {
    let mut map = HashMap::new();
    map.insert(
        "prof_1".to_string(),
        ProfileDto {
            name: "Profile 1".to_string(),
            global: GlobalVolumeStateDto {
                mon_vol: 1.0,
                str_vol: 1.0,
                mon_muted: false,
                str_muted: false,
                panic_muted: false,
                mon_dsp: None,
                str_dsp: None,
            },
            customized_apps: HashMap::new(),
            mic: MicConfigDto::default(),
        },
    );
    map
}

impl Default for FullConfigDto {
    fn default() -> Self {
        Self {
            blackhole_device: default_blackhole(),
            monitor_device: default_monitor(),
            obs_port: default_obs_port(),
            buffer_size: default_buffer_size(),
            active_profile_id: default_active_profile_id(),
            profiles: default_profiles(),
        }
    }
}

// --- 統一 6 參數「動態音量平衡」核心數學運算函式 ---
#[inline(always)]
fn compute_dynamic_gain_db(
    db: f32,
    noise_floor_db: f32,
    boost_db: f32,
    safe_min_db: f32,
    safe_max_db: f32,
    down_cut_db: f32,
    loud_max_db: f32,
    voice_weight: f32,
) -> f32 {
    let s_min = safe_min_db.max(noise_floor_db + 0.5);
    let s_max = safe_max_db.max(s_min + 0.5);
    let l_max = loud_max_db.max(s_max + 0.5);

    let max_boost = boost_db.abs();
    let max_cut = down_cut_db.abs();

    if db <= noise_floor_db - 6.0 {
        // 低於過小聲遮蔽門檻：捨棄補償 (0 dB 原音直通)
        0.0
    } else if db < s_min {
        // 過小聲區間 (過小聲遮蔽門檻 ~ 安全區下限)：靠近門檻補滿額，越接近安全區下限越趨近 0
        let range = (s_min - noise_floor_db).max(1.0);
        let progress = ((s_min - db) / range).clamp(0.0, 1.0);
        let gate_fade = if db < noise_floor_db {
            ((db - (noise_floor_db - 6.0)) / 6.0).clamp(0.0, 1.0)
        } else {
            1.0
        };
        let raw_boost = max_boost * progress * gate_fade * voice_weight;
        raw_boost.min(s_min - db)
    } else if db <= s_max {
        // 安全區 (安全區下限 ~ 安全區上限)：0 dB 原音穩定直通
        0.0
    } else if db < l_max {
        // 過大聲漸進區間 (安全區上限 ~ 過大聲音量上限)：越接近上限減少越多，到達上限時減少滿額
        let over_range = (l_max - s_max).max(1.0);
        let progress = ((db - s_max) / over_range).clamp(0.0, 1.0);
        let raw_cut = max_cut * progress;
        -(raw_cut.min(db - s_max))
    } else {
        // 超過過大聲音量上限：不捨棄聲音，固定套用滿額的「過大聲音量減少」量
        -(max_cut.min(db - s_max))
    }
}

// --- 雙二階 IIR 濾波器與 DSP 實時執行引擎 ---

#[derive(Clone, Copy)]
struct BiquadCoeffs {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
}

impl Default for BiquadCoeffs {
    fn default() -> Self {
        Self { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 }
    }
}

impl BiquadCoeffs {
    fn calculate_hpf(cutoff_hz: f32, sample_rate: f32) -> Self {
        let f0 = cutoff_hz.clamp(20.0, 400.0);
        let w0 = 2.0 * std::f32::consts::PI * f0 / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * 0.70710678);

        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;
        let b0 = (1.0 + cos_w0) * 0.5;
        let b1 = -(1.0 + cos_w0);
        let b2 = (1.0 + cos_w0) * 0.5;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
        }
    }

    fn calculate(band_idx: usize, freq: f32, gain_db: f32, q: f32, sample_rate: f32) -> Self {
        if gain_db.abs() < 0.05 {
            return Self::default();
        }
        let f0 = freq.clamp(20.0, sample_rate * 0.48);
        let q_clamped = q.clamp(0.2, 8.0);
        let a = 10.0f32.powf(gain_db / 40.0);
        let w0 = 2.0 * std::f32::consts::PI * f0 / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q_clamped);

        if band_idx == 0 {
            let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
            let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha;
            let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0);
            let a2 = (a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha;
            let b0 = a * ((a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha);
            let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0);
            let b2 = a * ((a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha);
            Self { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
        } else if band_idx == 6 {
            let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;
            let a0 = (a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha;
            let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w0);
            let a2 = (a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha;
            let b0 = a * ((a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha);
            let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0);
            let b2 = a * ((a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha);
            Self { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
        } else {
            let a0 = 1.0 + alpha / a;
            let a1 = -2.0 * cos_w0;
            let a2 = 1.0 - alpha / a;
            let b0 = 1.0 + alpha * a;
            let b1 = -2.0 * cos_w0;
            let b2 = 1.0 - alpha * a;
            Self { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
        }
    }
}

#[derive(Clone, Copy, Default)]
struct BiquadState {
    s1: f32,
    s2: f32,
}

impl BiquadState {
    #[inline(always)]
    fn process(&mut self, x: f32, c: &BiquadCoeffs) -> f32 {
        let y = c.b0 * x + self.s1;
        self.s1 = c.b1 * x - c.a1 * y + self.s2;
        self.s2 = c.b2 * x - c.a2 * y;
        y
    }
}

#[derive(Clone)]
struct ChannelDspRuntime {
    eq_enabled: bool,
    eq_coeffs: [BiquadCoeffs; 7],
    eq_state_l: [BiquadState; 7],
    eq_state_r: [BiquadState; 7],

    boost_enabled: bool,
    noise_floor_db: f32,
    boost_db: f32,
    safe_min_db: f32,
    safe_max_db: f32,
    downward_cut_db: f32,
    loud_max_db: f32,
    current_boost_gain: f32,
}

impl Default for ChannelDspRuntime {
    fn default() -> Self {
        Self {
            eq_enabled: false,
            eq_coeffs: [BiquadCoeffs::default(); 7],
            eq_state_l: [BiquadState::default(); 7],
            eq_state_r: [BiquadState::default(); 7],
            boost_enabled: false,
            noise_floor_db: def_spk_noise_floor(),
            boost_db: def_spk_boost(),
            safe_min_db: def_spk_safe_min(),
            safe_max_db: def_spk_safe_max(),
            downward_cut_db: def_spk_down_cut(),
            loud_max_db: def_spk_loud_max(),
            current_boost_gain: 1.0,
        }
    }
}

impl ChannelDspRuntime {
    #[inline(always)]
    fn process_stereo(&mut self, mut l: f32, mut r: f32) -> (f32, f32) {
        if self.eq_enabled {
            for i in 0..7 {
                l = self.eq_state_l[i].process(l, &self.eq_coeffs[i]);
                r = self.eq_state_r[i].process(r, &self.eq_coeffs[i]);
            }
        }

        if self.boost_enabled {
            let peak = l.abs().max(r.abs());
            let db = if peak > 1e-6 { 20.0 * peak.log10() } else { -120.0 };

            let target_gain_db = compute_dynamic_gain_db(
                db,
                self.noise_floor_db,
                self.boost_db,
                self.safe_min_db,
                self.safe_max_db,
                self.downward_cut_db,
                self.loud_max_db,
                1.0,
            );

            let target_gain = 10.0f32.powf(target_gain_db / 20.0);
            let rate = if target_gain < self.current_boost_gain { 0.01 } else { 0.0005 };
            self.current_boost_gain += (target_gain - self.current_boost_gain) * rate;

            l *= self.current_boost_gain;
            r *= self.current_boost_gain;
        }

        (l, r)
    }

    fn update_config(&mut self, dsp: &ChannelDspDto, sample_rate: f32) {
        self.eq_enabled = dsp.eq.enabled;
        for (i, band) in dsp.eq.bands.iter().enumerate().take(7) {
            self.eq_coeffs[i] = BiquadCoeffs::calculate(i, band.freq, band.gain_db, band.q, sample_rate);
        }
        self.boost_enabled = dsp.boost.enabled;
        self.noise_floor_db = dsp.boost.noise_floor_db;
        self.boost_db = dsp.boost.boost_db;
        self.safe_min_db = dsp.boost.safe_min_db;
        self.safe_max_db = dsp.boost.safe_max_db;
        self.downward_cut_db = dsp.boost.downward_cut_db;
        self.loud_max_db = dsp.boost.loud_max_db;
        if self.current_boost_gain <= 0.0 {
            self.current_boost_gain = 1.0;
        }
    }
}

// --- 麥克風 4 級專業 DSP 執行引擎 ---

struct MicDspRuntime {
    sample_rate: f32,
    output_volume: f32,

    // Stage 1: HPF
    hpf_enabled: bool,
    hpf_coeffs: BiquadCoeffs,
    hpf_state: BiquadState,

    // Stage 2: RNNoise (nnnoiseless) + Pre-Gain + VAD Gate + Dry/Wet
    nr_enabled: bool,
    nr_pre_gain: f32,
    nr_vad_thresh: f32,
    nr_wet_mix: f32,
    current_vad_prob: f32,
    vad_env_gain: f32,
    denoise: Box<DenoiseState<'static>>,
    nr_in_accum: Vec<f32>,

    // Stage 3: 7-Band EQ
    eq_enabled: bool,
    eq_coeffs: [BiquadCoeffs; 7],
    eq_state: [BiquadState; 7],

    // Stage 4: 動態音量平衡 (6 參數統一規格)
    dyn_enabled: bool,
    noise_floor_db: f32,
    upward_boost_db: f32,
    safe_min_db: f32,
    safe_max_db: f32,
    downward_cut_db: f32,
    loud_max_db: f32,
    current_dyn_gain: f32,
}

impl MicDspRuntime {
    fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            output_volume: 1.0,
            hpf_enabled: false,
            hpf_coeffs: BiquadCoeffs::calculate_hpf(80.0, sample_rate),
            hpf_state: BiquadState::default(),
            nr_enabled: false,
            nr_pre_gain: 1.0,
            nr_vad_thresh: 0.45,
            nr_wet_mix: 0.95,
            current_vad_prob: 1.0,
            vad_env_gain: 1.0,
            denoise: DenoiseState::new(),
            nr_in_accum: Vec::with_capacity(DenoiseState::FRAME_SIZE),
            eq_enabled: false,
            eq_coeffs: [BiquadCoeffs::default(); 7],
            eq_state: [BiquadState::default(); 7],
            dyn_enabled: false,
            noise_floor_db: def_mic_noise_floor(),
            upward_boost_db: def_mic_boost(),
            safe_min_db: def_mic_safe_min(),
            safe_max_db: def_mic_safe_max(),
            downward_cut_db: def_mic_down_cut(),
            loud_max_db: def_mic_loud_max(),
            current_dyn_gain: 1.0,
        }
    }

    fn update_config(&mut self, cfg: &MicConfigDto) {
        self.output_volume = cfg.output_volume;
        self.hpf_enabled = cfg.hpf_enabled;
        self.hpf_coeffs = BiquadCoeffs::calculate_hpf(cfg.hpf_cutoff_hz, self.sample_rate);

        self.nr_enabled = cfg.nr_enabled;
        self.nr_pre_gain = cfg.nr_pre_gain.clamp(0.0, 5.0);
        self.nr_vad_thresh = cfg.nr_vad_thresh.clamp(0.0, 0.98);
        self.nr_wet_mix = cfg.nr_wet_mix.clamp(0.0, 1.0);

        self.eq_enabled = cfg.eq.enabled;
        for (i, band) in cfg.eq.bands.iter().enumerate().take(7) {
            self.eq_coeffs[i] = BiquadCoeffs::calculate(i, band.freq, band.gain_db, band.q, self.sample_rate);
        }

        self.dyn_enabled = cfg.dyn_enabled;
        self.noise_floor_db = cfg.noise_floor_db;
        self.upward_boost_db = cfg.upward_boost_db;
        self.safe_min_db = cfg.safe_min_db;
        self.safe_max_db = cfg.safe_max_db;
        self.downward_cut_db = cfg.downward_cut_db;
        self.loud_max_db = cfg.loud_max_db;
        if self.current_dyn_gain <= 0.0 {
            self.current_dyn_gain = 1.0;
        }
    }

    #[inline(always)]
    fn process_post_nr_sample(&mut self, mut x: f32) -> f32 {
        // 第 3 關：7 段等化器
        if self.eq_enabled {
            for i in 0..7 {
                x = self.eq_state[i].process(x, &self.eq_coeffs[i]);
            }
        }

        // 第 4 關：動態音量平衡 (6 參數統一規格 + AI 人聲權重防底噪放大連動)
        if self.dyn_enabled {
            let peak = x.abs();
            let db = if peak > 1e-6 { 20.0 * peak.log10() } else { -120.0 };

            let voice_weight = if self.nr_enabled { self.vad_env_gain } else { 1.0 };

            let target_gain_db = compute_dynamic_gain_db(
                db,
                self.noise_floor_db,
                self.upward_boost_db,
                self.safe_min_db,
                self.safe_max_db,
                self.downward_cut_db,
                self.loud_max_db,
                voice_weight,
            );

            let target_gain = 10.0f32.powf(target_gain_db / 20.0);
            let rate = if target_gain < self.current_dyn_gain { 0.02 } else { 0.0006 };
            self.current_dyn_gain += (target_gain - self.current_dyn_gain) * rate;

            x *= self.current_dyn_gain;
        }

        (x * self.output_volume).clamp(-1.0, 1.0)
    }

    fn process_mono_chunk(&mut self, input: &[f32], out_vec: &mut Vec<f32>) {
        out_vec.clear();
        for &raw in input {
            // 第 1 關：前置高通濾波器 (HPF)
            let s1 = if self.hpf_enabled {
                self.hpf_state.process(raw, &self.hpf_coeffs)
            } else {
                raw
            };

            // 第 2 關：nnnoiseless AI 降噪 (輸入前增益 -> AI 辨識與 VAD 門檻 -> 降噪深度混合)
            if self.nr_enabled {
                let pre = s1 * self.nr_pre_gain;
                let boosted_s1 = if pre.abs() > 0.85 {
                    pre.signum() * (0.85 + 0.15 * ((pre.abs() - 0.85) / 0.15).tanh())
                } else {
                    pre
                };

                self.nr_in_accum.push(boosted_s1);
                if self.nr_in_accum.len() == DenoiseState::FRAME_SIZE {
                    let mut scaled_in = [0.0f32; DenoiseState::FRAME_SIZE];
                    let mut scaled_out = [0.0f32; DenoiseState::FRAME_SIZE];
                    for i in 0..DenoiseState::FRAME_SIZE {
                        scaled_in[i] = (self.nr_in_accum[i] * 32768.0).clamp(-32768.0, 32767.0);
                    }
                    let vad_prob = self.denoise.process_frame(&mut scaled_out[..], &scaled_in[..]);
                    self.current_vad_prob = vad_prob;

                    let target_vad_gain = if self.nr_vad_thresh <= 0.01 || vad_prob >= self.nr_vad_thresh {
                        1.0
                    } else {
                        let ratio = (vad_prob / self.nr_vad_thresh.max(0.01)).clamp(0.0, 1.0);
                        ratio * ratio
                    };

                    let wet_ratio = self.nr_wet_mix;
                    let dry_ratio = 1.0 - wet_ratio;

                    for i in 0..DenoiseState::FRAME_SIZE {
                        let vad_rate = if target_vad_gain > self.vad_env_gain { 0.05 } else { 0.002 };
                        self.vad_env_gain += (target_vad_gain - self.vad_env_gain) * vad_rate;

                        let dry = self.nr_in_accum[i];
                        let wet = scaled_out[i] / 32768.0;
                        let mixed = (dry * dry_ratio + wet * wet_ratio) * self.vad_env_gain;
                        let final_s = self.process_post_nr_sample(mixed);
                        out_vec.push(final_s);
                    }
                    self.nr_in_accum.clear();
                }
            } else {
                self.nr_in_accum.clear();
                self.vad_env_gain = 1.0;
                let final_s = self.process_post_nr_sample(s1);
                out_vec.push(final_s);
            }
        }
    }
}

// --- DTO 傳輸結構 ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppChannelDto {
    pub pid: u32,
    pub name: String,
    pub is_active: bool,
    pub mon_vol: f32,
    pub str_vol: f32,
    pub mon_muted: bool,
    pub str_muted: bool,
    pub is_customized: bool,
    pub icon_base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfoDto {
    pub name: String,
    pub sample_rate: u32,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSettingsDto {
    pub devices: Vec<DeviceInfoDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettingsDto {
    pub blackhole_device: String,
    pub monitor_device: String,
    pub obs_port: u16,
    pub buffer_size: u32,
}

struct WorkerHandle {
    pid: u32,
    is_running: Arc<AtomicBool>,
    consumer: Consumer<f32>,
    mon_dsp: ChannelDspRuntime,
    str_dsp: ChannelDspRuntime,
    peak_db_bits: Arc<AtomicU32>,
}

#[allow(dead_code)]
struct AppState {
    panic_mute: Arc<AtomicBool>,
    def_mon_vol: Arc<AtomicU32>,
    def_str_vol: Arc<AtomicU32>,
    def_mon_mute: Arc<AtomicBool>,
    def_str_mute: Arc<AtomicBool>,
    app_volumes: Arc<Mutex<HashMap<u32, (f32, f32, bool, bool)>>>,
    dsp_configs: Arc<Mutex<HashMap<(u32, String), ChannelDspDto>>>,
    settings: Arc<Mutex<FullConfigDto>>,
    icon_cache: Arc<Mutex<HashMap<String, Option<String>>>>,
    workers: Arc<Mutex<HashMap<String, WorkerHandle>>>,
    mic_live_config: Arc<Mutex<MicConfigDto>>,
    mic_config_dirty: Arc<AtomicBool>,
    mic_in_db_bits: Arc<AtomicU32>,
    mic_out_db_bits: Arc<AtomicU32>,
    mic_is_active: Arc<AtomicBool>,
}

fn load_or_create_config() -> FullConfigDto {
    if let Ok(content) = fs::read_to_string("config.json") {
        if let Ok(cfg) = serde_json::from_str(&content) {
            return cfg;
        }
    }
    let default_cfg = FullConfigDto::default();
    if let Ok(json) = serde_json::to_string_pretty(&default_cfg) {
        let _ = fs::write("config.json", json);
    }
    default_cfg
}

fn is_system_internal(exe_lower: &str) -> bool {
    exe_lower.is_empty()
        || exe_lower.contains("dr_audiorouter")
        || exe_lower.starts_with("audiodg")
        || exe_lower == "svchost.exe"
        || exe_lower == "system"
        || exe_lower.contains("steinberg")
        || exe_lower.contains("ysusb")
        || exe_lower.contains("yamaha")
}

// 使用 Windows 原生 advapi32 直讀註冊表，徹底解決呼叫外部 reg.exe 造成的 2~3 秒凍結
#[link(name = "advapi32")]
extern "system" {
    fn RegOpenKeyExW(hkey: isize, subkey: *const u16, options: u32, sam: u32, phk: *mut isize) -> i32;
    fn RegQueryValueExW(hkey: isize, value_name: *const u16, reserved: *mut u32, ptype: *mut u32, data: *mut u8, cb_data: *mut u32) -> i32;
    fn RegSetValueExW(hkey: isize, value_name: *const u16, reserved: u32, dw_type: u32, data: *const u8, cb_data: u32) -> i32;
    fn RegDeleteValueW(hkey: isize, value_name: *const u16) -> i32;
    fn RegCloseKey(hkey: isize) -> i32;
}

const HKEY_CURRENT_USER: isize = 0x80000001u32 as i32 as isize;
const KEY_READ: u32 = 0x20019;
const KEY_SET_VALUE: u32 = 0x0002;
const REG_SZ: u32 = 1;

fn is_autostart_enabled() -> bool {
    unsafe {
        let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Run"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let val_name: Vec<u16> = "DR_AudioRouter"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let mut hkey: isize = 0;
        if RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_READ, &mut hkey) != 0 {
            return false;
        }
        let mut cb_data = 0u32;
        let res = RegQueryValueExW(hkey, val_name.as_ptr(), ptr::null_mut(), ptr::null_mut(), ptr::null_mut(), &mut cb_data);
        let _ = RegCloseKey(hkey);
        res == 0 && cb_data > 0
    }
}

fn set_autostart_enabled(enable: bool) -> bool {
    unsafe {
        let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Run"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let val_name: Vec<u16> = "DR_AudioRouter"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let mut hkey: isize = 0;
        if RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_SET_VALUE, &mut hkey) != 0 {
            return false;
        }
        let ret = if enable {
            if let Ok(exe_path) = std::env::current_exe() {
                let cmd = format!("\"{}\" --minimized", exe_path.to_string_lossy());
                let cmd_wide: Vec<u16> = cmd.encode_utf16().chain(std::iter::once(0)).collect();
                let bytes = cmd_wide.len() * 2;
                RegSetValueExW(hkey, val_name.as_ptr(), 0, REG_SZ, cmd_wide.as_ptr() as *const u8, bytes as u32) == 0
            } else {
                false
            }
        } else {
            RegDeleteValueW(hkey, val_name.as_ptr()) == 0
        };
        let _ = RegCloseKey(hkey);
        ret
    }
}

unsafe fn hicon_to_bmp_base64(hicon: HICON) -> Option<String> {
    let mut icon_info = ICONINFO::default();
    if !GetIconInfo(hicon, &mut icon_info).as_bool() {
        return None;
    }

    let hdc = CreateCompatibleDC(None);
    let mut header = BITMAPINFOHEADER::default();
    header.biSize = size_of::<BITMAPINFOHEADER>() as u32;
    header.biWidth = 32;
    header.biHeight = -32;
    header.biPlanes = 1;
    header.biBitCount = 32;
    header.biCompression = 0;

    let mut pixels = vec![0u8; 32 * 32 * 4];
    let mut bmi = BITMAPINFO {
        bmiHeader: header,
        bmiColors: [RGBQUAD::default()],
    };

    let lines = GetDIBits(
        hdc,
        icon_info.hbmColor,
        0,
        32,
        Some(pixels.as_mut_ptr() as *mut _),
        &mut bmi,
        DIB_RGB_COLORS,
    );

    let _ = DeleteDC(hdc);
    let _ = DeleteObject(icon_info.hbmColor);
    let _ = DeleteObject(icon_info.hbmMask);

    if lines == 0 {
        return None;
    }

    let has_alpha = pixels.chunks_exact(4).any(|c| c[3] > 0);
    if !has_alpha {
        for c in pixels.chunks_exact_mut(4) {
            c[3] = 255;
        }
    }

    let file_size = 54 + pixels.len() as u32;
    let mut bmp_data = Vec::with_capacity(file_size as usize);
    bmp_data.extend_from_slice(b"BM");
    bmp_data.extend_from_slice(&file_size.to_le_bytes());
    bmp_data.extend_from_slice(&[0, 0, 0, 0]);
    bmp_data.extend_from_slice(&54u32.to_le_bytes());
    bmp_data.extend_from_slice(&40u32.to_le_bytes());
    bmp_data.extend_from_slice(&32i32.to_le_bytes());
    bmp_data.extend_from_slice(&(-32i32).to_le_bytes());
    bmp_data.extend_from_slice(&1u16.to_le_bytes());
    bmp_data.extend_from_slice(&32u16.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&(pixels.len() as u32).to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&pixels);

    Some(format!("data:image/bmp;base64,{}", base64_encode(&bmp_data)))
}

fn extract_app_icon_base64(exe_path: &str) -> Option<String> {
    unsafe {
        let path_wide: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();
        let mut h_large = HICON(0);
        let count = ExtractIconExW(PCWSTR(path_wide.as_ptr()), 0, Some(&mut h_large), None, 1);
        if count > 0 && h_large.0 != 0 {
            let res = hicon_to_bmp_base64(h_large);
            let _ = DestroyIcon(h_large);
            return res;
        }
        None
    }
}

fn get_process_path_by_pid(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_FORMAT(0),
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        if ok.as_bool() && size > 0 {
            Some(String::from_utf16_lossy(&buf[..size as usize]))
        } else {
            None
        }
    }
}

// 具備 3 秒智慧快取的系統進程表：避免 0.5 秒高頻掃描時重複觸發昂貴的系統快照 API
static PROCESS_MAP_CACHE: Mutex<Option<(Instant, HashMap<u32, String>, HashMap<u32, u32>)>> = Mutex::new(None);

fn take_process_snapshot() -> (HashMap<u32, String>, HashMap<u32, u32>) {
    let mut name_map = HashMap::new();
    let mut parent_map = HashMap::new();
    unsafe {
        if let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            let mut entry = PROCESSENTRY32W::default();
            entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;

            if Process32FirstW(snapshot, &mut entry).as_bool() {
                loop {
                    let name = String::from_utf16_lossy(&entry.szExeFile);
                    let clean = name.trim_matches('\0').to_string();
                    name_map.insert(entry.th32ProcessID, clean);
                    parent_map.insert(entry.th32ProcessID, entry.th32ParentProcessID);

                    if !Process32NextW(snapshot, &mut entry).as_bool() {
                        break;
                    }
                }
            }
            let _ = CloseHandle(snapshot);
        }
    }
    (name_map, parent_map)
}

fn build_process_maps() -> (HashMap<u32, String>, HashMap<u32, u32>) {
    if let Ok(mut guard) = PROCESS_MAP_CACHE.lock() {
        if let Some((last_time, ref n_map, ref p_map)) = *guard {
            if last_time.elapsed() < Duration::from_secs(3) {
                return (n_map.clone(), p_map.clone());
            }
        }
        let (n_map, p_map) = take_process_snapshot();
        *guard = Some((Instant::now(), n_map.clone(), p_map.clone()));
        return (n_map, p_map);
    }
    take_process_snapshot()
}

fn find_same_exe_root_pid(
    mut pid: u32,
    name_map: &HashMap<u32, String>,
    parent_map: &HashMap<u32, u32>,
) -> u32 {
    let my_exe = match name_map.get(&pid) {
        Some(n) => n.to_ascii_lowercase(),
        None => return pid,
    };
    let mut visited = HashSet::new();
    visited.insert(pid);

    while let Some(&parent_pid) = parent_map.get(&pid) {
        if parent_pid == 0 || visited.contains(&parent_pid) {
            break;
        }
        if let Some(parent_exe) = name_map.get(&parent_pid) {
            if parent_exe.to_ascii_lowercase() == my_exe {
                visited.insert(parent_pid);
                pid = parent_pid;
                continue;
            }
        }
        break;
    }
    pid
}

fn enumerate_active_audio_pids() -> Vec<u32> {
    let mut pids = HashSet::new();
    let my_pid = std::process::id();
    let (mut name_map, mut parent_map) = build_process_maps();
    let mut snapshot_refreshed = false;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        if let Ok(enumerator) = CoCreateInstance::<_, IMMDeviceEnumerator>(&MMDeviceEnumerator, None, CLSCTX_ALL) {
            if let Ok(endpoints) = enumerator.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE) {
                let dev_count = endpoints.GetCount().unwrap_or(0);
                for d_idx in 0..dev_count {
                    if let Ok(dev) = endpoints.Item(d_idx) {
                        if let Ok(mgr) = dev.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) {
                            if let Ok(session_enum) = mgr.GetSessionEnumerator() {
                                let s_count = session_enum.GetCount().unwrap_or(0);
                                for s_idx in 0..s_count {
                                    if let Ok(control) = session_enum.GetSession(s_idx) {
                                        if let Ok(control2) = control.cast::<IAudioSessionControl2>() {
                                            if let Ok(pid) = control2.GetProcessId() {
                                                if pid > 0 && pid != my_pid {
                                                    if let Ok(state) = control2.GetState() {
                                                        if state != AudioSessionStateExpired {
                                                            // 若遇到剛開啟、還不在 3 秒快取內的新進程，立即刷新一次快照以實現零延遲識別
                                                            if !snapshot_refreshed && !name_map.contains_key(&pid) {
                                                                let (n, p) = take_process_snapshot();
                                                                if let Ok(mut guard) = PROCESS_MAP_CACHE.lock() {
                                                                    *guard = Some((Instant::now(), n.clone(), p.clone()));
                                                                }
                                                                name_map = n;
                                                                parent_map = p;
                                                                snapshot_refreshed = true;
                                                            }
                                                            let root_pid = find_same_exe_root_pid(pid, &name_map, &parent_map);
                                                            pids.insert(root_pid);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        CoUninitialize();
    }
    pids.into_iter().collect()
}

fn format_friendly_app_name(exe_name: &str) -> String {
    let lower = exe_name.to_ascii_lowercase();
    match lower.as_str() {
        "chrome.exe" => "Google Chrome".to_string(),
        "discord.exe" => "Discord".to_string(),
        "spotify.exe" => "Spotify".to_string(),
        "msedge.exe" => "Microsoft Edge".to_string(),
        "firefox.exe" => "Firefox".to_string(),
        "league of legends.exe" => "League of Legends".to_string(),
        "leagueclient.exe" => "League Client".to_string(),
        "steam.exe" => "Steam".to_string(),
        "obs64.exe" => "OBS Studio".to_string(),
        _ => {
            if let Some(stripped) = exe_name.strip_suffix(".exe") {
                stripped.to_string()
            } else if let Some(stripped) = exe_name.strip_suffix(".EXE") {
                stripped.to_string()
            } else {
                exe_name.to_string()
            }
        }
    }
}

fn sha1(input: &[u8]) -> [u8; 20] {
    let mut h0 = 0x67452301u32;
    let mut h1 = 0xEFCDAB89u32;
    let mut h2 = 0x98BADCFEu32;
    let mut h3 = 0x10325476u32;
    let mut h4 = 0xC3D2E1F0u32;

    let ml = (input.len() as u64) * 8;
    let mut msg = input.to_vec();
    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&ml.to_be_bytes());

    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 80];
        for i in 0..16 {
            w[i] = u32::from_be_bytes(chunk[i * 4..(i + 1) * 4].try_into().unwrap());
        }
        for i in 16..80 {
            w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1);
        }

        let mut a = h0;
        let mut b = h1;
        let mut c = h2;
        let mut d = h3;
        let mut e = h4;

        for i in 0..80 {
            let (f, k) = match i {
                0..=19 => ((b & c) | ((!b) & d), 0x5A827999u32),
                20..=39 => (b ^ c ^ d, 0x6ED9EBA1u32),
                40..=59 => ((b & c) | (b & d) | (c & d), 0x8F1BBCDCu32),
                _ => (b ^ c ^ d, 0xCA62C1D6u32),
            };
            let temp = a
                .rotate_left(5)
                .wrapping_add(f)
                .wrapping_add(e)
                .wrapping_add(k)
                .wrapping_add(w[i]);
            e = d;
            d = c;
            c = b.rotate_left(30);
            b = a;
            a = temp;
        }

        h0 = h0.wrapping_add(a);
        h1 = h1.wrapping_add(b);
        h2 = h2.wrapping_add(c);
        h3 = h3.wrapping_add(d);
        h4 = h4.wrapping_add(e);
    }

    let mut out = [0u8; 20];
    out[0..4].copy_from_slice(&h0.to_be_bytes());
    out[4..8].copy_from_slice(&h1.to_be_bytes());
    out[8..12].copy_from_slice(&h2.to_be_bytes());
    out[12..16].copy_from_slice(&h3.to_be_bytes());
    out[16..20].copy_from_slice(&h4.to_be_bytes());
    out
}

fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in input.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

        out.push(TABLE[(b0 >> 2) as usize] as char);
        out.push(TABLE[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(b2 & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

fn make_websocket_accept(key: &str) -> String {
    let magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    let combined = format!("{}{}", key.trim(), magic);
    let hash = sha1(combined.as_bytes());
    base64_encode(&hash)
}

const HTML_PAGE: &str = r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DR_AudioRouter OBS Stream</title>
  <style>
    body { background: #050713; color: #4ade80; font-family: monospace; margin: 0; padding: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div>[OBS 網頁音訊] <span id="status">連線中...</span></div>
  <script>
    (function() {
      const statusEl = document.getElementById('status');
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: 0
      });

      function connect() {
        const ws = new WebSocket('ws://' + window.location.host + '/ws');
        ws.binaryType = 'arraybuffer';
        let scheduledTime = 0;

        ws.onopen = async () => {
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          statusEl.innerText = "同步中 (< 35ms)";
        };

        ws.onmessage = (event) => {
          const f32 = new Float32Array(event.data);
          const numFrames = f32.length / 2;
          if (numFrames === 0) return;

          const buffer = audioCtx.createBuffer(2, numFrames, 44100);
          buffer.getChannelData(0).set(f32.filter((_, i) => i % 2 === 0));
          buffer.getChannelData(1).set(f32.filter((_, i) => i % 2 === 1));

          const now = audioCtx.currentTime;
          if (scheduledTime < now || scheduledTime > now + 0.080) {
            scheduledTime = now + 0.035;
          }

          const src = audioCtx.createBufferSource();
          src.buffer = buffer;
          src.connect(audioCtx.destination);
          src.start(scheduledTime);
          scheduledTime += buffer.duration;
        };

        ws.onclose = () => {
          statusEl.innerText = "重試中...";
          setTimeout(connect, 1000);
        };
      }
      connect();
    })();
  </script>
</body>
</html>"#;

#[tauri::command]
fn set_default_mute(channel: String, muted: bool, state: tauri::State<AppState>) {
    if channel == "monitor" {
        state.def_mon_mute.store(muted, Ordering::Relaxed);
    } else if channel == "stream" {
        state.def_str_mute.store(muted, Ordering::Relaxed);
    }
}

#[tauri::command]
fn update_default_volumes(mon_vol: f32, str_vol: f32, state: tauri::State<AppState>) {
    state.def_mon_vol.store(mon_vol.to_bits(), Ordering::Relaxed);
    state.def_str_vol.store(str_vol.to_bits(), Ordering::Relaxed);
}

#[tauri::command]
fn update_app_channel(
    pid: u32,
    mon_vol: f32,
    str_vol: f32,
    mon_mute: bool,
    str_mute: bool,
    state: tauri::State<AppState>,
) {
    if let Ok(mut map) = state.app_volumes.lock() {
        map.insert(pid, (mon_vol, str_vol, mon_mute, str_mute));
    }
}

#[tauri::command]
fn reset_app_channel(pid: u32, state: tauri::State<AppState>) {
    if let Ok(mut map) = state.app_volumes.lock() {
        map.remove(&pid);
    }
    if let Ok(mut configs) = state.dsp_configs.lock() {
        configs.remove(&(pid, "monitor".to_string()));
        configs.remove(&(pid, "stream".to_string()));
    }
    if let Ok(mut workers_map) = state.workers.lock() {
        for worker in workers_map.values_mut() {
            if worker.pid == pid {
                worker.mon_dsp = ChannelDspRuntime::default();
                worker.str_dsp = ChannelDspRuntime::default();
            }
        }
    }
    println!(">>> [IPC] 軟體 PID:{} 音量與 DSP 已重置回歸預設", pid);
}

#[tauri::command]
fn update_app_dsp(pid: u32, channel: String, dsp: ChannelDspDto, state: tauri::State<AppState>) {
    let has_custom_set: HashSet<u32> = {
        let mut configs = state.dsp_configs.lock().unwrap_or_else(|e| e.into_inner());
        configs.insert((pid, channel.clone()), dsp.clone());
        configs.keys()
            .filter(|(p, c)| *p != 0 && c == &channel)
            .map(|(p, _)| *p)
            .collect()
    };

    if let Ok(mut workers_map) = state.workers.lock() {
        for worker in workers_map.values_mut() {
            if worker.pid == pid {
                if channel == "monitor" {
                    worker.mon_dsp.update_config(&dsp, 44100.0);
                } else if channel == "stream" {
                    worker.str_dsp.update_config(&dsp, 44100.0);
                }
            } else if pid == 0 && !has_custom_set.contains(&worker.pid) {
                if channel == "monitor" {
                    worker.mon_dsp.update_config(&dsp, 44100.0);
                } else if channel == "stream" {
                    worker.str_dsp.update_config(&dsp, 44100.0);
                }
            }
        }
    }
}

#[tauri::command]
fn update_mic_config(config: MicConfigDto, state: tauri::State<AppState>) {
    if let Ok(mut live) = state.mic_live_config.lock() {
        *live = config;
    }
    state.mic_config_dirty.store(true, Ordering::Relaxed);
}

#[tauri::command]
fn get_mic_levels(state: tauri::State<AppState>) -> MicLevelsDto {
    let in_db = f32::from_bits(state.mic_in_db_bits.load(Ordering::Relaxed));
    let out_db = f32::from_bits(state.mic_out_db_bits.load(Ordering::Relaxed));
    let is_running = state.mic_is_active.load(Ordering::Relaxed);

    let conflict_warning = {
        let s = state.settings.lock().unwrap_or_else(|e| e.into_inner());
        let m = state.mic_live_config.lock().unwrap_or_else(|e| e.into_inner());
        if m.enabled && m.output_device != "__NONE__" {
            if m.output_device == s.blackhole_device {
                Some("conflict_blackhole".to_string())
            } else if m.output_device == s.monitor_device {
                Some("conflict_monitor".to_string())
            } else {
                None
            }
        } else {
            None
        }
    };

    MicLevelsDto {
        input_db: in_db,
        output_db: out_db,
        is_running,
        conflict_warning,
    }
}

#[tauri::command]
fn get_app_levels(state: tauri::State<AppState>) -> HashMap<u32, f32> {
    let mut map = HashMap::new();
    if let Ok(workers_map) = state.workers.lock() {
        for w in workers_map.values() {
            if w.is_running.load(Ordering::Relaxed) {
                let db = f32::from_bits(w.peak_db_bits.load(Ordering::Relaxed));
                map.insert(w.pid, db);
                w.peak_db_bits.store((-120.0f32).to_bits(), Ordering::Relaxed);
            }
        }
    }
    map
}

#[tauri::command]
fn get_input_devices() -> DeviceSettingsDto {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    if let Ok(devs) = host.input_devices() {
        for dev in devs {
            let name = dev.name().unwrap_or_default();
            if name.trim().is_empty() {
                continue;
            }
            let sample_rate = dev
                .default_input_config()
                .map(|c| c.sample_rate().0)
                .unwrap_or(48000);

            devices.push(DeviceInfoDto {
                name,
                sample_rate,
                is_default: false,
            });
        }
    }

    DeviceSettingsDto { devices }
}

#[tauri::command]
fn get_full_config(state: tauri::State<AppState>) -> FullConfigDto {
    state.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
fn save_full_config(config: FullConfigDto, state: tauri::State<AppState>) {
    if let Some(prof) = config.profiles.get(&config.active_profile_id) {
        if let Ok(mut live_mic) = state.mic_live_config.lock() {
            *live_mic = prof.mic.clone();
        }
        state.mic_config_dirty.store(true, Ordering::Relaxed);
    }
    if let Ok(mut current) = state.settings.lock() {
        *current = config.clone();
    }
    if let Ok(json) = serde_json::to_string_pretty(&config) {
        let _ = fs::write("config.json", json);
    }
    println!(">>> [IPC] 全域設定檔 (含端點、Profiles、EQ 與麥克風設定) 已儲存至 config.json");
}

#[tauri::command]
fn get_audio_settings(state: tauri::State<AppState>) -> AudioSettingsDto {
    let cfg = state.settings.lock().unwrap_or_else(|e| e.into_inner());
    AudioSettingsDto {
        blackhole_device: cfg.blackhole_device.clone(),
        monitor_device: cfg.monitor_device.clone(),
        obs_port: cfg.obs_port,
        buffer_size: cfg.buffer_size,
    }
}

#[tauri::command]
fn save_audio_settings(settings: AudioSettingsDto, state: tauri::State<AppState>) {
    if let Ok(mut current) = state.settings.lock() {
        current.blackhole_device = settings.blackhole_device;
        current.monitor_device = settings.monitor_device;
        current.obs_port = settings.obs_port;
        current.buffer_size = settings.buffer_size;
        if let Ok(json) = serde_json::to_string_pretty(&*current) {
            let _ = fs::write("config.json", json);
        }
    }
    println!(">>> [IPC] 端點設定已套用至 config.json");
}

#[tauri::command]
fn get_audio_devices() -> DeviceSettingsDto {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    if let Ok(devs) = host.output_devices() {
        for dev in devs {
            let name = dev.name().unwrap_or_default();
            if name.trim().is_empty() {
                continue;
            }
            let sample_rate = dev
                .default_output_config()
                .map(|c| c.sample_rate().0)
                .unwrap_or(44100);

            devices.push(DeviceInfoDto {
                name,
                sample_rate,
                is_default: false,
            });
        }
    }

    DeviceSettingsDto { devices }
}

#[tauri::command]
fn get_current_apps(state: tauri::State<AppState>) -> Vec<AppChannelDto> {
    let mut apps = Vec::new();
    let def_m_vol = f32::from_bits(state.def_mon_vol.load(Ordering::Relaxed));
    let def_s_vol = f32::from_bits(state.def_str_vol.load(Ordering::Relaxed));

    let mut active_pids: HashSet<u32> = enumerate_active_audio_pids().into_iter().collect();
    if let Ok(workers_map) = state.workers.lock() {
        for w in workers_map.values() {
            if w.is_running.load(Ordering::Relaxed) {
                active_pids.insert(w.pid);
            }
        }
    }

    let (process_map, _) = build_process_maps();
    let app_map = state.app_volumes.lock().unwrap_or_else(|e| e.into_inner());

    let mut seen_exes: HashSet<String> = HashSet::new();

    for pid in active_pids {
        let exe_name = process_map.get(&pid).cloned().unwrap_or_default();
        let exe_lower = exe_name.to_ascii_lowercase();

        if is_system_internal(&exe_lower) {
            continue;
        }

        if seen_exes.contains(&exe_lower) {
            continue;
        }
        seen_exes.insert(exe_lower.clone());

        let display_name = format_friendly_app_name(&exe_name);

        let icon_base64 = {
            let mut cache = state.icon_cache.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(cached) = cache.get(&exe_name) {
                cached.clone()
            } else {
                let icon_opt = get_process_path_by_pid(pid)
                    .and_then(|path| extract_app_icon_base64(&path));
                cache.insert(exe_name.clone(), icon_opt.clone());
                icon_opt
            }
        };

        let (m_vol, s_vol, m_mute, s_mute) = app_map
            .get(&pid)
            .cloned()
            .unwrap_or((def_m_vol, def_s_vol, false, false));

        apps.push(AppChannelDto {
            pid,
            name: display_name,
            is_active: true,
            mon_vol: m_vol,
            str_vol: s_vol,
            mon_muted: m_mute,
            str_muted: s_mute,
            is_customized: app_map.contains_key(&pid),
            icon_base64,
        });
    }

    apps
}

#[tauri::command]
fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

#[tauri::command]
fn get_autostart_status() -> bool {
    is_autostart_enabled()
}

#[tauri::command]
fn set_autostart(enable: bool) -> bool {
    set_autostart_enabled(enable)
}

struct WorkerRunningGuard {
    flag: Arc<AtomicBool>,
    notifier: Arc<ThrottleNotifier>,
}

impl Drop for WorkerRunningGuard {
    fn drop(&mut self) {
        self.flag.store(false, Ordering::Relaxed);
        self.notifier.trigger();
    }
}

fn spawn_process_capture_worker(
    target_pid: u32,
    sample_rate: u32,
    channels: usize,
    mut producer: Producer<f32>,
    is_running: Arc<AtomicBool>,
    notifier: Arc<ThrottleNotifier>,
) {
    thread::spawn(move || {
        let _guard = WorkerRunningGuard {
            flag: Arc::clone(&is_running),
            notifier: Arc::clone(&notifier),
        };

        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let proc_handle = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, false, target_pid) };
        let proc_h = match proc_handle {
            Ok(h) => h,
            Err(_) => {
                unsafe { CoUninitialize() };
                return;
            }
        };

        let loopback_params = AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
            target_process_id: target_pid,
            process_loopback_mode: 0,
        };

        let activation_params = AUDIOCLIENT_ACTIVATION_PARAMS {
            activation_type: 1,
            process_loopback_params: loopback_params,
        };

        let prop_blob = PropVariantBlob {
            vt: 65,
            reserved: [0; 3],
            cb_size: size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32,
            _pad: 0,
            blob_data: &activation_params as *const _ as *const u8,
        };

        let (tx, rx) = sync_channel(1);
        let handler: IActivateAudioInterfaceCompletionHandler = ActivationHandler { tx }.into();

        let activate_ok = unsafe {
            ActivateAudioInterfaceAsync(
                w!("VAD\\Process_Loopback"),
                &IAudioClient::IID,
                Some(&prop_blob as *const _ as *const _),
                &handler,
            )
            .is_ok()
        };

        if !activate_ok {
            unsafe {
                let _ = CloseHandle(proc_h);
                CoUninitialize();
            }
            return;
        }

        let audio_client = match rx.recv_timeout(Duration::from_secs(3)) {
            Ok(Ok(client)) => client,
            _ => {
                unsafe {
                    let _ = CloseHandle(proc_h);
                    CoUninitialize();
                }
                return;
            }
        };

        let wave_format = WAVEFORMATEX {
            wFormatTag: 3,
            nChannels: channels as u16,
            nSamplesPerSec: sample_rate,
            nAvgBytesPerSec: sample_rate * (channels as u32 * 4),
            nBlockAlign: channels as u16 * 4,
            wBitsPerSample: 32,
            cbSize: 0,
        };

        let flags = AUDCLNT_STREAMFLAGS_LOOPBACK
            | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
            | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM
            | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY;

        let init_res = unsafe {
            audio_client.Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                flags,
                200_000,
                0,
                &wave_format as *const _,
                None,
            )
        };

        if init_res.is_err() {
            unsafe {
                let _ = CloseHandle(proc_h);
                CoUninitialize();
            }
            return;
        }

        let audio_event = match unsafe { CreateEventW(None, false, false, PCWSTR(ptr::null())) } {
            Ok(h) => h,
            Err(_) => {
                unsafe {
                    let _ = CloseHandle(proc_h);
                    CoUninitialize();
                }
                return;
            }
        };

        let _ = unsafe { audio_client.SetEventHandle(audio_event) };
        let capture_client: IAudioCaptureClient = match unsafe { audio_client.GetService() } {
            Ok(c) => c,
            Err(_) => {
                unsafe {
                    let _ = CloseHandle(audio_event);
                    let _ = CloseHandle(proc_h);
                    CoUninitialize();
                }
                return;
            }
        };

        if unsafe { audio_client.Start() }.is_err() {
            unsafe {
                let _ = CloseHandle(audio_event);
                let _ = CloseHandle(proc_h);
                CoUninitialize();
            }
            return;
        }

        println!(">>> [音訊核心] 獨立捕捉通道上線: PID {}", target_pid);

        let wait_handles = [proc_h, audio_event];

        'capture_loop: while is_running.load(Ordering::Relaxed) {
            if producer.is_abandoned() {
                break 'capture_loop;
            }

            let wait_res = unsafe { WaitForMultipleObjects(&wait_handles, false, 200) };
            if wait_res == WAIT_OBJECT_0 {
                break 'capture_loop;
            } else if wait_res.0 == WAIT_OBJECT_0.0 + 1 {
            } else {
                if unsafe { capture_client.GetNextPacketSize() }.is_err() {
                    break 'capture_loop;
                }
                continue;
            }

            let packet_size = match unsafe { capture_client.GetNextPacketSize() } {
                Ok(s) => s,
                Err(_) => break 'capture_loop,
            };

            let mut cur_packet = packet_size;
            while cur_packet > 0 {
                let mut p_data: *mut u8 = ptr::null_mut();
                let mut num_frames: u32 = 0;
                let mut flags: u32 = 0;

                let buf_res = unsafe {
                    capture_client.GetBuffer(
                        &mut p_data,
                        &mut num_frames,
                        &mut flags,
                        None,
                        None,
                    )
                };

                if buf_res.is_err() {
                    break 'capture_loop;
                }

                let is_silent = (flags & 2) != 0 || p_data.is_null();
                if num_frames > 0 {
                    if is_silent {
                        for _ in 0..(num_frames as usize * channels) {
                            let _ = producer.push(0.0);
                        }
                    } else {
                        let samples = unsafe {
                            slice::from_raw_parts(
                                p_data as *const f32,
                                (num_frames as usize) * channels,
                            )
                        };
                        for &sample in samples {
                            let _ = producer.push(sample);
                        }
                    }
                }

                let _ = unsafe { capture_client.ReleaseBuffer(num_frames) };
                cur_packet = unsafe { capture_client.GetNextPacketSize().unwrap_or(0) };
            }
        }

        unsafe {
            let _ = audio_client.Stop();
            let _ = CloseHandle(audio_event);
            let _ = CloseHandle(proc_h);
            CoUninitialize();
        }
        println!(">>> [音訊核心] 獨立捕捉通道卸載: PID {}", target_pid);
    });
}

fn main() {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let _ = std::env::set_current_dir(exe_dir);
        }
    }

    let sample_rate = 44100u32;
    let channels = 2usize;

    let initial_settings = load_or_create_config();
    let initial_mic_cfg = initial_settings
        .profiles
        .get(&initial_settings.active_profile_id)
        .map(|p| p.mic.clone())
        .unwrap_or_default();

    let settings = Arc::new(Mutex::new(initial_settings));
    let icon_cache = Arc::new(Mutex::new(HashMap::new()));

    let (stream_prod, mut stream_cons) = RingBuffer::<f32>::new(65536);
    let stream_prod_arc = Arc::new(Mutex::new(stream_prod));

    let (mic_mon_prod, mic_mon_cons) = RingBuffer::<f32>::new(32768);
    let mic_mon_prod_arc = Arc::new(Mutex::new(mic_mon_prod));
    let mic_self_mon_flag = Arc::new(AtomicBool::new(initial_mic_cfg.self_monitor));

    let mic_live_config = Arc::new(Mutex::new(initial_mic_cfg));
    let mic_config_dirty = Arc::new(AtomicBool::new(true));
    let mic_in_db_bits = Arc::new(AtomicU32::new((-120.0f32).to_bits()));
    let mic_out_db_bits = Arc::new(AtomicU32::new((-120.0f32).to_bits()));
    let mic_is_active = Arc::new(AtomicBool::new(false));

    let panic_mute = Arc::new(AtomicBool::new(false));

    let def_mon_vol = Arc::new(AtomicU32::new(1.0f32.to_bits()));
    let def_str_vol = Arc::new(AtomicU32::new(1.0f32.to_bits()));
    let def_mon_mute = Arc::new(AtomicBool::new(false));
    let def_str_mute = Arc::new(AtomicBool::new(false));

    let app_volumes = Arc::new(Mutex::new(HashMap::new()));
    let dsp_configs = Arc::new(Mutex::new(HashMap::<(u32, String), ChannelDspDto>::new()));
    let dsp_configs_sched = Arc::clone(&dsp_configs);

    let workers = Arc::new(Mutex::new(HashMap::<String, WorkerHandle>::new()));

    let is_running = Arc::new(AtomicBool::new(true));
    let is_running_obs = Arc::clone(&is_running);
    let is_running_cap = Arc::clone(&is_running);
    let is_running_com = Arc::clone(&is_running);
    let is_running_out = Arc::clone(&is_running);
    let is_running_mic = Arc::clone(&is_running);

    let notifier = Arc::new(ThrottleNotifier::new());
    let notifier_sched = Arc::clone(&notifier);
    let notifier_com = Arc::clone(&notifier);

    // 1. OBS WebSocket 伺服器
    thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:9876") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("無法啟動 OBS 伺服器 (Port 9876): {}", e);
                return;
            }
        };

        let mut ws_packet = Vec::with_capacity(16384);

        while is_running_obs.load(Ordering::Relaxed) {
            let (mut socket, _) = match listener.accept() {
                Ok(conn) => conn,
                Err(_) => continue,
            };

            let mut req_buf = [0u8; 1024];
            let read_len = socket.read(&mut req_buf).unwrap_or(0);
            let req_str = String::from_utf8_lossy(&req_buf[..read_len]);

            if req_str.contains("Upgrade: websocket") || req_str.contains("upgrade: websocket") {
                let key = req_str
                    .lines()
                    .find(|line| line.to_ascii_lowercase().starts_with("sec-websocket-key:"))
                    .and_then(|line| line.split(':').nth(1))
                    .map(|k| k.trim());

                if let Some(ws_key) = key {
                    let accept_hash = make_websocket_accept(ws_key);
                    let resp = format!(
                        "HTTP/1.1 101 Switching Protocols\r\n\
                         Upgrade: websocket\r\n\
                         Connection: Upgrade\r\n\
                         Sec-WebSocket-Accept: {}\r\n\r\n",
                        accept_hash
                    );

                    if socket.write_all(resp.as_bytes()).is_err() {
                        continue;
                    }

                    let _ = socket.set_nodelay(true);
                    while stream_cons.pop().is_ok() {}

                    while is_running_obs.load(Ordering::Relaxed) {
                        let available = stream_cons.slots();
                        let frames_to_pop = (available / 2) * 2;

                        if frames_to_pop >= 441 * 2 {
                            let payload_len = frames_to_pop * 4;
                            ws_packet.clear();

                            ws_packet.push(0x82u8);
                            if payload_len <= 125 {
                                ws_packet.push(payload_len as u8);
                            } else if payload_len <= 65535 {
                                ws_packet.push(126u8);
                                ws_packet.push(((payload_len >> 8) & 0xFF) as u8);
                                ws_packet.push((payload_len & 0xFF) as u8);
                            } else {
                                ws_packet.push(127u8);
                                ws_packet.extend_from_slice(&(payload_len as u64).to_be_bytes());
                            }

                            for _ in 0..frames_to_pop {
                                let s = stream_cons.pop().unwrap_or(0.0);
                                ws_packet.extend_from_slice(&s.to_le_bytes());
                            }

                            if let Err(_) = socket.write_all(&ws_packet) {
                                break;
                            }
                        }

                        thread::sleep(Duration::from_millis(5));
                    }
                }
            } else {
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    HTML_PAGE.len(),
                    HTML_PAGE
                );
                let _ = socket.write_all(resp.as_bytes());
            }
        }
    });

    // 2. Windows 原生音訊 Session 建立事件監聽器
    thread::spawn(move || {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let handler: IAudioSessionNotification = SessionNotificationHandler {
            notifier: notifier_com,
        }
        .into();

        while is_running_com.load(Ordering::Relaxed) {
            let mut managers = Vec::new();
            unsafe {
                if let Ok(enumerator) =
                    CoCreateInstance::<_, IMMDeviceEnumerator>(&MMDeviceEnumerator, None, CLSCTX_ALL)
                {
                    if let Ok(endpoints) = enumerator.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE) {
                        let count = endpoints.GetCount().unwrap_or(0);
                        for i in 0..count {
                            if let Ok(dev) = endpoints.Item(i) {
                                if let Ok(mgr) = dev.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) {
                                    if mgr.RegisterSessionNotification(&handler).is_ok() {
                                        managers.push(mgr);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            for _ in 0..50 {
                if !is_running_com.load(Ordering::Relaxed) {
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }

            for mgr in &managers {
                let _ = unsafe { mgr.UnregisterSessionNotification(&handler) };
            }
        }

        unsafe {
            CoUninitialize();
        }
    });

    // 3. 事件驅動調度器
    let workers_mgr = Arc::clone(&workers);
    let settings_sched = Arc::clone(&settings);
    let app_vols_sched = Arc::clone(&app_volumes);
    let my_pid = std::process::id();
    thread::spawn(move || {
        while is_running_cap.load(Ordering::Relaxed) {
            {
                let mut d = notifier_sched.dirty.lock().unwrap();
                while !*d && is_running_cap.load(Ordering::Relaxed) {
                    let (new_d, timeout) = notifier_sched
                        .cvar
                        .wait_timeout(d, Duration::from_millis(500))
                        .unwrap();
                    d = new_d;
                    if timeout.timed_out() {
                        *d = true;
                        break;
                    }
                }
                *d = false;
            }

            if !is_running_cap.load(Ordering::Relaxed) {
                break;
            }

            'throttle_loop: loop {
                let active_pids = enumerate_active_audio_pids();
                let (process_map, _) = build_process_maps();
                let mut workers_map = workers_mgr.lock().unwrap_or_else(|e| e.into_inner());

                let mut current_exes_active: HashSet<String> = HashSet::new();

                for pid in &active_pids {
                    if *pid == my_pid {
                        continue;
                    }
                    let exe_name = process_map.get(pid).cloned().unwrap_or_default();
                    let exe_lower = exe_name.to_ascii_lowercase();

                    if is_system_internal(&exe_lower) {
                        continue;
                    }

                    current_exes_active.insert(exe_lower.clone());

                    if workers_map.contains_key(&exe_lower) {
                        continue;
                    }

                    let (prod, cons) = RingBuffer::<f32>::new(16384);
                    let worker_running = Arc::new(AtomicBool::new(true));

                    let mut mon_dsp = ChannelDspRuntime::default();
                    let mut str_dsp = ChannelDspRuntime::default();
                    let friendly_name = format_friendly_app_name(&exe_name);

                    if let Ok(s_guard) = settings_sched.lock() {
                        if let Some(prof) = s_guard.profiles.get(&s_guard.active_profile_id) {
                            if let Some(app_cfg) = prof.customized_apps.get(&friendly_name) {
                                if let Ok(mut vols) = app_vols_sched.lock() {
                                    vols.entry(*pid).or_insert((
                                        app_cfg.mon_vol,
                                        app_cfg.str_vol,
                                        app_cfg.mon_muted,
                                        app_cfg.str_muted,
                                    ));
                                }
                                if let Some(ref m_dsp) = app_cfg.mon_dsp {
                                    mon_dsp.update_config(m_dsp, 44100.0);
                                } else if let Some(ref g_m_dsp) = prof.global.mon_dsp {
                                    mon_dsp.update_config(g_m_dsp, 44100.0);
                                }
                                if let Some(ref s_dsp) = app_cfg.str_dsp {
                                    str_dsp.update_config(s_dsp, 44100.0);
                                } else if let Some(ref g_s_dsp) = prof.global.str_dsp {
                                    str_dsp.update_config(g_s_dsp, 44100.0);
                                }
                            } else {
                                if let Some(ref g_m_dsp) = prof.global.mon_dsp {
                                    mon_dsp.update_config(g_m_dsp, 44100.0);
                                }
                                if let Some(ref g_s_dsp) = prof.global.str_dsp {
                                    str_dsp.update_config(g_s_dsp, 44100.0);
                                }
                            }
                        }
                    }

                    if let Ok(configs) = dsp_configs_sched.lock() {
                        if let Some(cfg) = configs.get(&(*pid, "monitor".to_string())) {
                            mon_dsp.update_config(cfg, 44100.0);
                        }
                        if let Some(cfg) = configs.get(&(*pid, "stream".to_string())) {
                            str_dsp.update_config(cfg, 44100.0);
                        }
                    }

                    spawn_process_capture_worker(
                        *pid,
                        sample_rate,
                        channels,
                        prod,
                        Arc::clone(&worker_running),
                        Arc::clone(&notifier_sched),
                    );

                    workers_map.insert(
                        exe_lower,
                        WorkerHandle {
                            pid: *pid,
                            is_running: worker_running,
                            consumer: cons,
                            mon_dsp,
                            str_dsp,
                            peak_db_bits: Arc::new(AtomicU32::new((-120.0f32).to_bits())),
                        },
                    );
                }

                workers_map.retain(|_exe, handle| {
                    handle.is_running.load(Ordering::Relaxed)
                });

                drop(workers_map);

                thread::sleep(Duration::from_millis(400));

                if !is_running_cap.load(Ordering::Relaxed) {
                    break 'throttle_loop;
                }

                let had_pending = {
                    let mut d = notifier_sched.dirty.lock().unwrap();
                    let was_dirty = *d;
                    *d = false;
                    was_dirty
                };

                if had_pending {
                    continue 'throttle_loop;
                } else {
                    break 'throttle_loop;
                }
            }
        }
    });

    // 4. 實體耳機輸出守護線程
    let workers_out = Arc::clone(&workers);
    let app_volumes_out = Arc::clone(&app_volumes);
    let def_mon_vol_out = Arc::clone(&def_mon_vol);
    let def_str_vol_out = Arc::clone(&def_str_vol);
    let def_mon_mute_out = Arc::clone(&def_mon_mute);
    let def_str_mute_out = Arc::clone(&def_str_mute);
    let stream_prod_for_out = Arc::clone(&stream_prod_arc);
    let settings_for_out = Arc::clone(&settings);
    let mic_self_mon_for_out = Arc::clone(&mic_self_mon_flag);

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(2000));

        let host = cpal::default_host();
        let stream_error_flag = Arc::new(AtomicBool::new(false));
        let mic_mon_cons_arc = Arc::new(Mutex::new(mic_mon_cons));

        while is_running_out.load(Ordering::Relaxed) {
            let (target_name, target_buffer_size) = {
                let s = settings_for_out.lock().unwrap_or_else(|e| e.into_inner());
                (s.monitor_device.clone(), s.buffer_size)
            };

            let mut target_device = None;
            let mut resolved_device_name = String::new();

            if target_name == "__DEFAULT__" {
                if let Some(d) = host.default_output_device() {
                    resolved_device_name = d.name().unwrap_or_default();
                    target_device = Some(d);
                }
            } else {
                if let Ok(devices) = host.output_devices() {
                    for dev in devices {
                        let name = dev.name().unwrap_or_default();
                        if name == target_name || name.contains(&target_name) {
                            resolved_device_name = name;
                            target_device = Some(dev);
                            break;
                        }
                    }
                }
            }

            let device = match target_device {
                Some(d) => d,
                None => {
                    thread::sleep(Duration::from_millis(1000));
                    continue;
                }
            };

            let default_cfg = match device.default_output_config() {
                Ok(c) => c,
                Err(_) => {
                    thread::sleep(Duration::from_millis(1000));
                    continue;
                }
            };

            let mut stream_config: cpal::StreamConfig = default_cfg.clone().into();
            stream_config.buffer_size = cpal::BufferSize::Default;

            stream_error_flag.store(false, Ordering::Relaxed);

            let workers_cb = Arc::clone(&workers_out);
            let app_vols_cb = Arc::clone(&app_volumes_out);
            let def_mon_vol_cb = Arc::clone(&def_mon_vol_out);
            let def_str_vol_cb = Arc::clone(&def_str_vol_out);
            let def_mon_mute_cb = Arc::clone(&def_mon_mute_out);
            let def_str_mute_cb = Arc::clone(&def_str_mute_out);
            let stream_prod_cb = Arc::clone(&stream_prod_for_out);
            let err_flag_inner = Arc::clone(&stream_error_flag);
            let mic_mon_cons_cb = Arc::clone(&mic_mon_cons_arc);
            let mic_self_mon_cb = Arc::clone(&mic_self_mon_for_out);

            let mut obs_samples = Vec::with_capacity(2048);
            let active_buf_size = target_buffer_size as usize;

            let stream_res = device.build_output_stream(
                &stream_config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    let num_samples = data.len();
                    data.fill(0.0);

                    obs_samples.clear();
                    obs_samples.resize(num_samples, 0.0);

                    if let Ok(mut workers_map) = workers_cb.try_lock() {
                        let app_vols = app_vols_cb.lock().unwrap_or_else(|e| e.into_inner());

                        let def_m_vol = f32::from_bits(def_mon_vol_cb.load(Ordering::Relaxed));
                        let def_s_vol = f32::from_bits(def_str_vol_cb.load(Ordering::Relaxed));
                        let def_m_mute = def_mon_mute_cb.load(Ordering::Relaxed);
                        let def_s_mute = def_str_mute_cb.load(Ordering::Relaxed);

                        let max_lag = (active_buf_size * 4).max(512) * 2;

                        for worker in workers_map.values_mut() {
                            if worker.consumer.slots() > max_lag * 2 {
                                while worker.consumer.slots() > max_lag {
                                    let _ = worker.consumer.pop();
                                }
                            }

                            let (mon_vol, str_vol) = if let Some(&(m_v, s_v, m_m, s_m)) = app_vols.get(&worker.pid) {
                                (if m_m { 0.0 } else { m_v }, if s_m { 0.0 } else { s_v })
                            } else {
                                (if def_m_mute { 0.0 } else { def_m_vol }, if def_s_mute { 0.0 } else { def_s_vol })
                            };

                            let available = worker.consumer.slots().min(num_samples);
                            let frames_to_read = (available / 2) * 2;

                            let mut app_peak = 0.0f32;
                            for i in (0..frames_to_read).step_by(2) {
                                let l = worker.consumer.pop().unwrap_or(0.0);
                                let r = worker.consumer.pop().unwrap_or(0.0);

                                let (m_l, m_r) = worker.mon_dsp.process_stereo(l, r);
                                let (s_l, s_r) = worker.str_dsp.process_stereo(l, r);

                                let out_l = m_l * mon_vol;
                                let out_r = m_r * mon_vol;
                                let p = out_l.abs().max(out_r.abs());
                                if p > app_peak {
                                    app_peak = p;
                                }

                                data[i] += out_l;
                                data[i + 1] += out_r;

                                obs_samples[i] += s_l * str_vol;
                                obs_samples[i + 1] += s_r * str_vol;
                            }

                            if frames_to_read > 0 {
                                let db = if app_peak > 1e-6 { 20.0 * app_peak.log10() } else { -120.0 };
                                let prev_db = f32::from_bits(worker.peak_db_bits.load(Ordering::Relaxed));
                                if db > prev_db {
                                    worker.peak_db_bits.store(db.to_bits(), Ordering::Relaxed);
                                }
                            }
                        }
                    }

                    if let Ok(mut m_cons) = mic_mon_cons_cb.try_lock() {
                        if mic_self_mon_cb.load(Ordering::Relaxed) {
                            let max_lag = (active_buf_size * 4).max(512) * 2;
                            if m_cons.slots() > max_lag * 2 {
                                while m_cons.slots() > max_lag {
                                    let _ = m_cons.pop();
                                }
                            }
                            let avail = m_cons.slots().min(num_samples);
                            let frames = (avail / 2) * 2;
                            for i in (0..frames).step_by(2) {
                                let ml = m_cons.pop().unwrap_or(0.0);
                                let mr = m_cons.pop().unwrap_or(0.0);
                                data[i] += ml;
                                data[i + 1] += mr;
                            }
                        } else {
                            while m_cons.pop().is_ok() {}
                        }
                    }

                    for sample in data.iter_mut() {
                        *sample = sample.clamp(-1.0, 1.0);
                    }

                    if let Ok(mut str_prod) = stream_prod_cb.try_lock() {
                        for &sample in &obs_samples {
                            let _ = str_prod.push(sample.clamp(-1.0, 1.0));
                        }
                    }
                },
                move |_err| {
                    err_flag_inner.store(true, Ordering::Relaxed);
                },
                None,
            );

            let stream = match stream_res {
                Ok(s) => s,
                Err(_) => {
                    thread::sleep(Duration::from_millis(1000));
                    continue;
                }
            };

            if stream.play().is_err() {
                thread::sleep(Duration::from_millis(1000));
                continue;
            }

            println!(">>> [Tauri 後端] 實體耳機輸出已上線: {} ({})",
                target_name, resolved_device_name);

            while is_running_out.load(Ordering::Relaxed) && !stream_error_flag.load(Ordering::Relaxed) {
                let (current_setting, current_buf) = {
                    let s = settings_for_out.lock().unwrap_or_else(|e| e.into_inner());
                    (s.monitor_device.clone(), s.buffer_size)
                };

                if current_setting != target_name || current_buf != target_buffer_size {
                    break;
                }

                if target_name == "__DEFAULT__" {
                    if let Some(new_def) = host.default_output_device() {
                        let new_def_name = new_def.name().unwrap_or_default();
                        if new_def_name != resolved_device_name {
                            break;
                        }
                    }
                }

                thread::sleep(Duration::from_millis(250));
            }

            drop(stream);
            thread::sleep(Duration::from_millis(500));
        }
    });

    // 5. 麥克風擴充模組守護線程
    let mic_cfg_thread = Arc::clone(&mic_live_config);
    let mic_dirty_thread = Arc::clone(&mic_config_dirty);
    let mic_in_db_thread = Arc::clone(&mic_in_db_bits);
    let mic_out_db_thread = Arc::clone(&mic_out_db_bits);
    let mic_active_thread = Arc::clone(&mic_is_active);
    let mic_self_mon_thread = Arc::clone(&mic_self_mon_flag);
    let mic_mon_prod_thread = Arc::clone(&mic_mon_prod_arc);
    let settings_for_mic = Arc::clone(&settings);

    thread::spawn(move || {
        let host = cpal::default_host();

        while is_running_mic.load(Ordering::Relaxed) {
            let current_cfg = {
                mic_cfg_thread.lock().unwrap_or_else(|e| e.into_inner()).clone()
            };

            mic_self_mon_thread.store(current_cfg.enabled && current_cfg.self_monitor, Ordering::Relaxed);

            if !current_cfg.enabled {
                mic_active_thread.store(false, Ordering::Relaxed);
                mic_in_db_thread.store((-120.0f32).to_bits(), Ordering::Relaxed);
                mic_out_db_thread.store((-120.0f32).to_bits(), Ordering::Relaxed);
                thread::sleep(Duration::from_millis(250));
                continue;
            }

            let in_dev_opt = if current_cfg.input_device == "__DEFAULT__" {
                host.default_input_device()
            } else {
                host.input_devices().ok().and_then(|mut devs| {
                    devs.find(|d| {
                        let n = d.name().unwrap_or_default();
                        n == current_cfg.input_device || n.contains(&current_cfg.input_device)
                    })
                })
            };

            let in_device = match in_dev_opt {
                Some(d) => d,
                None => {
                    mic_active_thread.store(false, Ordering::Relaxed);
                    thread::sleep(Duration::from_millis(500));
                    continue;
                }
            };

            let in_default_cfg = match in_device.default_input_config() {
                Ok(c) => c,
                Err(_) => {
                    mic_active_thread.store(false, Ordering::Relaxed);
                    thread::sleep(Duration::from_millis(500));
                    continue;
                }
            };

            let in_sample_format = in_default_cfg.sample_format();
            let in_sample_rate = in_default_cfg.sample_rate().0;
            let in_channels = in_default_cfg.channels() as usize;
            let in_stream_cfg: cpal::StreamConfig = in_default_cfg.clone().into();

            let (blackhole_dev_name, monitor_dev_name) = {
                let s = settings_for_mic.lock().unwrap_or_else(|e| e.into_inner());
                (s.blackhole_device.clone(), s.monitor_device.clone())
            };

            let out_dev_target = current_cfg.output_device.clone();
            let is_conflict = out_dev_target == blackhole_dev_name || out_dev_target == monitor_dev_name;

            let (mic_out_prod, mut mic_out_cons) = RingBuffer::<f32>::new(65536);
            let out_stream_err = Arc::new(AtomicBool::new(false));
            let mut active_out_stream = None;

            if out_dev_target != "__NONE__" && !out_dev_target.starts_with("__MIC_READONLY_") && !is_conflict {
                let out_dev_opt = host.output_devices().ok().and_then(|mut devs| {
                    devs.find(|d| {
                        let n = d.name().unwrap_or_default();
                        n == out_dev_target || n.contains(&out_dev_target)
                    })
                });

                if let Some(out_dev) = out_dev_opt {
                    if let Ok(out_def_cfg) = out_dev.default_output_config() {
                        let out_format = out_def_cfg.sample_format();
                        let mut out_cfg: cpal::StreamConfig = out_def_cfg.clone().into();
                        out_cfg.buffer_size = cpal::BufferSize::Default;

                        let out_ch = out_cfg.channels as usize;
                        let out_sample_rate = out_cfg.sample_rate.0;
                        let resample_ratio = (in_sample_rate as f64) / (out_sample_rate as f64);

                        let err_c = Arc::clone(&out_stream_err);
                        let mut frac = 0.0f64;
                        let mut last_s = 0.0f32;
                        let mut curr_s = 0.0f32;
                        let mut dither_sign = 1.0f32;
                        let mut is_primed = false;

                        let stream_res = match out_format {
                            cpal::SampleFormat::I16 => out_dev.build_output_stream(
                                &out_cfg,
                                move |data: &mut [i16], _: &cpal::OutputCallbackInfo| {
                                    if mic_out_cons.slots() > 2200 {
                                        while mic_out_cons.slots() > 1320 {
                                            let _ = mic_out_cons.pop();
                                        }
                                    }
                                    if !is_primed {
                                        if mic_out_cons.slots() >= 960 {
                                            is_primed = true;
                                        } else {
                                            for sample in data.iter_mut() {
                                                dither_sign = -dither_sign;
                                                *sample = dither_sign as i16;
                                            }
                                            return;
                                        }
                                    }

                                    let frames = data.len() / out_ch.max(1);
                                    for f in 0..frames {
                                        frac += resample_ratio;
                                        while frac >= 1.0 {
                                            frac -= 1.0;
                                            last_s = curr_s;
                                            if let Ok(s) = mic_out_cons.pop() {
                                                curr_s = s;
                                            } else {
                                                is_primed = false;
                                                curr_s *= 0.98;
                                            }
                                        }
                                        let sample = if (resample_ratio - 1.0).abs() < 0.001 {
                                            curr_s
                                        } else {
                                            last_s + (curr_s - last_s) * (frac as f32)
                                        };
                                        dither_sign = -dither_sign;
                                        let val_i16 = ((sample.clamp(-1.0, 1.0) * 32766.0) as i16).saturating_add(dither_sign as i16);
                                        for c in 0..out_ch {
                                            data[f * out_ch + c] = val_i16;
                                        }
                                    }
                                },
                                move |_| {
                                    err_c.store(true, Ordering::Relaxed);
                                },
                                None,
                            ),
                            _ => out_dev.build_output_stream(
                                &out_cfg,
                                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                                    if mic_out_cons.slots() > 2200 {
                                        while mic_out_cons.slots() > 1320 {
                                            let _ = mic_out_cons.pop();
                                        }
                                    }
                                    if !is_primed {
                                        if mic_out_cons.slots() >= 960 {
                                            is_primed = true;
                                        } else {
                                            for sample in data.iter_mut() {
                                                dither_sign = -dither_sign;
                                                *sample = dither_sign * 1e-5;
                                            }
                                            return;
                                        }
                                    }

                                    let frames = data.len() / out_ch.max(1);
                                    for f in 0..frames {
                                        frac += resample_ratio;
                                        while frac >= 1.0 {
                                            frac -= 1.0;
                                            last_s = curr_s;
                                            if let Ok(s) = mic_out_cons.pop() {
                                                curr_s = s;
                                            } else {
                                                is_primed = false;
                                                curr_s *= 0.98;
                                            }
                                        }
                                        dither_sign = -dither_sign;
                                        let sample = if (resample_ratio - 1.0).abs() < 0.001 {
                                            curr_s
                                        } else {
                                            last_s + (curr_s - last_s) * (frac as f32)
                                        } + (dither_sign * 1e-5);

                                        for c in 0..out_ch {
                                            data[f * out_ch + c] = sample;
                                        }
                                    }
                                },
                                move |_| {
                                    err_c.store(true, Ordering::Relaxed);
                                },
                                None,
                            ),
                        };

                        if let Ok(s) = stream_res {
                            let _ = s.play();
                            active_out_stream = Some(s);
                            println!(
                                ">>> [麥克風引擎] 轉送目標已上線 (30ms 不斷流模式): {} (In: {}Hz -> Out: {}Hz, 格式: {:?})",
                                out_dev_target, in_sample_rate, out_sample_rate, out_format
                            );
                        }
                    }
                }
            }

            let in_stream_err = Arc::new(AtomicBool::new(false));
            let in_err_c = Arc::clone(&in_stream_err);

            let mut dsp_runtime = MicDspRuntime::new(in_sample_rate as f32);
            dsp_runtime.update_config(&current_cfg);
            let mic_dsp_state = Arc::new(Mutex::new((dsp_runtime, mic_out_prod)));

            let cfg_cb = Arc::clone(&mic_cfg_thread);
            let dirty_cb = Arc::clone(&mic_dirty_thread);
            let in_db_cb = Arc::clone(&mic_in_db_thread);
            let out_db_cb = Arc::clone(&mic_out_db_thread);
            let self_mon_cb = Arc::clone(&mic_self_mon_thread);
            let mon_prod_cb = Arc::clone(&mic_mon_prod_thread);
            let dsp_state_cb = Arc::clone(&mic_dsp_state);

            let mut mono_in_buf = Vec::with_capacity(2048);
            let mut mono_out_buf = Vec::with_capacity(2048);

            let in_stream_res = match in_sample_format {
                cpal::SampleFormat::I16 => in_device.build_input_stream(
                    &in_stream_cfg,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut state) = dsp_state_cb.try_lock() {
                            let (ref mut dsp, ref mut prod) = *state;
                            if dirty_cb.swap(false, Ordering::Relaxed) {
                                if let Ok(c) = cfg_cb.lock() {
                                    dsp.update_config(&c);
                                    self_mon_cb.store(c.enabled && c.self_monitor, Ordering::Relaxed);
                                }
                            }
                            mono_in_buf.clear();
                            let ch = in_channels.max(1);
                            let mut in_peak = 0.0f32;
                            for frame in data.chunks(ch) {
                                let m = (frame[0] as f32) / 32768.0;
                                let abs_m = m.abs();
                                if abs_m > in_peak {
                                    in_peak = abs_m;
                                }
                                mono_in_buf.push(m);
                            }
                            let in_db = if in_peak > 1e-6 { 20.0 * in_peak.log10() } else { -120.0 };
                            in_db_cb.store(in_db.to_bits(), Ordering::Relaxed);

                            dsp.process_mono_chunk(&mono_in_buf, &mut mono_out_buf);

                            let mut out_peak = 0.0f32;
                            for &s in &mono_out_buf {
                                let abs_s = s.abs();
                                if abs_s > out_peak {
                                    out_peak = abs_s;
                                }
                                let _ = prod.push(s);
                            }
                            if !mono_out_buf.is_empty() {
                                let out_db = if out_peak > 1e-6 { 20.0 * out_peak.log10() } else { -120.0 };
                                out_db_cb.store(out_db.to_bits(), Ordering::Relaxed);
                            }
                            if self_mon_cb.load(Ordering::Relaxed) {
                                if let Ok(mut mon_p) = mon_prod_cb.try_lock() {
                                    for &s in &mono_out_buf {
                                        let _ = mon_p.push(s);
                                        let _ = mon_p.push(s);
                                    }
                                }
                            }
                        }
                    },
                    move |_| {
                        in_err_c.store(true, Ordering::Relaxed);
                    },
                    None,
                ),
                _ => in_device.build_input_stream(
                    &in_stream_cfg,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut state) = dsp_state_cb.try_lock() {
                            let (ref mut dsp, ref mut prod) = *state;
                            if dirty_cb.swap(false, Ordering::Relaxed) {
                                if let Ok(c) = cfg_cb.lock() {
                                    dsp.update_config(&c);
                                    self_mon_cb.store(c.enabled && c.self_monitor, Ordering::Relaxed);
                                }
                            }
                            mono_in_buf.clear();
                            let ch = in_channels.max(1);
                            let mut in_peak = 0.0f32;
                            for frame in data.chunks(ch) {
                                let m = frame[0];
                                let abs_m = m.abs();
                                if abs_m > in_peak {
                                    in_peak = abs_m;
                                }
                                mono_in_buf.push(m);
                            }
                            let in_db = if in_peak > 1e-6 { 20.0 * in_peak.log10() } else { -120.0 };
                            in_db_cb.store(in_db.to_bits(), Ordering::Relaxed);

                            dsp.process_mono_chunk(&mono_in_buf, &mut mono_out_buf);

                            let mut out_peak = 0.0f32;
                            for &s in &mono_out_buf {
                                let abs_s = s.abs();
                                if abs_s > out_peak {
                                    out_peak = abs_s;
                                }
                                let _ = prod.push(s);
                            }
                            if !mono_out_buf.is_empty() {
                                let out_db = if out_peak > 1e-6 { 20.0 * out_peak.log10() } else { -120.0 };
                                out_db_cb.store(out_db.to_bits(), Ordering::Relaxed);
                            }
                            if self_mon_cb.load(Ordering::Relaxed) {
                                if let Ok(mut mon_p) = mon_prod_cb.try_lock() {
                                    for &s in &mono_out_buf {
                                        let _ = mon_p.push(s);
                                        let _ = mon_p.push(s);
                                    }
                                }
                            }
                        }
                    },
                    move |_| {
                        in_err_c.store(true, Ordering::Relaxed);
                    },
                    None,
                ),
            };

            let in_stream = match in_stream_res {
                Ok(s) => s,
                Err(_) => {
                    mic_active_thread.store(false, Ordering::Relaxed);
                    thread::sleep(Duration::from_millis(500));
                    continue;
                }
            };

            if in_stream.play().is_err() {
                mic_active_thread.store(false, Ordering::Relaxed);
                thread::sleep(Duration::from_millis(500));
                continue;
            }

            mic_active_thread.store(true, Ordering::Relaxed);
            println!(">>> [麥克風引擎] 4 級 DSP 收音鏈路已啟動: {}", current_cfg.input_device);

            let active_in_dev = current_cfg.input_device.clone();
            let active_out_dev = current_cfg.output_device.clone();

            while is_running_mic.load(Ordering::Relaxed)
                && !in_stream_err.load(Ordering::Relaxed)
                && !out_stream_err.load(Ordering::Relaxed)
            {
                let (now_enabled, now_in, now_out) = {
                    let c = mic_cfg_thread.lock().unwrap_or_else(|e| e.into_inner());
                    (c.enabled, c.input_device.clone(), c.output_device.clone())
                };

                if !now_enabled || now_in != active_in_dev || now_out != active_out_dev {
                    break;
                }

                thread::sleep(Duration::from_millis(200));
            }

            drop(in_stream);
            drop(active_out_stream);
            mic_active_thread.store(false, Ordering::Relaxed);
            thread::sleep(Duration::from_millis(200));
        }
    });

    // 6. 系統匣設定
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("open", "開啟 DR_AudioRouter"))
        .add_item(CustomMenuItem::new("quit", "完全結束程式"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    let is_minimized_launch = std::env::args().any(|a| a == "--minimized");

    // 7. Tauri 主視窗啟動
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(w) = app.get_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "open" => {
                        if let Some(w) = app.get_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = event.window().emit("show-close-confirm", ());
            }
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                if let Ok(true) = event.window().is_minimized() {
                    let _ = event.window().hide();
                }
            }
            _ => {}
        })
        .setup(move |app| {
            if is_minimized_launch {
                if let Some(w) = app.get_window("main") {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .manage(AppState {
            panic_mute,
            def_mon_vol,
            def_str_vol,
            def_mon_mute,
            def_str_mute,
            app_volumes,
            dsp_configs,
            settings,
            icon_cache,
            workers,
            mic_live_config,
            mic_config_dirty,
            mic_in_db_bits,
            mic_out_db_bits,
            mic_is_active,
        })
        .invoke_handler(tauri::generate_handler![
            set_default_mute,
            update_default_volumes,
            update_app_channel,
            reset_app_channel,
            update_app_dsp,
            update_mic_config,
            get_mic_levels,
            get_app_levels,
            get_input_devices,
            get_current_apps,
            get_audio_devices,
            get_audio_settings,
            save_audio_settings,
            get_full_config,
            save_full_config,
            hide_window,
            exit_app,
            get_autostart_status,
            set_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 應用程式執行失敗");
}