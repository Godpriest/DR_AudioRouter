const { invoke } = window.__TAURI__.tauri;

// 使用系統預設瀏覽器安全開啟外部連結 (避免 Tauri 視窗本身被跳轉)
function openExternalUrl(url) {
  if (window.__TAURI__ && window.__TAURI__.shell) {
    window.__TAURI__.shell.open(url);
  } else {
    window.open(url, "_blank");
  }
}

// 7 段頻率邊界約束（宣告於最頂部，供初始化預設狀態使用）
const BAND_DEFINITIONS = [
  { defaultFreq: 60, minFreq: 20, maxFreq: 100, defaultQ: 0.7, name: "B1", role: "低架" },
  { defaultFreq: 150, minFreq: 100, maxFreq: 300, defaultQ: 1.0, name: "B2", role: "轟鳴" },
  { defaultFreq: 400, minFreq: 300, maxFreq: 800, defaultQ: 1.4, name: "B3", role: "踏地" },
  { defaultFreq: 1000, minFreq: 800, maxFreq: 2000, defaultQ: 1.4, name: "B4", role: "機關" },
  { defaultFreq: 2500, minFreq: 2000, maxFreq: 4500, defaultQ: 1.4, name: "B5", role: "腳步" },
  { defaultFreq: 6000, minFreq: 4500, maxFreq: 9000, defaultQ: 1.0, name: "B6", role: "碎物" },
  { defaultFreq: 12000, minFreq: 9000, maxFreq: 18000, defaultQ: 0.7, name: "B7", role: "高架" }
];

// === 雙語系多國語言字典 ===
const I18N = {
  "zh-TW": {
    btn_save: "💾 儲存",
    btn_saved: "💾 已儲存",
    btn_done: "完成設定",
    btn_cancel: "取消",
    btn_got_it: "我知道了",
    search_ph: "搜尋軟體或 PID...",
    tab_mixer: "🎧 系統混音",
    tab_mic: "🎙️ 麥克風",
    default_title: "預設 (全域基準)",
    default_sub: "新應用程式自動套用此音量",
    offline_divider: "已記憶但未啟動的程式",
    new_profile_opt: "➕ 新增設定檔...",
    settings_title: "系統端點與 OBS 設定",
    settings_blackhole: "黑洞接收端點",
    settings_monitor: "實體耳機輸出",
    settings_hz_warn: "注意：黑洞端點與實體耳機取樣率不一致，Windows 將介入重取樣！建議在控制台對齊至相同 Hz。",
    settings_obs_port: "OBS WebSocket 通訊埠",
    settings_buffer: "轉發延遲緩衝區",
    settings_lang: "介面語言 / Language",
    settings_autostart: "開機時自動啟動 (常駐於右下角系統匣)",
    buf_128: "128 幀 - 極致競技 (約 5~8 ms，開槍零時差)",
    buf_256: "256 幀 - 低延遲推薦 (約 12~15 ms，最佳平衡)",
    buf_512: "512 幀 - 標準模式 (約 25~30 ms，穩定安全)",
    buf_1024: "1024 幀 - 防爆音模式 (約 45~50 ms，高負載防禦)",
    system_default_dev: "【跟隨系統預設】Windows 預設裝置",
    save_settings_btn: "儲存並套用",
    applying: "設定中...",
    obs_ready: "OBS: {port} 已就緒",
    obs_copied: "已複製網址！",
    toast_max_vol: "⚠️ 音量上限為 500%，無法超出極限！",
    toast_dyn_range: "⚠️ 輸入範圍必須介於 -100 dB ～ 100 dB 之間！",
    toast_dyn_order: "⚠️ 大小順序錯誤！必須符合：過小聲遮蔽門檻 < 安全區下限 < 安全區上限 < 過大聲音量上限",
    eq_modal_suffix: "等化器與動態音量平衡",
    channel_mon: "耳機輸出",
    channel_str: "OBS 輸出",
    eq_enable: "啟用 7 段等化器 (EQ)",
    eq_reset: "重置平坦 (0 dB)",
    boost_enable: "啟用動態音量平衡",
    dyn_col_floor: "過小聲遮蔽門檻",
    dyn_col_boost: "過小聲音量補償",
    dyn_col_smin: "🟢 安全區下限",
    dyn_col_smax: "🟢 安全區上限",
    dyn_col_cut: "過大聲音量減少",
    dyn_col_lmax: "過大聲音量上限",
    boost_hint: "💡 作用原理：落在【安全區下限 ～ 安全區上限】維持原音穩定不變；低於安全區下限漸進放大補償（低於遮蔽門檻則捨棄補償），高於安全區上限漸進減少音量（超過上限則維持套用減少量）。",
    help_title: "音訊設定與說明",
    help_sec1_title: "1. Windows 預設播放裝置 需設為黑洞端點",
    help_sec1_desc: "請在 Windows 設定中，將「預設輸出裝置」改選為本軟體指定的<b>黑洞端點</b>。<br>這樣所有日常遊戲、影音與應用程式的聲音才會流入 DR_AudioRouter，由本軟體進行獨立混音、EQ 調校與 OBS 轉發。",
    help_sec2_title: "2. 關於系統提示音（截圖聲、調整音量聲）",
    help_sec2_desc: "Windows 系統提示音（截圖喀擦聲、滑桿提示音、USB 插拔聲）是由系統核心直接合成，不具備獨立應用程式 PID，因此本軟體無法針對其進行捕捉與轉發，預設會被隔離於黑洞中而無法聽見。<br>此特性可確保您在競技遊戲、聽音辨位與實況轉播時，完全不受突發系統雜音干擾。",
    help_license_title: "授權與版權",
    help_ai_title: "AI 協助",
    help_ai_desc: "本軟體的部分程式碼與文件經由 AI 輔助產生與修訂，最終內容均由作者審閱並整合。",
    close_title: "關閉 DR_AudioRouter",
    close_desc: "請選擇您希望執行的操作：<br>縮小至系統匣可維持背景音訊混音與路由。",
    btn_minimize: "縮小到右下角 (背景運作)",
    btn_exit: "完全結束程式",
    rename_title: "重新命名設定檔",
    rename_label: "請輸入新的設定檔名稱：",
    rename_confirm: "儲存名稱",
    new_prof_title: "建立新設定檔",
    new_prof_label: "設定檔名稱（例如：FPS 腳步強化、日常影音）：",
    new_prof_confirm: "建立並切換",
    pid_offline: "離線",
    reset_tooltip: "重置回到跟隨預設狀態",
    mute_mon_tip: "靜音耳機",
    mute_str_tip: "靜音 OBS",
    eq_btn_tip: "調整專屬等化器與動態音量平衡",
    mic_master_enable: "啟用麥克風處理 (預設關閉)",
    mic_self_mon: "🎧 耳機自我監聽 (測試用)",
    mic_out_vol: "輸出音量",
    mic_input_dev: "🎙️ 麥克風收音來源 (Input)",
    mic_output_dev: "🔊 轉送目標裝置 (供 OBS / 語音通話獨立擷取)",
    mic_no_forward: "【不轉送】僅做本機處理/監聽",
    mic_dev_conflict: "【系統混音使用中 - 禁止轉送】",
    hpf_title: "第 1 關：前置高通濾波器 (HPF 低切)",
    hpf_desc: "切除低頻雜訊（如冷氣低頻共振、敲擊鍵盤桌面的震動、說話時的噴麥風切氣音），確保純淨人聲。",
    nr_title: "第 2 關：AI 智慧雜訊抑制",
    nr_desc: "採用輕量化神經網絡即時辨識人聲特徵，自動抹除風扇、機械鍵盤與環境雜音；啟用後可調整前置增益、人聲判定門檻與降噪深度。",
    nr_pre_gain: "① 輸入前增益 (解決麥克風收音過小)",
    nr_vad_thresh: "② AI 人聲判定門檻 (過濾非人聲與呼吸底噪)",
    nr_wet_label: "③ AI 降噪深度 (濾除背景雜音比例)",
    mic_eq_title: "第 3 關：7 段人聲參數型等化器 (EQ)",
    mic_eq_desc: "雕琢麥克風音色（微調磁性厚度、增加唇齒咬字清晰度或壓抑金屬刺耳聲），帶有物理對數曲線圖。",
    dyn_title: "第 4 關：動態音量平衡",
    dyn_desc: "落在【安全區下限 ～ 安全區上限】維持原音穩定不變；低於安全區下限漸進放大補償（低於遮蔽門檻則捨棄補償），高於安全區上限漸進減少音量（超過上限則維持套用減少量）。",
    mic_in_use_source: "【目前收音來源 - 禁止選擇】",
    mic_hw_readonly: "【實體麥克風 - 無法寫入】",
    mic_virtual_bridge: "【虛擬麥克風通道】",
    mic_help_title: "轉送目標裝置說明",
    mic_help_desc: "受限於系統硬體方向性，<b>實體麥克風僅能讀取收音，無法作為轉送寫入目標</b>。<br><br>• <b>🎙️ 供語音通話使用 (二選一)</b>：<br>&nbsp;&nbsp;1. <b>Steam 內建驅動 (免額外安裝)</b>：若電腦有安裝 <b>Steam</b>，可直接啟用其內建的 <b>Steam Streaming Speakers / Microphone</b> 當作轉送虛擬通道。<br>&nbsp;&nbsp;2. <b>第三方虛擬音訊線路</b>：亦可安裝知名虛擬驅動例如 <a href=\"#\" onclick=\"openExternalUrl('https://vb-audio.com/Cable/'); return false;\" style=\"color: #38bdf8; text-decoration: underline; font-weight: bold;\">VB-CABLE</a>，建立專用的虛擬麥克風通道。<br><br>• <b>🎧 供 OBS 實況使用</b>：可直接選擇下方任一閒置的播放裝置，並在 OBS 新增「音訊輸出擷取」接收。"
  },
  "en": {
    btn_save: "💾 Save",
    btn_saved: "💾 Saved",
    btn_done: "Done",
    btn_cancel: "Cancel",
    btn_got_it: "Got It",
    search_ph: "Search application or PID...",
    tab_mixer: "🎧 System Mixer",
    tab_mic: "🎙️ Microphone",
    default_title: "Default (Global Baseline)",
    default_sub: "New apps automatically inherit these volumes",
    offline_divider: "Saved Inactive Applications",
    new_profile_opt: "➕ New Profile...",
    settings_title: "System Endpoints & OBS Settings",
    settings_blackhole: "Black Hole Sink Endpoint",
    settings_monitor: "Physical Monitor Output",
    settings_hz_warn: "Warning: Sample rates mismatch! Windows will resample audio. It is recommended to match sample rates in Windows Sound Settings.",
    settings_obs_port: "OBS WebSocket Port",
    settings_buffer: "Buffer Latency",
    settings_lang: "Language / 介面語言",
    settings_autostart: "Start on Windows boot (System Tray)",
    buf_128: "128 frames - Ultra Low (5~8 ms, esports)",
    buf_256: "256 frames - Recommended (12~15 ms, balanced)",
    buf_512: "512 frames - Standard (25~30 ms, safe)",
    buf_1024: "1024 frames - Safe Mode (45~50 ms, anti-glitch)",
    system_default_dev: "[System Default] Windows Default Device",
    save_settings_btn: "Save & Apply",
    applying: "Applying...",
    obs_ready: "OBS: {port} Ready",
    obs_copied: "URL Copied!",
    toast_max_vol: "⚠️ Maximum volume is 500%!",
    toast_dyn_range: "⚠️ Value must be between -100 dB and 100 dB!",
    toast_dyn_order: "⚠️ Invalid order! Must satisfy: Quiet Threshold < Safe Min < Safe Max < Loud Max",
    eq_modal_suffix: "EQ & Dynamic Volume Balance",
    channel_mon: "Headphones",
    channel_str: "OBS Stream",
    eq_enable: "Enable 7-Band Parametric EQ",
    eq_reset: "Reset Flat (0 dB)",
    boost_enable: "Enable Dynamic Volume Balance",
    dyn_col_floor: "Quiet Threshold",
    dyn_col_boost: "Quiet Boost",
    dyn_col_smin: "🟢 Safe Zone Min",
    dyn_col_smax: "🟢 Safe Zone Max",
    dyn_col_cut: "Loud Reduction",
    dyn_col_lmax: "Loud Max Limit",
    boost_hint: "💡 How it works: Audio within [Safe Min ~ Safe Max] stays untouched. Below Safe Min is progressively boosted (discarded below Quiet Threshold); above Safe Max is progressively reduced up to Loud Max Limit.",
    help_title: "Audio Setup & Guide",
    help_sec1_title: "1. Windows Default Output Must Be Black Hole Sink",
    help_sec1_desc: "Please set your Windows 'Default Output Device' to the Black Hole sink configured in this app.<br>All game, media, and application audio will then route into DR_AudioRouter for per-app mixing, parametric EQ, and OBS streaming.",
    help_sec2_title: "2. About Windows System Notification Sounds",
    help_sec2_desc: "Windows system sounds (screenshot shutter, volume slider ding, USB chimes) are synthesized directly by the audio kernel without dedicated application PIDs. DR_AudioRouter cannot capture or route them, so they stay isolated in the sink.<br>This ensures your competitive gameplay and live stream remain completely free from sudden system sound disruptions.",
    help_license_title: "License & Copyright",
    help_ai_title: "AI Assistance",
    help_ai_desc: "Portions of this software's code and documentation were generated and refined with AI assistance, and reviewed/integrated by the author.",
    close_title: "Close DR_AudioRouter",
    close_desc: "Choose an action:<br>Minimizing to system tray maintains background audio routing and mixing.",
    btn_minimize: "Minimize to Tray (Keep Running)",
    btn_exit: "Exit Application",
    rename_title: "Rename Profile",
    rename_label: "Enter new profile name:",
    rename_confirm: "Save Name",
    new_prof_title: "Create New Profile",
    new_prof_label: "Profile name (e.g., FPS Footsteps, Daily Media):",
    new_prof_confirm: "Create & Switch",
    pid_offline: "Offline",
    reset_tooltip: "Reset to inherit default settings",
    mute_mon_tip: "Mute Headphones",
    mute_str_tip: "Mute OBS",
    eq_btn_tip: "Adjust Parametric EQ & Dynamic Volume Balance",
    mic_master_enable: "Enable Mic Processing (Default Off)",
    mic_self_mon: "🎧 Self Monitor (Test Mode)",
    mic_out_vol: "Output Vol",
    mic_input_dev: "🎙️ Microphone Source (Input)",
    mic_output_dev: "🔊 Forward Target (For OBS / Voice Chat)",
    mic_no_forward: "[No Forward] Local DSP/Monitor Only",
    mic_dev_conflict: "[System In Use - Conflict Blocked]",
    hpf_title: "Stage 1: High-Pass Filter (HPF Low-cut)",
    hpf_desc: "Eliminates low-frequency rumbles (AC vibrations, desk bumps, plosives) to preserve pure voice frequencies.",
    nr_title: "Stage 2: AI Noise Suppression",
    nr_desc: "Uses lightweight neural networks to isolate voice and remove fan/keyboard noise. Expand to adjust Pre-Gain, VAD Gate, and Reduction Depth.",
    nr_pre_gain: "① Input Pre-Gain (Boost quiet mic)",
    nr_vad_thresh: "② Voice Confidence Threshold (VAD Gate)",
    nr_wet_label: "③ Noise Reduction Depth (Filter ratio)",
    mic_eq_title: "Stage 3: 7-Band Voice Parametric EQ",
    mic_eq_desc: "Tailors vocal timbre (warmth, presence, air) with real-time logarithmic curve response.",
    dyn_title: "Stage 4: Dynamic Volume Balance",
    dyn_desc: "Audio within [Safe Min ~ Safe Max] stays untouched. Below Safe Min is progressively boosted (discarded below Quiet Threshold); above Safe Max is progressively reduced up to Loud Max Limit.",
    mic_in_use_source: "[Active Mic Source - Blocked]",
    mic_hw_readonly: "[Hardware Mic - Read Only]",
    mic_virtual_bridge: "[Virtual Mic Channel]",
    mic_help_title: "Forward Target Guide",
    mic_help_desc: "Due to hardware directionality, <b>physical microphones are read-only and cannot receive forwarded audio</b>.<br><br>• <b>🎙️ For Voice Chat (Choose one)</b>:<br>&nbsp;&nbsp;1. <b>Built-in Steam Driver (No Extra Install)</b>: If you have <b>Steam</b> installed, enable <b>Steam Streaming Speakers / Microphone</b> as a virtual forwarding channel.<br>&nbsp;&nbsp;2. <b>Third-Party Virtual Cable</b>: You can also install drivers like <a href=\"#\" onclick=\"openExternalUrl('https://vb-audio.com/Cable/'); return false;\" style=\"color: #38bdf8; text-decoration: underline; font-weight: bold;\">VB-CABLE</a> for a dedicated virtual mic channel.<br><br>• <b>🎧 For OBS Studio</b>: Select any idle playback device (🎧) below and capture it via 'Audio Output Capture' in OBS."
  }
};

let currentLang = localStorage.getItem("dr_lang") || "zh-TW";

function t(key, vars = {}) {
  let str = (I18N[currentLang] && I18N[currentLang][key]) || I18N["zh-TW"][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return str;
}

// 系統混音 (喇叭 / OBS) 動態音量平衡預設值: -80 / 30 / -10 / 0 / -20 / 40
function defaultDspState() {
  return {
    eq: {
      enabled: false,
      bands: BAND_DEFINITIONS.map(b => ({
        freq: b.defaultFreq,
        gain_db: 0.0,
        q: b.defaultQ
      }))
    },
    boost: {
      enabled: false,
      noise_floor_db: -80.0,
      boost_db: 30.0,
      safe_min_db: -10.0,
      safe_max_db: 0.0,
      downward_cut_db: -20.0,
      loud_max_db: 40.0
    }
  };
}

// 麥克風動態音量平衡預設值: -55 / 10 / -35 / 0 / -20 / 40
function defaultMicState() {
  return {
    enabled: false,
    self_monitor: false,
    input_device: "__DEFAULT__",
    output_device: "__NONE__",
    output_volume: 1.0,
    hpf_enabled: false,
    hpf_cutoff_hz: 80.0,
    nr_enabled: false,
    nr_pre_gain: 1.0,
    nr_vad_thresh: 0.45,
    nr_wet_mix: 0.95,
    eq: {
      enabled: false,
      bands: BAND_DEFINITIONS.map(b => ({
        freq: b.defaultFreq,
        gain_db: 0.0,
        q: b.defaultQ
      }))
    },
    dyn_enabled: false,
    noise_floor_db: -55.0,
    upward_boost_db: 10.0,
    safe_min_db: -35.0,
    safe_max_db: 0.0,
    downward_cut_db: -20.0,
    loud_max_db: 40.0
  };
}

// 自動補齊舊版設定檔缺少的動態平衡欄位
function normalizeBoostObj(b) {
  const def = defaultDspState().boost;
  if (!b) return def;
  const nf = b.noise_floor_db ?? def.noise_floor_db;
  let smin = b.safe_min_db ?? def.safe_min_db;
  if (smin <= nf) smin = Math.min(nf + 10.0, -5.0);
  let smax = b.safe_max_db ?? def.safe_max_db;
  if (smax <= smin) smax = smin + 5.0;
  let lmax = b.loud_max_db ?? def.loud_max_db;
  if (lmax <= smax) lmax = smax + 15.0;
  const cutRaw = b.downward_cut_db ?? def.downward_cut_db;

  return {
    enabled: !!b.enabled,
    noise_floor_db: nf,
    boost_db: Math.abs(b.boost_db ?? def.boost_db),
    safe_min_db: smin,
    safe_max_db: smax,
    downward_cut_db: -Math.abs(cutRaw),
    loud_max_db: lmax
  };
}

function normalizeMicObj(m) {
  const def = defaultMicState();
  if (!m) return def;
  const nf = m.noise_floor_db ?? def.noise_floor_db;
  let smin = m.safe_min_db ?? def.safe_min_db;
  if (smin <= nf) smin = Math.min(nf + 10.0, -10.0);
  let smax = m.safe_max_db ?? def.safe_max_db;
  if (smax <= smin) smax = Math.max(0.0, smin + 5.0);
  let lmax = m.loud_max_db ?? def.loud_max_db;
  if (lmax <= smax) lmax = smax + 20.0;
  const cutRaw = m.downward_cut_db ?? def.downward_cut_db;

  return {
    ...def,
    ...m,
    eq: (m.eq && m.eq.bands) ? m.eq : def.eq,
    noise_floor_db: nf,
    upward_boost_db: Math.abs(m.upward_boost_db ?? def.upward_boost_db),
    safe_min_db: smin,
    safe_max_db: smax,
    downward_cut_db: -Math.abs(cutRaw),
    loud_max_db: lmax
  };
}

const LEGACY_STORAGE_KEY = "DR_AUDIO_ROUTER_STATE_V1";
let fullConfigCache = null;

let profileStore = {
  activeProfileId: "prof_1",
  profiles: {
    "prof_1": {
      name: "Profile 1",
      global: {
        mon_vol: 1.0,
        str_vol: 1.0,
        mon_muted: false,
        str_muted: false,
        panic_muted: false,
        mon_dsp: null,
        str_dsp: null
      },
      customized_apps: {},
      mic: defaultMicState()
    }
  }
};

let workingProfile = null;
let isDirty = false;
let checkTimer = null;
let toastTimer = null;
let autostartCooldown = false;
let isDefaultCollapsed = false;
let activeTab = "mixer";
let currentEqTarget = null;

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("dr_lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.innerHTML = t(key);
  });

  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    if (key) el.placeholder = t(key);
  });

  const langSel = document.getElementById("langSelect");
  if (langSel) langSel.value = lang;

  initProfileDropdown();
  setDirty(isDirty);
}

function showWarningToast(msg) {
  const toast = document.getElementById("toastWarn");
  if (!toast) return;
  toast.innerText = msg || t("toast_max_vol");
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2400);
}

// 格式化 dB 顯示字串
function formatDbStr(val, mode = "normal") {
  const num = Math.round(parseFloat(val) * 10) / 10;
  if (mode === "plus") {
    const p = Math.abs(num);
    return (p > 0 ? "+" : "") + p + " dB";
  } else if (mode === "minus") {
    const n = -Math.abs(num);
    return n + " dB";
  }
  return (num > 0 ? "+" : "") + num + " dB";
}

function parseRawDb(str) {
  if (typeof str !== "string") return NaN;
  const cleaned = str.replace(/dBFS|dB|%/gi, "").trim();
  return parseFloat(cleaned);
}

// 通用 6 格「動態音量平衡」輸入框防呆與綁定核心
function setupDynSixInputs(ids, getValidStateObj, onValidCommit) {
  const [floorId, boostId, sminId, smaxId, cutId, lmaxId] = ids;
  const els = ids.map(id => document.getElementById(id));
  if (els.some(e => !e)) return;

  const modes = ["normal", "plus", "normal", "normal", "minus", "normal"];
  const stateKeys = ["floor", "boost", "smin", "smax", "cut", "lmax"];

  els.forEach((inputEl, idx) => {
    inputEl.addEventListener("focus", () => {
      const curState = getValidStateObj();
      const rawNum = curState[stateKeys[idx]];
      inputEl.value = rawNum.toString();
      inputEl.select();
    });

    const commit = () => {
      const curState = getValidStateObj();
      const prevVal = curState[stateKeys[idx]];
      let parsed = parseRawDb(inputEl.value);

      if (isNaN(parsed)) {
        inputEl.value = formatDbStr(prevVal, modes[idx]);
        return;
      }

      if (parsed < -100 || parsed > 100) {
        inputEl.classList.add("input-error");
        showWarningToast(t("toast_dyn_range"));
        setTimeout(() => inputEl.classList.remove("input-error"), 400);
        inputEl.value = formatDbStr(prevVal, modes[idx]);
        return;
      }

      parsed = Math.round(parsed * 10) / 10;
      if (modes[idx] === "plus") parsed = Math.abs(parsed);
      if (modes[idx] === "minus") parsed = -Math.abs(parsed);

      const nextState = { ...curState, [stateKeys[idx]]: parsed };

      // 嚴格防呆檢查：過小聲遮蔽門檻 < 安全區下限 < 安全區上限 < 過大聲音量上限
      if (
        !(nextState.floor < nextState.smin &&
          nextState.smin < nextState.smax &&
          nextState.smax < nextState.lmax)
      ) {
        inputEl.classList.add("input-error");
        showWarningToast(t("toast_dyn_order"));
        setTimeout(() => inputEl.classList.remove("input-error"), 400);
        inputEl.value = formatDbStr(prevVal, modes[idx]);
        return;
      }

      inputEl.value = formatDbStr(parsed, modes[idx]);
      onValidCommit(nextState);
    };

    inputEl.addEventListener("blur", commit);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") inputEl.blur();
    });
  });
}

// 1. 從 Rust 後端讀取 config.json
async function initFullConfig() {
  try {
    fullConfigCache = await invoke("get_full_config");

    if (fullConfigCache && fullConfigCache.profiles && Object.keys(fullConfigCache.profiles).length > 0) {
      profileStore = {
        activeProfileId: fullConfigCache.activeProfileId || "prof_1",
        profiles: fullConfigCache.profiles
      };
      Object.keys(profileStore.profiles).forEach(k => {
        const p = profileStore.profiles[k];
        p.mic = normalizeMicObj(p.mic);
        if (p.global && p.global.mon_dsp) p.global.mon_dsp.boost = normalizeBoostObj(p.global.mon_dsp.boost);
        if (p.global && p.global.str_dsp) p.global.str_dsp.boost = normalizeBoostObj(p.global.str_dsp.boost);
        if (p.customized_apps) {
          Object.keys(p.customized_apps).forEach(appName => {
            const c = p.customized_apps[appName];
            if (c.mon_dsp) c.mon_dsp.boost = normalizeBoostObj(c.mon_dsp.boost);
            if (c.str_dsp) c.str_dsp.boost = normalizeBoostObj(c.str_dsp.boost);
          });
        }
      });
    } else {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          profileStore.profiles["prof_1"] = {
            name: "Profile 1",
            global: legacy.global || profileStore.profiles["prof_1"].global,
            customized_apps: legacy.customized_apps || {},
            mic: defaultMicState()
          };
        } catch (_) {}
      }
      await persistFullConfig();
    }
  } catch (e) {
    console.error("無法從後端讀取 config.json:", e);
  }

  if (!profileStore.profiles[profileStore.activeProfileId]) {
    profileStore.activeProfileId = Object.keys(profileStore.profiles)[0] || "prof_1";
  }

  workingProfile = JSON.parse(JSON.stringify(profileStore.profiles[profileStore.activeProfileId]));
  workingProfile.mic = normalizeMicObj(workingProfile.mic);
  setDirty(false);
}

// 2. 將當前設定持久化至 config.json
async function persistFullConfig() {
  try {
    if (!fullConfigCache) {
      fullConfigCache = await invoke("get_full_config");
    }
    fullConfigCache.activeProfileId = profileStore.activeProfileId;
    fullConfigCache.profiles = profileStore.profiles;
    await invoke("save_full_config", { config: fullConfigCache });
  } catch (e) {
    console.error("寫入 config.json 失敗:", e);
  }
}

function setDirty(dirty) {
  isDirty = dirty;
  const bulb = document.getElementById("profileBulb");
  const saveBtn = document.getElementById("saveProfileBtn");

  if (checkTimer) {
    clearTimeout(checkTimer);
    checkTimer = null;
  }

  if (dirty) {
    if (bulb) {
      bulb.className = "status-bulb bulb-orange";
      bulb.innerHTML = "";
    }
    if (saveBtn) {
      saveBtn.className = "save-profile-btn dirty";
      saveBtn.disabled = false;
      saveBtn.innerText = t("btn_save");
    }
  } else {
    if (bulb) {
      bulb.className = "status-bulb bulb-green";
      bulb.innerHTML = "";
    }
    if (saveBtn) {
      saveBtn.className = "save-profile-btn dimmed";
      saveBtn.disabled = true;
      saveBtn.innerText = t("btn_saved");
    }
  }
}

function triggerSavedAnimation() {
  const bulb = document.getElementById("profileBulb");
  if (bulb) {
    bulb.className = "bulb-check";
    bulb.innerHTML = "✓";
  }
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    if (!isDirty && bulb) {
      bulb.className = "status-bulb bulb-green";
      bulb.innerHTML = "";
    }
  }, 1200);
}

document.addEventListener("DOMContentLoaded", async () => {
  await initFullConfig();
  applyLanguage(currentLang);
  initEqModalDom();
  initMicPageDom();
  initGlobalControlsUI();
  initUIEventListeners();
  initFirstLoad();
  setInterval(syncRunningStatusAndAppendNew, 500);
  setInterval(pollActiveTabLevels, 100);
  setInterval(cleanupTransientOfflineCards, 60000);
});

function initProfileDropdown() {
  const select = document.getElementById("profileSelect");
  const delBtn = document.getElementById("deleteProfileBtn");
  if (!select) return;

  select.innerHTML = "";
  const ids = Object.keys(profileStore.profiles);

  ids.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.innerText = profileStore.profiles[id].name;
    if (id === profileStore.activeProfileId) opt.selected = true;
    select.appendChild(opt);
  });

  const newOpt = document.createElement("option");
  newOpt.value = "__NEW_PROFILE__";
  newOpt.innerText = t("new_profile_opt");
  select.appendChild(newOpt);

  if (delBtn) delBtn.disabled = (ids.length <= 1);
}

function initGlobalControlsUI() {
  const g = workingProfile.global;
  const monPercent = Math.round(g.mon_vol * 100);
  const strPercent = Math.round(g.str_vol * 100);

  const defMonVol = document.getElementById("defMonVol");
  const defMonVal = document.getElementById("defMonVal");
  const defMonMute = document.getElementById("defMonMute");
  const defStrVol = document.getElementById("defStrVol");
  const defStrVal = document.getElementById("defStrVal");
  const defStrMute = document.getElementById("defStrMute");

  if (defMonVol) defMonVol.value = Math.min(monPercent, 200);
  if (defMonVal) defMonVal.value = monPercent + "%";
  if (defMonMute) defMonMute.classList.toggle("muted", g.mon_muted);

  if (defStrVol) defStrVol.value = Math.min(strPercent, 200);
  if (defStrVal) defStrVal.value = strPercent + "%";
  if (defStrMute) defStrMute.classList.toggle("muted", g.str_muted);

  invoke("update_default_volumes", { monVol: g.mon_vol, strVol: g.str_vol });
  invoke("set_default_mute", { channel: "monitor", muted: g.mon_muted });
  invoke("set_default_mute", { channel: "stream", muted: g.str_muted });

  if (g.mon_dsp) invoke("update_app_dsp", { pid: 0, channel: "monitor", dsp: g.mon_dsp });
  if (g.str_dsp) invoke("update_app_dsp", { pid: 0, channel: "stream", dsp: g.str_dsp });

  updateEqButtonGlow(document.getElementById("defMonEq"), g.mon_dsp);
  updateEqButtonGlow(document.getElementById("defStrEq"), g.str_dsp);

  workingProfile.mic = normalizeMicObj(workingProfile.mic);
  invoke("update_mic_config", { config: workingProfile.mic });
  renderMicControlsFromState();
}

function updateEqButtonGlow(btn, dsp) {
  if (!btn) return;
  const isActive = dsp && (dsp.eq?.enabled || dsp.boost?.enabled);
  btn.classList.toggle("active", !!isActive);
}

// 取得目前彈窗編輯目標的 boost 物件
let modalWorkingBoost = defaultDspState().boost;

// 產生並綁定應用程式彈窗 7 段 EQ 與 6 格動態音量平衡輸入框
function initEqModalDom() {
  const wrapper = document.getElementById("eqBandsWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  BAND_DEFINITIONS.forEach((band, idx) => {
    const col = document.createElement("div");
    col.className = "eq-band-col";
    col.innerHTML = `
      <span class="band-tag" title="${band.role}">${band.name}</span>
      <input type="range" class="band-slider-v" id="eqGainSlider_${idx}" min="-12" max="12" step="0.5" value="0">
      <span class="band-gain-txt" id="eqGainTxt_${idx}">+0 dB</span>
      <input type="text" class="band-input-mini" id="eqFreqInput_${idx}" value="${band.defaultFreq}">
      <input type="text" class="band-input-mini" id="eqQInput_${idx}" value="${band.defaultQ}">
    `;
    wrapper.appendChild(col);

    const gainSlider = col.querySelector(`#eqGainSlider_${idx}`);
    const gainTxt = col.querySelector(`#eqGainTxt_${idx}`);
    const freqInput = col.querySelector(`#eqFreqInput_${idx}`);
    const qInput = col.querySelector(`#eqQInput_${idx}`);

    gainSlider.addEventListener("input", (e) => {
      const g = parseFloat(e.target.value);
      gainTxt.innerText = (g > 0 ? "+" : "") + g + " dB";
      applyEqChangeFromModal();
    });

    freqInput.addEventListener("blur", () => {
      let f = parseFloat(freqInput.value) || band.defaultFreq;
      f = Math.max(band.minFreq, Math.min(band.maxFreq, f));
      freqInput.value = Math.round(f);
      applyEqChangeFromModal();
    });

    qInput.addEventListener("blur", () => {
      let q = parseFloat(qInput.value) || band.defaultQ;
      q = Math.max(0.3, Math.min(5.0, q));
      qInput.value = q.toFixed(1);
      applyEqChangeFromModal();
    });
  });

  const eqToggle = document.getElementById("eqEnableToggle");
  if (eqToggle) eqToggle.addEventListener("change", applyEqChangeFromModal);

  const resetBtn = document.getElementById("eqResetFlatBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      BAND_DEFINITIONS.forEach((_, idx) => {
        const s = document.getElementById(`eqGainSlider_${idx}`);
        const txt = document.getElementById(`eqGainTxt_${idx}`);
        if (s) s.value = 0;
        if (txt) txt.innerText = "+0 dB";
      });
      applyEqChangeFromModal();
    });
  }

  const boostToggle = document.getElementById("boostEnableToggle");
  if (boostToggle) boostToggle.addEventListener("change", applyEqChangeFromModal);

  // 綁定彈窗內 6 格動態音量平衡輸入框
  setupDynSixInputs(
    ["spkDynFloorInput", "spkDynBoostInput", "spkDynSMinInput", "spkDynSMaxInput", "spkDynCutInput", "spkDynLMaxInput"],
    () => ({
      floor: modalWorkingBoost.noise_floor_db,
      boost: modalWorkingBoost.boost_db,
      smin: modalWorkingBoost.safe_min_db,
      smax: modalWorkingBoost.safe_max_db,
      cut: modalWorkingBoost.downward_cut_db,
      lmax: modalWorkingBoost.loud_max_db
    }),
    (next) => {
      modalWorkingBoost.noise_floor_db = next.floor;
      modalWorkingBoost.boost_db = next.boost;
      modalWorkingBoost.safe_min_db = next.smin;
      modalWorkingBoost.safe_max_db = next.smax;
      modalWorkingBoost.downward_cut_db = next.cut;
      modalWorkingBoost.loud_max_db = next.lmax;
      applyEqChangeFromModal();
    }
  );

  const confirmBtn = document.getElementById("confirmEqModalBtn");
  if (confirmBtn) confirmBtn.addEventListener("click", () => closeModal("eqModal"));
  const closeBtn = document.getElementById("closeEqModalBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("eqModal"));
}

// 點擊卡片 EQ 按鈕打開彈窗
function openEqModalForTarget(appName, channel, pid) {
  currentEqTarget = { appName, channel, pid };
  const title = document.getElementById("eqModalTitle");
  const channelLabel = channel === "monitor" ? t("channel_mon") : t("channel_str");
  if (title) title.innerText = `${appName} - ${channelLabel} ${t("eq_modal_suffix")}`;

  let targetDsp = null;
  if (appName === "預設 (全域基準)") {
    targetDsp = channel === "monitor" ? workingProfile.global.mon_dsp : workingProfile.global.str_dsp;
  } else {
    const custom = workingProfile.customized_apps[appName];
    if (custom) targetDsp = channel === "monitor" ? custom.mon_dsp : custom.str_dsp;
  }

  if (!targetDsp) targetDsp = defaultDspState();
  targetDsp.boost = normalizeBoostObj(targetDsp.boost);
  modalWorkingBoost = JSON.parse(JSON.stringify(targetDsp.boost));

  const eqToggle = document.getElementById("eqEnableToggle");
  if (eqToggle) eqToggle.checked = !!targetDsp.eq.enabled;

  targetDsp.eq.bands.forEach((b, idx) => {
    const s = document.getElementById(`eqGainSlider_${idx}`);
    const txt = document.getElementById(`eqGainTxt_${idx}`);
    const f = document.getElementById(`eqFreqInput_${idx}`);
    const q = document.getElementById(`eqQInput_${idx}`);
    if (s) s.value = b.gain_db;
    if (txt) txt.innerText = (b.gain_db > 0 ? "+" : "") + b.gain_db + " dB";
    if (f) f.value = Math.round(b.freq);
    if (q) q.value = b.q.toFixed(1);
  });

  const boostToggle = document.getElementById("boostEnableToggle");
  if (boostToggle) boostToggle.checked = !!modalWorkingBoost.enabled;

  const setInputVal = (id, val, mode) => {
    const el = document.getElementById(id);
    if (el) el.value = formatDbStr(val, mode);
  };

  setInputVal("spkDynFloorInput", modalWorkingBoost.noise_floor_db, "normal");
  setInputVal("spkDynBoostInput", modalWorkingBoost.boost_db, "plus");
  setInputVal("spkDynSMinInput", modalWorkingBoost.safe_min_db, "normal");
  setInputVal("spkDynSMaxInput", modalWorkingBoost.safe_max_db, "normal");
  setInputVal("spkDynCutInput", modalWorkingBoost.downward_cut_db, "minus");
  setInputVal("spkDynLMaxInput", modalWorkingBoost.loud_max_db, "normal");

  drawEqCanvas("eqCanvas", targetDsp.eq);
  openModal("eqModal");
}

function applyEqChangeFromModal() {
  if (!currentEqTarget) return;

  const eqToggle = document.getElementById("eqEnableToggle");
  const boostToggle = document.getElementById("boostEnableToggle");

  const bands = BAND_DEFINITIONS.map((b, idx) => {
    const s = document.getElementById(`eqGainSlider_${idx}`);
    const f = document.getElementById(`eqFreqInput_${idx}`);
    const q = document.getElementById(`eqQInput_${idx}`);
    return {
      freq: f ? parseFloat(f.value) || b.defaultFreq : b.defaultFreq,
      gain_db: s ? parseFloat(s.value) || 0.0 : 0.0,
      q: q ? parseFloat(q.value) || b.defaultQ : b.defaultQ
    };
  });

  modalWorkingBoost.enabled = boostToggle ? boostToggle.checked : false;

  const dspData = {
    eq: {
      enabled: eqToggle ? eqToggle.checked : false,
      bands: bands
    },
    boost: JSON.parse(JSON.stringify(modalWorkingBoost))
  };

  const { appName, channel, pid } = currentEqTarget;

  if (appName === "預設 (全域基準)") {
    if (channel === "monitor") workingProfile.global.mon_dsp = dspData;
    else workingProfile.global.str_dsp = dspData;
    invoke("update_app_dsp", { pid: 0, channel, dsp: dspData });

    const btn = channel === "monitor" ? document.getElementById("defMonEq") : document.getElementById("defStrEq");
    updateEqButtonGlow(btn, dspData);
  } else {
    if (!workingProfile.customized_apps[appName]) {
      workingProfile.customized_apps[appName] = {
        mon_vol: workingProfile.global.mon_vol,
        str_vol: workingProfile.global.str_vol,
        mon_muted: workingProfile.global.mon_muted,
        str_muted: workingProfile.global.str_muted,
        mon_dsp: null,
        str_dsp: null
      };
    }
    if (channel === "monitor") workingProfile.customized_apps[appName].mon_dsp = dspData;
    else workingProfile.customized_apps[appName].str_dsp = dspData;

    if (pid > 0) invoke("update_app_dsp", { pid, channel, dsp: dspData });

    const card = document.querySelector(`.dynamic-card[data-name="${appName}"]`);
    if (card) {
      card.classList.add("customized");
      const btn = card.querySelector(`[data-type="${channel === 'monitor' ? 'mon-eq' : 'str-eq'}"]`);
      updateEqButtonGlow(btn, dspData);
    }
  }

  setDirty(true);
  drawEqCanvas("eqCanvas", dspData.eq);
}

// 繪製對數座標 EQ 曲線圖 (20Hz ~ 20kHz, -12dB ~ +12dB)
function drawEqCanvas(canvasId, eqConfig) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  const dbLines = [12, 6, 0, -6, -12];
  ctx.fillStyle = "#64748b";
  ctx.font = "9px monospace";
  dbLines.forEach(db => {
    const y = h / 2 - (db / 12.0) * (h / 2 * 0.82);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText((db > 0 ? "+" : "") + db + "dB", 6, y - 3);
  });

  const hzTicks = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
  hzTicks.forEach(hz => {
    const x = w * (Math.log10(hz / 20) / Math.log10(20000 / 20));
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    const txt = hz >= 1000 ? (hz / 1000) + "k" : hz;
    ctx.fillText(txt, x - 8, h - 5);
  });

  if (!eqConfig || !eqConfig.enabled || !eqConfig.bands) {
    ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  const pointsCount = 140;
  for (let i = 0; i <= pointsCount; i++) {
    const ratio = i / pointsCount;
    const freq = 20 * Math.pow(20000 / 20, ratio);
    const x = ratio * w;

    let totalGain = 0;
    eqConfig.bands.forEach((b) => {
      if (Math.abs(b.gain_db) < 0.05) return;
      const fRatio = freq / b.freq;
      const q = Math.max(0.3, b.q);
      const bandGain = b.gain_db / (1 + Math.pow(q * (fRatio - 1 / fRatio), 2));
      totalGain += bandGain;
    });

    const y = h / 2 - (totalGain / 12.0) * (h / 2 * 0.82);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  eqConfig.bands.forEach((b) => {
    const ratio = Math.log10(b.freq / 20) / Math.log10(20000 / 20);
    const x = ratio * w;
    const y = h / 2 - (b.gain_db / 12.0) * (h / 2 * 0.82);

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

// === 麥克風頁面初始化與控制邏輯 ===
function initMicPageDom() {
  const wrapper = document.getElementById("micEqBandsWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  BAND_DEFINITIONS.forEach((band, idx) => {
    const col = document.createElement("div");
    col.className = "eq-band-col";
    col.innerHTML = `
      <span class="band-tag" title="${band.role}">${band.name}</span>
      <input type="range" class="band-slider-v" id="micEqGainSlider_${idx}" min="-12" max="12" step="0.5" value="0">
      <span class="band-gain-txt" id="micEqGainTxt_${idx}">+0 dB</span>
      <input type="text" class="band-input-mini" id="micEqFreqInput_${idx}" value="${band.defaultFreq}">
      <input type="text" class="band-input-mini" id="micEqQInput_${idx}" value="${band.defaultQ}">
    `;
    wrapper.appendChild(col);

    const gainSlider = col.querySelector(`#micEqGainSlider_${idx}`);
    const gainTxt = col.querySelector(`#micEqGainTxt_${idx}`);
    const freqInput = col.querySelector(`#micEqFreqInput_${idx}`);
    const qInput = col.querySelector(`#micEqQInput_${idx}`);

    gainSlider.addEventListener("input", (e) => {
      const g = parseFloat(e.target.value);
      gainTxt.innerText = (g > 0 ? "+" : "") + g + " dB";
      applyMicControlsToState();
    });

    freqInput.addEventListener("blur", () => {
      let f = parseFloat(freqInput.value) || band.defaultFreq;
      f = Math.max(band.minFreq, Math.min(band.maxFreq, f));
      freqInput.value = Math.round(f);
      applyMicControlsToState();
    });

    qInput.addEventListener("blur", () => {
      let q = parseFloat(qInput.value) || band.defaultQ;
      q = Math.max(0.3, Math.min(5.0, q));
      qInput.value = q.toFixed(1);
      applyMicControlsToState();
    });
  });

  const micResetBtn = document.getElementById("micEqResetFlatBtn");
  if (micResetBtn) {
    micResetBtn.addEventListener("click", () => {
      BAND_DEFINITIONS.forEach((_, idx) => {
        const s = document.getElementById(`micEqGainSlider_${idx}`);
        const txt = document.getElementById(`micEqGainTxt_${idx}`);
        if (s) s.value = 0;
        if (txt) txt.innerText = "+0 dB";
      });
      applyMicControlsToState();
    });
  }

  bindMicInput("micMasterEnable", "change");
  bindMicInput("micSelfMonBtn", "click_toggle");

  setupFaderPair("micOutVolSlider", "micOutVolVal", () => {
    applyMicControlsToState();
  });

  bindMicSliderWithLabel("micHpfSlider", "micHpfHzVal", " Hz", 1);
  bindMicInput("micHpfToggle", "change");

  bindMicInput("micNrToggle", "change");
  setupFaderPair("micNrPreGainSlider", "micNrPreGainVal", () => {
    applyMicControlsToState();
  });
  bindMicSliderWithLabel("micNrVadSlider", "micNrVadVal", "%", 1);
  bindMicSliderWithLabel("micNrSlider", "micNrWetVal", "%", 1);

  const openNnBtn = document.getElementById("openNnLicenseBtn");
  const closeNnBtn = document.getElementById("closeNnLicenseBtn");
  const confirmNnBtn = document.getElementById("confirmNnLicenseBtn");
  if (openNnBtn) openNnBtn.addEventListener("click", () => openModal("nnLicenseModal"));
  if (closeNnBtn) closeNnBtn.addEventListener("click", () => closeModal("nnLicenseModal"));
  if (confirmNnBtn) confirmNnBtn.addEventListener("click", () => closeModal("nnLicenseModal"));

  bindMicInput("micEqToggle", "change");
  bindMicInput("micDynToggle", "change");

  // 綁定麥克風第 4 關 6 格動態音量平衡輸入框
  setupDynSixInputs(
    ["micDynFloorInput", "micDynBoostInput", "micDynSMinInput", "micDynSMaxInput", "micDynCutInput", "micDynLMaxInput"],
    () => {
      const m = workingProfile.mic || defaultMicState();
      return {
        floor: m.noise_floor_db,
        boost: m.upward_boost_db,
        smin: m.safe_min_db,
        smax: m.safe_max_db,
        cut: m.downward_cut_db,
        lmax: m.loud_max_db
      };
    },
    (next) => {
      if (!workingProfile.mic) workingProfile.mic = defaultMicState();
      workingProfile.mic.noise_floor_db = next.floor;
      workingProfile.mic.upward_boost_db = next.boost;
      workingProfile.mic.safe_min_db = next.smin;
      workingProfile.mic.safe_max_db = next.smax;
      workingProfile.mic.downward_cut_db = next.cut;
      workingProfile.mic.loud_max_db = next.lmax;
      applyMicControlsToState();
    }
  );

  const openMicHelpBtn = document.getElementById("openMicTargetHelpBtn");
  const closeMicHelpBtn = document.getElementById("closeMicTargetHelpBtn");
  const confirmMicHelpBtn = document.getElementById("confirmMicTargetHelpBtn");
  if (openMicHelpBtn) openMicHelpBtn.addEventListener("click", () => openModal("micTargetHelpModal"));
  if (closeMicHelpBtn) closeMicHelpBtn.addEventListener("click", () => closeModal("micTargetHelpModal"));
  if (confirmMicHelpBtn) confirmMicHelpBtn.addEventListener("click", () => closeModal("micTargetHelpModal"));

  const inSel = document.getElementById("micInputSelect");
  const outSel = document.getElementById("micOutputSelect");
  if (inSel) {
    inSel.addEventListener("change", async () => {
      applyMicControlsToState();
      await populateMicDevices();
    });
  }
  if (outSel) outSel.addEventListener("change", applyMicControlsToState);
}

function bindMicInput(id, eventType) {
  const el = document.getElementById(id);
  if (!el) return;
  if (eventType === "click_toggle") {
    el.addEventListener("click", () => {
      el.classList.toggle("active");
      applyMicControlsToState();
    });
  } else {
    el.addEventListener(eventType, applyMicControlsToState);
  }
}

function bindMicSliderWithLabel(sliderId, labelId, suffix, multiplier, isPlus = false) {
  const s = document.getElementById(sliderId);
  const l = document.getElementById(labelId);
  if (!s || !l) return;
  s.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    l.innerText = (isPlus && val > 0 ? "+" : "") + val + suffix;
    applyMicControlsToState();
  });
}

function renderMicControlsFromState() {
  if (!workingProfile) return;
  workingProfile.mic = normalizeMicObj(workingProfile.mic);
  const m = workingProfile.mic;

  const masterToggle = document.getElementById("micMasterEnable");
  if (masterToggle) masterToggle.checked = !!m.enabled;

  const selfMonBtn = document.getElementById("micSelfMonBtn");
  if (selfMonBtn) selfMonBtn.classList.toggle("active", !!m.self_monitor);

  const outVolS = document.getElementById("micOutVolSlider");
  const outVolV = document.getElementById("micOutVolVal");
  if (outVolS && outVolV) {
    const pct = Math.round((m.output_volume ?? 1.0) * 100);
    outVolS.value = Math.min(pct, 200);
    outVolV.value = pct + "%";
  }

  const hpfToggle = document.getElementById("micHpfToggle");
  const hpfSlider = document.getElementById("micHpfSlider");
  const hpfVal = document.getElementById("micHpfHzVal");
  if (hpfToggle) hpfToggle.checked = !!m.hpf_enabled;
  if (hpfSlider && hpfVal) {
    hpfSlider.value = m.hpf_cutoff_hz ?? 80;
    hpfVal.innerText = Math.round(m.hpf_cutoff_hz ?? 80) + " Hz";
  }

  const nrToggle = document.getElementById("micNrToggle");
  const nrSub = document.getElementById("micNrSubControls");
  const nrPreS = document.getElementById("micNrPreGainSlider");
  const nrPreV = document.getElementById("micNrPreGainVal");
  const nrVadS = document.getElementById("micNrVadSlider");
  const nrVadV = document.getElementById("micNrVadVal");
  const nrSlider = document.getElementById("micNrSlider");
  const nrVal = document.getElementById("micNrWetVal");

  if (nrToggle) nrToggle.checked = !!m.nr_enabled;
  if (nrSub) nrSub.classList.toggle("hidden", !m.nr_enabled);

  if (nrPreS && nrPreV) {
    const prePct = Math.round((m.nr_pre_gain ?? 1.0) * 100);
    nrPreS.value = Math.min(prePct, 200);
    nrPreV.value = prePct + "%";
  }
  if (nrVadS && nrVadV) {
    const vadPct = Math.round((m.nr_vad_thresh ?? 0.45) * 100);
    nrVadS.value = vadPct;
    nrVadV.innerText = vadPct + "%";
  }
  if (nrSlider && nrVal) {
    const wetPct = Math.round((m.nr_wet_mix ?? 0.95) * 100);
    nrSlider.value = wetPct;
    nrVal.innerText = wetPct + "%";
  }

  const eqToggle = document.getElementById("micEqToggle");
  if (eqToggle) eqToggle.checked = !!m.eq.enabled;

  m.eq.bands.forEach((b, idx) => {
    const s = document.getElementById(`micEqGainSlider_${idx}`);
    const txt = document.getElementById(`micEqGainTxt_${idx}`);
    const f = document.getElementById(`micEqFreqInput_${idx}`);
    const q = document.getElementById(`micEqQInput_${idx}`);
    if (s) s.value = b.gain_db;
    if (txt) txt.innerText = (b.gain_db > 0 ? "+" : "") + b.gain_db + " dB";
    if (f) f.value = Math.round(b.freq);
    if (q) q.value = b.q.toFixed(1);
  });

  const dynToggle = document.getElementById("micDynToggle");
  if (dynToggle) dynToggle.checked = !!m.dyn_enabled;

  const setInputVal = (id, val, mode) => {
    const el = document.getElementById(id);
    if (el) el.value = formatDbStr(val, mode);
  };

  setInputVal("micDynFloorInput", m.noise_floor_db, "normal");
  setInputVal("micDynBoostInput", m.upward_boost_db, "plus");
  setInputVal("micDynSMinInput", m.safe_min_db, "normal");
  setInputVal("micDynSMaxInput", m.safe_max_db, "normal");
  setInputVal("micDynCutInput", m.downward_cut_db, "minus");
  setInputVal("micDynLMaxInput", m.loud_max_db, "normal");

  drawEqCanvas("micEqCanvas", m.eq);
}

function applyMicControlsToState() {
  if (!workingProfile) return;
  const masterToggle = document.getElementById("micMasterEnable");
  const selfMonBtn = document.getElementById("micSelfMonBtn");
  const outVolV = document.getElementById("micOutVolVal");
  const inSel = document.getElementById("micInputSelect");
  const outSel = document.getElementById("micOutputSelect");

  const hpfToggle = document.getElementById("micHpfToggle");
  const hpfSlider = document.getElementById("micHpfSlider");

  const nrToggle = document.getElementById("micNrToggle");
  const nrSub = document.getElementById("micNrSubControls");
  const nrPreV = document.getElementById("micNrPreGainVal");
  const nrVadS = document.getElementById("micNrVadSlider");
  const nrSlider = document.getElementById("micNrSlider");
  if (nrSub && nrToggle) {
    nrSub.classList.toggle("hidden", !nrToggle.checked);
  }

  const eqToggle = document.getElementById("micEqToggle");
  const dynToggle = document.getElementById("micDynToggle");

  const bands = BAND_DEFINITIONS.map((b, idx) => {
    const s = document.getElementById(`micEqGainSlider_${idx}`);
    const f = document.getElementById(`micEqFreqInput_${idx}`);
    const q = document.getElementById(`micEqQInput_${idx}`);
    return {
      freq: f ? parseFloat(f.value) || b.defaultFreq : b.defaultFreq,
      gain_db: s ? parseFloat(s.value) || 0.0 : 0.0,
      q: q ? parseFloat(q.value) || b.defaultQ : b.defaultQ
    };
  });

  const prevMic = normalizeMicObj(workingProfile.mic);

  workingProfile.mic = {
    enabled: masterToggle ? masterToggle.checked : false,
    self_monitor: selfMonBtn ? selfMonBtn.classList.contains("active") : false,
    input_device: (inSel && inSel.value) ? inSel.value : (prevMic.input_device || "__DEFAULT__"),
    output_device: (outSel && outSel.value) ? outSel.value : (prevMic.output_device || "__NONE__"),
    output_volume: outVolV ? (parseFloat(outVolV.value.replace("%", "")) || 0) / 100.0 : 1.0,

    hpf_enabled: hpfToggle ? hpfToggle.checked : false,
    hpf_cutoff_hz: hpfSlider ? parseFloat(hpfSlider.value) : 80.0,

    nr_enabled: nrToggle ? nrToggle.checked : false,
    nr_pre_gain: nrPreV ? (parseFloat(nrPreV.value.replace("%", "")) || 0) / 100.0 : 1.0,
    nr_vad_thresh: nrVadS ? parseFloat(nrVadS.value) / 100.0 : 0.45,
    nr_wet_mix: nrSlider ? parseFloat(nrSlider.value) / 100.0 : 0.95,

    eq: {
      enabled: eqToggle ? eqToggle.checked : false,
      bands: bands
    },

    dyn_enabled: dynToggle ? dynToggle.checked : false,
    noise_floor_db: prevMic.noise_floor_db,
    upward_boost_db: prevMic.upward_boost_db,
    safe_min_db: prevMic.safe_min_db,
    safe_max_db: prevMic.safe_max_db,
    downward_cut_db: prevMic.downward_cut_db,
    loud_max_db: prevMic.loud_max_db
  };

  invoke("update_mic_config", { config: workingProfile.mic });
  setDirty(true);
  drawEqCanvas("micEqCanvas", workingProfile.mic.eq);
}

// 智慧電平輪詢：視窗最小化/隱藏時 100% 停止；依當前分頁只更新看得到的那一頁
async function pollActiveTabLevels() {
  if (document.hidden) return;

  const dbToPercent = (db) => {
    if (db <= -65.0) return 0;
    if (db >= 0.0) return 100;
    return Math.round(((db + 65.0) / 65.0) * 100);
  };

  if (activeTab === "mixer") {
    try {
      const appLevels = await invoke("get_app_levels");
      document.querySelectorAll(".dynamic-card:not(.offline)").forEach(card => {
        const pid = parseInt(card.dataset.pid, 10);
        const fill = card.querySelector(".app-v-meter-fill");
        const dbTxt = card.querySelector(".app-v-meter-db");
        if (!fill || !dbTxt) return;

        const db = (pid > 0 && appLevels[pid] !== undefined) ? appLevels[pid] : -120.0;
        const pct = dbToPercent(db);
        fill.style.height = pct + "%";
        dbTxt.innerText = db <= -65.0 ? "-∞" : Math.round(db) + "dB";
      });
    } catch (_) {}
  } else if (activeTab === "mic") {
    if (!workingProfile || !workingProfile.mic || !workingProfile.mic.enabled) return;
    try {
      const levels = await invoke("get_mic_levels");
      const inFill = document.getElementById("micInMeterFill");
      const inVal = document.getElementById("micInMeterVal");
      const outFill = document.getElementById("micOutMeterFill");
      const outVal = document.getElementById("micOutMeterVal");
      const micTabBtn = document.getElementById("tabMicBtn");
      const conflictBanner = document.getElementById("micConflictBanner");

      if (micTabBtn) micTabBtn.classList.toggle("running", levels.is_running);
      if (conflictBanner) conflictBanner.classList.toggle("hidden", !levels.conflict_warning);

      if (inFill && inVal) {
        inFill.style.width = dbToPercent(levels.input_db) + "%";
        inVal.innerText = levels.input_db <= -65.0 ? "-∞ dB" : Math.round(levels.input_db) + " dB";
      }
      if (outFill && outVal) {
        outFill.style.width = dbToPercent(levels.output_db) + "%";
        outVal.innerText = levels.output_db <= -65.0 ? "-∞ dB" : Math.round(levels.output_db) + " dB";
      }
    } catch (_) {}
  }
}

// 每 1 分鐘自動清除「已離線」且「不在 customized_apps 記憶名單內」的臨時卡片
function cleanupTransientOfflineCards() {
  if (!workingProfile) return;
  document.querySelectorAll(".dynamic-card.offline").forEach(card => {
    const appName = card.dataset.name;
    const isSavedCustom = !!(workingProfile.customized_apps && workingProfile.customized_apps[appName]);
    if (!isSavedCustom) {
      card.remove();
    }
  });
}

function initUIEventListeners() {
  const tabMixerBtn = document.getElementById("tabMixerBtn");
  const tabMicBtn = document.getElementById("tabMicBtn");
  const mixerPage = document.getElementById("mixerPage");
  const micPage = document.getElementById("micPage");
  const searchWrapper = document.getElementById("searchWrapper");

  if (tabMixerBtn && tabMicBtn && mixerPage && micPage) {
    tabMixerBtn.addEventListener("click", () => {
      activeTab = "mixer";
      tabMixerBtn.classList.add("active");
      tabMicBtn.classList.remove("active");
      mixerPage.classList.remove("hidden");
      micPage.classList.add("hidden");
      if (searchWrapper) searchWrapper.style.visibility = "visible";
    });

    tabMicBtn.addEventListener("click", async () => {
      activeTab = "mic";
      tabMicBtn.classList.add("active");
      tabMixerBtn.classList.remove("active");
      mixerPage.classList.add("hidden");
      micPage.classList.remove("hidden");
      if (searchWrapper) searchWrapper.style.visibility = "hidden";

      await populateMicDevices();
      renderMicControlsFromState();
    });
  }

  const profileSel = document.getElementById("profileSelect");
  if (profileSel) {
    profileSel.addEventListener("change", async (e) => {
      const val = e.target.value;
      if (val === "__NEW_PROFILE__") {
        profileSel.value = profileStore.activeProfileId;
        openModal("newProfileModal");
        const input = document.getElementById("newProfileInput");
        if (input) {
          input.value = `Profile ${Object.keys(profileStore.profiles).length + 1}`;
          input.focus();
        }
        return;
      }

      profileStore.activeProfileId = val;
      workingProfile = JSON.parse(JSON.stringify(profileStore.profiles[val]));
      workingProfile.mic = normalizeMicObj(workingProfile.mic);
      setDirty(false);
      await persistFullConfig();

      initGlobalControlsUI();
      const apps = await invoke("get_current_apps");
      renderInitialLayout(apps);
    });
  }

  const renameBtn = document.getElementById("renameProfileBtn");
  if (renameBtn) {
    renameBtn.addEventListener("click", () => {
      openModal("renameModal");
      const input = document.getElementById("renameInput");
      if (input) {
        input.value = workingProfile.name;
        input.focus();
      }
    });
  }

  const confirmRenameBtn = document.getElementById("confirmRenameBtn");
  if (confirmRenameBtn) {
    confirmRenameBtn.addEventListener("click", async () => {
      const input = document.getElementById("renameInput");
      const newName = (input ? input.value : "").trim();
      if (newName) {
        workingProfile.name = newName;
        profileStore.profiles[profileStore.activeProfileId].name = newName;
        await persistFullConfig();
        initProfileDropdown();
      }
      closeModal("renameModal");
    });
  }
  bindModalClose("cancelRenameBtn", "closeRenameBtn", "renameModal");

  const confirmNewBtn = document.getElementById("confirmNewProfileBtn");
  if (confirmNewBtn) {
    confirmNewBtn.addEventListener("click", async () => {
      const input = document.getElementById("newProfileInput");
      const newName = (input ? input.value : "").trim() || "新設定檔";
      const newId = "prof_" + Date.now();

      profileStore.profiles[newId] = {
        name: newName,
        global: { ...workingProfile.global },
        customized_apps: {},
        mic: defaultMicState()
      };
      profileStore.activeProfileId = newId;
      workingProfile = JSON.parse(JSON.stringify(profileStore.profiles[newId]));

      await persistFullConfig();
      setDirty(false);
      initProfileDropdown();
      initGlobalControlsUI();

      closeModal("newProfileModal");
      const apps = await invoke("get_current_apps");
      renderInitialLayout(apps);
    });
  }
  bindModalClose("cancelNewProfileBtn", "closeNewProfileBtn", "newProfileModal");

  const delBtn = document.getElementById("deleteProfileBtn");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      const ids = Object.keys(profileStore.profiles);
      if (ids.length <= 1) return;

      delete profileStore.profiles[profileStore.activeProfileId];
      profileStore.activeProfileId = Object.keys(profileStore.profiles)[0];
      workingProfile = JSON.parse(JSON.stringify(profileStore.profiles[profileStore.activeProfileId]));

      await persistFullConfig();
      setDirty(false);
      initProfileDropdown();
      initGlobalControlsUI();

      const apps = await invoke("get_current_apps");
      renderInitialLayout(apps);
    });
  }

  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!isDirty) return;

      profileStore.profiles[profileStore.activeProfileId] = JSON.parse(JSON.stringify(workingProfile));
      await persistFullConfig();

      setDirty(false);
      triggerSavedAnimation();

      const apps = await invoke("get_current_apps");
      renderInitialLayout(apps);
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const filter = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".dynamic-card").forEach(card => {
        const name = (card.dataset.name || "").toLowerCase();
        const pid = (card.dataset.pid || "").toString();
        card.style.display = (name.includes(filter) || pid.includes(filter)) ? "flex" : "none";
      });
    });
  }

  const defFoldBtn = document.getElementById("defFoldBtn");
  const followersList = document.getElementById("defaultFollowersList");
  if (defFoldBtn && followersList) {
    defFoldBtn.addEventListener("click", () => {
      isDefaultCollapsed = !isDefaultCollapsed;
      defFoldBtn.classList.toggle("collapsed", isDefaultCollapsed);
      followersList.classList.toggle("collapsed", isDefaultCollapsed);
    });
  }

  const obsStatusBtn = document.getElementById("obsStatusBtn");
  if (obsStatusBtn) {
    obsStatusBtn.addEventListener("click", () => {
      navigator.clipboard.writeText("http://127.0.0.1:9876");
      const txt = document.getElementById("obsText");
      if (txt) {
        const old = txt.innerText;
        txt.innerText = t("obs_copied");
        setTimeout(() => { txt.innerText = old; }, 1500);
      }
    });
  }

  const defMonMute = document.getElementById("defMonMute");
  if (defMonMute) {
    defMonMute.addEventListener("click", () => {
      workingProfile.global.mon_muted = !workingProfile.global.mon_muted;
      defMonMute.classList.toggle("muted", workingProfile.global.mon_muted);
      invoke("set_default_mute", { channel: "monitor", muted: workingProfile.global.mon_muted });
      syncAllInheritedCards();
      setDirty(true);
    });
  }

  const defStrMute = document.getElementById("defStrMute");
  if (defStrMute) {
    defStrMute.addEventListener("click", () => {
      workingProfile.global.str_muted = !workingProfile.global.str_muted;
      defStrMute.classList.toggle("muted", workingProfile.global.str_muted);
      invoke("set_default_mute", { channel: "stream", muted: workingProfile.global.str_muted });
      syncAllInheritedCards();
      setDirty(true);
    });
  }

  setupFaderPair("defMonVol", "defMonVal", (percent) => {
    workingProfile.global.mon_vol = percent / 100.0;
    invoke("update_default_volumes", { monVol: workingProfile.global.mon_vol, strVol: workingProfile.global.str_vol });
    syncAllInheritedCards();
    setDirty(true);
  });

  setupFaderPair("defStrVol", "defStrVal", (percent) => {
    workingProfile.global.str_vol = percent / 100.0;
    invoke("update_default_volumes", { monVol: workingProfile.global.mon_vol, strVol: workingProfile.global.str_vol });
    syncAllInheritedCards();
    setDirty(true);
  });

  const defMonEq = document.getElementById("defMonEq");
  if (defMonEq) defMonEq.addEventListener("click", () => openEqModalForTarget("預設 (全域基準)", "monitor", 0));

  const defStrEq = document.getElementById("defStrEq");
  if (defStrEq) defStrEq.addEventListener("click", () => openEqModalForTarget("預設 (全域基準)", "stream", 0));

  const modal = document.getElementById("settingsModal");
  const openBtn = document.getElementById("openSettingsBtn");
  if (modal && openBtn) {
    openBtn.addEventListener("click", async () => {
      modal.classList.remove("hidden");
      const [devicesData, fullConfig, autostartActive] = await Promise.all([
        invoke("get_audio_devices"),
        invoke("get_full_config"),
        invoke("get_autostart_status")
      ]);
      fullConfigCache = fullConfig;
      populateDeviceModal(devicesData, fullConfig);

      const autostartCb = document.getElementById("autostartCheckbox");
      if (autostartCb) autostartCb.checked = autostartActive;
    });
  }

  const closeBtn = document.getElementById("closeSettingsBtn");
  if (modal && closeBtn) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", async () => {
      const blackholeSel = document.getElementById("blackholeSelect");
      const monitorSel = document.getElementById("monitorSelect");
      const portInput = document.getElementById("obsPortInput");
      const bufferSel = document.getElementById("bufferSizeSelect");

      if (!fullConfigCache) fullConfigCache = await invoke("get_full_config");

      fullConfigCache.blackholeDevice = blackholeSel ? blackholeSel.value : "__DEFAULT__";
      fullConfigCache.monitorDevice = monitorSel ? monitorSel.value : "Line (AG06/AG03)";
      fullConfigCache.obsPort = portInput ? parseInt(portInput.value, 10) || 9876 : 9876;
      fullConfigCache.bufferSize = bufferSel ? parseInt(bufferSel.value, 10) || 256 : 256;

      await invoke("save_full_config", { config: fullConfigCache });
      if (modal) modal.classList.add("hidden");
      await populateMicDevices();
    });
  }

  const autostartCb = document.getElementById("autostartCheckbox");
  const cooldownHint = document.getElementById("autostartCooldownHint");
  if (autostartCb) {
    autostartCb.addEventListener("change", async (e) => {
      if (autostartCooldown) return;
      autostartCooldown = true;
      autostartCb.disabled = true;
      if (cooldownHint) cooldownHint.classList.remove("hidden");

      const targetVal = e.target.checked;
      try {
        const ok = await invoke("set_autostart", { enable: targetVal });
        if (!ok) e.target.checked = !targetVal;
      } catch (err) {
        console.error("開機自啟設定失敗:", err);
        e.target.checked = !targetVal;
      }

      setTimeout(() => {
        autostartCooldown = false;
        autostartCb.disabled = false;
        if (cooldownHint) cooldownHint.classList.add("hidden");
      }, 1000);
    });
  }

  const closeConfirmModal = document.getElementById("closeConfirmModal");
  if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen("show-close-confirm", () => {
      if (closeConfirmModal) closeConfirmModal.classList.remove("hidden");
    });
  }

  const cancelCloseBtn = document.getElementById("cancelCloseBtn");
  if (cancelCloseBtn && closeConfirmModal) {
    cancelCloseBtn.addEventListener("click", () => closeConfirmModal.classList.add("hidden"));
  }

  const minimizeToTrayBtn = document.getElementById("minimizeToTrayBtn");
  if (minimizeToTrayBtn) {
    minimizeToTrayBtn.addEventListener("click", () => {
      if (closeConfirmModal) closeConfirmModal.classList.add("hidden");
      invoke("hide_window");
    });
  }

  const exitAppBtn = document.getElementById("exitAppBtn");
  if (exitAppBtn) {
    exitAppBtn.addEventListener("click", () => invoke("exit_app"));
  }

  const openHelpBtn = document.getElementById("openHelpBtn");
  const closeHelpBtn = document.getElementById("closeHelpBtn");
  const confirmHelpBtn = document.getElementById("confirmHelpBtn");
  if (openHelpBtn) openHelpBtn.addEventListener("click", () => openModal("helpModal"));
  if (closeHelpBtn) closeHelpBtn.addEventListener("click", () => closeModal("helpModal"));
  if (confirmHelpBtn) confirmHelpBtn.addEventListener("click", () => closeModal("helpModal"));
  
  const langSel = document.getElementById("langSelect");
  if (langSel) {
    langSel.value = currentLang;
    langSel.addEventListener("change", (e) => {
      applyLanguage(e.target.value);
    });
  }
}

async function populateMicDevices() {
  try {
    const [inData, outData, cfg] = await Promise.all([
      invoke("get_input_devices"),
      invoke("get_audio_devices"),
      invoke("get_full_config")
    ]);

    const inSel = document.getElementById("micInputSelect");
    const outSel = document.getElementById("micOutputSelect");
    if (!inSel || !outSel) return;

    const m = workingProfile.mic || defaultMicState();
    const curInVal = m.input_device || "__DEFAULT__";

    const isVirtualDevice = (name) => {
      const lower = name.toLowerCase();
      return lower.includes("cable") ||
             lower.includes("virtual") ||
             lower.includes("steam") ||
             lower.includes("voicemeeter") ||
             lower.includes("vaio") ||
             lower.includes("vac") ||
             lower.includes("vb-audio") ||
             lower.includes("sonar") ||
             lower.includes("wave link") ||
             lower.includes("screaming bee");
    };

    inSel.innerHTML = "";
    inSel.add(new Option("🎙️ " + t("system_default_dev"), "__DEFAULT__"));
    (inData.devices || []).forEach(d => {
      inSel.add(new Option("🎙️ " + d.name, d.name));
    });
    inSel.value = curInVal;

    outSel.innerHTML = "";
    outSel.add(new Option(t("mic_no_forward"), "__NONE__"));

    const virtualMicGroup = [];
    const readonlyMicGroup = [];
    const speakerGroup = [];

    (outData.devices || []).forEach(d => {
      const isBlackhole = (d.name === cfg.blackholeDevice);
      const isMonitor = (d.name === cfg.monitorDevice);
      const isVirt = isVirtualDevice(d.name);

      if (isVirt) {
        const opt = new Option(`🎙️ ${d.name} ${t("mic_virtual_bridge")}`, d.name);
        if (isBlackhole || isMonitor) {
          opt.text = `🎙️ ${d.name} ${t("mic_dev_conflict")}`;
          opt.disabled = true;
        }
        virtualMicGroup.push(opt);
      } else {
        const opt = new Option(`🎧 ${d.name}`, d.name);
        if (isBlackhole || isMonitor) {
          opt.text = `🎧 ${d.name} ${t("mic_dev_conflict")}`;
          opt.disabled = true;
        }
        speakerGroup.push(opt);
      }
    });

    (inData.devices || []).forEach(d => {
      if (isVirtualDevice(d.name)) {
        return;
      }
      const isSelectedSource = (d.name === curInVal);
      const labelSuffix = isSelectedSource ? t("mic_in_use_source") : t("mic_hw_readonly");
      const opt = new Option(`🎙️ ${d.name} ${labelSuffix}`, `__MIC_READONLY_${d.name}`);
      opt.disabled = true;
      readonlyMicGroup.push(opt);
    });

    virtualMicGroup.forEach(opt => outSel.add(opt));
    readonlyMicGroup.forEach(opt => outSel.add(opt));
    speakerGroup.forEach(opt => outSel.add(opt));

    if (m.output_device) {
      outSel.value = m.output_device;
      if (!outSel.value) outSel.value = "__NONE__";
    }
  } catch (e) {
    console.error("無法載入麥克風端點清單:", e);
  }
}

function setupFaderPair(sliderIdOrEl, inputIdOrEl, onChange) {
  const slider = typeof sliderIdOrEl === "string" ? document.getElementById(sliderIdOrEl) : sliderIdOrEl;
  const input = typeof inputIdOrEl === "string" ? document.getElementById(inputIdOrEl) : inputIdOrEl;
  if (!slider || !input) return;

  slider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    input.value = val + "%";
    onChange(val);
  });

  input.addEventListener("focus", () => {
    const raw = input.value.replace("%", "").trim();
    input.value = raw;
    input.select();
  });

  const commitManualInput = () => {
    const rawVal = parseInt(input.value.replace(/[^0-9]/g, ""), 10);
    const prevSliderVal = parseInt(slider.value, 10);

    if (isNaN(rawVal) || rawVal < 0) {
      input.value = prevSliderVal + "%";
      return;
    }

    if (rawVal > 500) {
      input.classList.add("input-error");
      showWarningToast(t("toast_max_vol"));
      setTimeout(() => input.classList.remove("input-error"), 400);
      input.value = prevSliderVal + "%";
      return;
    }

    input.value = rawVal + "%";
    slider.value = Math.min(rawVal, 200);
    onChange(rawVal);
  };

  input.addEventListener("blur", commitManualInput);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

function bindModalClose(btn1Id, btn2Id, modalId) {
  const b1 = document.getElementById(btn1Id);
  const b2 = document.getElementById(btn2Id);
  if (b1) b1.addEventListener("click", () => closeModal(modalId));
  if (b2) b2.addEventListener("click", () => closeModal(modalId));
}

function populateDeviceModal(devicesData, currentConfig) {
  const blackholeSel = document.getElementById("blackholeSelect");
  const monitorSel = document.getElementById("monitorSelect");
  const bufferSel = document.getElementById("bufferSizeSelect");
  const portInput = document.getElementById("obsPortInput");
  const blackholeHz = document.getElementById("blackholeHz");
  const monitorHz = document.getElementById("monitorHz");
  const hzWarning = document.getElementById("hzWarning");

  if (!blackholeSel || !monitorSel) return;

  blackholeSel.innerHTML = "";
  monitorSel.innerHTML = "";
  const devList = devicesData.devices || [];

  blackholeSel.add(new Option(t("system_default_dev"), "__DEFAULT__"));
  monitorSel.add(new Option(t("system_default_dev"), "__DEFAULT__"));

  devList.forEach(dev => {
    blackholeSel.add(new Option(dev.name, dev.name));
    monitorSel.add(new Option(dev.name, dev.name));
  });

  if (currentConfig) {
    if (currentConfig.blackholeDevice) blackholeSel.value = currentConfig.blackholeDevice;
    if (currentConfig.monitorDevice) monitorSel.value = currentConfig.monitorDevice;
    if (currentConfig.obsPort && portInput) portInput.value = currentConfig.obsPort;
    if (currentConfig.bufferSize && bufferSel) bufferSel.value = currentConfig.bufferSize.toString();
  }

  function updateHzDisplay() {
    const d1 = devList.find(d => d.name === blackholeSel.value);
    const d2 = devList.find(d => d.name === monitorSel.value);
    const hz1 = d1 ? d1.sample_rate : 44100;
    const hz2 = d2 ? d2.sample_rate : 44100;
    if (blackholeHz) blackholeHz.innerText = `${hz1.toLocaleString()} Hz / 24-bit`;
    if (monitorHz) monitorHz.innerText = `${hz2.toLocaleString()} Hz / 24-bit`;

    if (hzWarning) {
      if (blackholeSel.value !== "__DEFAULT__" && monitorSel.value !== "__DEFAULT__" && hz1 !== hz2) {
        hzWarning.classList.remove("hidden");
      } else {
        hzWarning.classList.add("hidden");
      }
    }
  }

  blackholeSel.onchange = updateHzDisplay;
  monitorSel.onchange = updateHzDisplay;
  updateHzDisplay();
}

function syncAllInheritedCards() {
  document.querySelectorAll(".dynamic-card:not(.customized)").forEach(card => {
    const appName = card.dataset.name;
    const pid = parseInt(card.dataset.pid, 10);

    if (!workingProfile.customized_apps[appName]) {
      const monSlider = card.querySelector('[data-type="mon-slider"]');
      const monInput = card.querySelector('[data-type="mon-input"]');
      const monMute = card.querySelector('[data-type="mon-mute"]');

      const strSlider = card.querySelector('[data-type="str-slider"]');
      const strInput = card.querySelector('[data-type="str-input"]');
      const strMute = card.querySelector('[data-type="str-mute"]');

      const mPercent = Math.round(workingProfile.global.mon_vol * 100);
      const sPercent = Math.round(workingProfile.global.str_vol * 100);

      if (monSlider) monSlider.value = Math.min(mPercent, 200);
      if (monInput) monInput.value = mPercent + "%";
      if (monMute) monMute.classList.toggle("muted", workingProfile.global.mon_muted);

      if (strSlider) strSlider.value = Math.min(sPercent, 200);
      if (strInput) strInput.value = sPercent + "%";
      if (strMute) strMute.classList.toggle("muted", workingProfile.global.str_muted);

      if (pid > 0) {
        invoke("update_app_channel", {
          pid: pid,
          monVol: workingProfile.global.mon_vol,
          strVol: workingProfile.global.str_vol,
          monMute: workingProfile.global.mon_muted,
          strMute: workingProfile.global.str_muted
        });
      }
    }
  });
}

async function initFirstLoad() {
  try {
    const apps = await invoke("get_current_apps");
    renderInitialLayout(apps);
  } catch (err) {
    console.error("無法取得軟體列表:", err);
  }
}

function renderInitialLayout(apps) {
  const followersContainer = document.getElementById("defaultFollowersList");
  const activeCustomContainer = document.getElementById("activeCustomizedList");
  const offlineContainer = document.getElementById("offlineCustomizedList");
  const offlineDivider = document.getElementById("offlineDivider");

  if (followersContainer) followersContainer.innerHTML = "";
  if (activeCustomContainer) activeCustomContainer.innerHTML = "";
  if (offlineContainer) offlineContainer.innerHTML = "";

  const activeNames = new Set(apps.map(a => a.name));
  let hasOfflineCustom = false;

  apps.forEach(app => {
    const isCustom = !!workingProfile.customized_apps[app.name];
    const card = buildCardElement(app, isCustom);

    if (isCustom && activeCustomContainer) {
      activeCustomContainer.appendChild(card);
      if (app.pid > 0) {
        const saved = workingProfile.customized_apps[app.name];
        invoke("update_app_channel", {
          pid: app.pid,
          monVol: saved.mon_vol,
          strVol: saved.str_vol,
          monMute: saved.mon_muted,
          strMute: saved.str_muted
        });
        if (saved.mon_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "monitor", dsp: saved.mon_dsp });
        if (saved.str_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "stream", dsp: saved.str_dsp });
      }
    } else if (followersContainer) {
      followersContainer.appendChild(card);
    }
  });

  Object.keys(workingProfile.customized_apps).forEach(savedName => {
    if (!activeNames.has(savedName)) {
      hasOfflineCustom = true;
      const fakeOfflineApp = {
        name: savedName,
        pid: 0,
        is_active: false,
        icon_base64: null,
        mon_vol: workingProfile.customized_apps[savedName].mon_vol,
        str_vol: workingProfile.customized_apps[savedName].str_vol,
        mon_muted: workingProfile.customized_apps[savedName].mon_muted,
        str_muted: workingProfile.customized_apps[savedName].str_muted
      };
      const card = buildCardElement(fakeOfflineApp, true);
      card.classList.add("offline");
      if (offlineContainer) offlineContainer.appendChild(card);
    }
  });

  if (offlineDivider) {
    if (hasOfflineCustom) offlineDivider.classList.remove("hidden");
    else offlineDivider.classList.add("hidden");
  }
}

function buildCardElement(app, isCustomized) {
  let monVol, strVol, monMuted, strMuted, monDsp, strDsp;

  if (isCustomized) {
    const record = workingProfile.customized_apps[app.name] || {
      mon_vol: app.mon_vol,
      str_vol: app.str_vol,
      mon_muted: app.mon_muted,
      str_muted: app.str_muted,
      mon_dsp: null,
      str_dsp: null
    };
    monVol = Math.round(record.mon_vol * 100);
    strVol = Math.round(record.str_vol * 100);
    monMuted = record.mon_muted;
    strMuted = record.str_muted;
    monDsp = record.mon_dsp;
    strDsp = record.str_dsp;
  } else {
    monVol = Math.round(workingProfile.global.mon_vol * 100);
    strVol = Math.round(workingProfile.global.str_vol * 100);
    monMuted = workingProfile.global.mon_muted;
    strMuted = workingProfile.global.str_muted;
    monDsp = workingProfile.global.mon_dsp;
    strDsp = workingProfile.global.str_dsp;
  }

  const card = document.createElement("div");
  card.id = `card-app-${app.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
  card.className = `card dynamic-card ${isCustomized ? 'customized' : ''}`;
  card.dataset.name = app.name;
  card.dataset.pid = app.pid.toString();

  const iconSrc = app.icon_base64 || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='38' height='38' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%231e2238'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='12' font-family='sans-serif'>🎮</text></svg>";

  card.innerHTML = `
    <div class="card-left">
      <div class="app-meter-slot">
        <div class="app-v-meter-wrap">
          <div class="app-v-meter-track">
            <div class="app-v-meter-fill"></div>
          </div>
          <span class="app-v-meter-db">-∞</span>
        </div>
        <span class="app-offline-dot" title="離線"></span>
      </div>
      <img src="${iconSrc}" class="app-icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'38\\' height=\\'38\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23334155\\'/></svg>'">
      <div class="app-info">
        <span class="app-name">${app.name}</span>
        <span class="app-sub">PID: ${app.pid || t("pid_offline")}</span>
      </div>
    </div>
    <div class="card-faders">
      <div class="fader-row">
        <button class="fader-btn mute-btn ${monMuted ? 'muted' : ''}" data-type="mon-mute" title="${t('mute_mon_tip')}">
          <span class="btn-icon">🎧</span>
        </button>
        <input type="range" class="fader-slider" min="0" max="200" value="${Math.min(monVol, 200)}" data-type="mon-slider">
        <input type="text" class="fader-input" value="${monVol}%" data-type="mon-input" title="點擊手動輸入 (0~500%)">
        <button class="fader-btn eq-btn" data-type="mon-eq" title="${t('eq_btn_tip')}">
          <svg viewBox="0 0 24 24" class="eq-icon"><path d="M3 17h2v3H3v-3zm0-14h2v11H3V3zm4 11h2v6H7v-6zm0-11h2v8H7V3zm4 4h2v13h-2V7zm0-4h2v2h-2V3zm4 7h2v10h-2V10zm0-7h2v4h-2V3zm4 12h2v5h-2v-5zm0-12h2v9h-2V3z"/></svg>
        </button>
      </div>
      <div class="fader-row">
        <button class="fader-btn mute-btn ${strMuted ? 'muted' : ''}" data-type="str-mute" title="${t('mute_str_tip')}">
          <span class="btn-icon">📶</span>
        </button>
        <input type="range" class="fader-slider" min="0" max="200" value="${Math.min(strVol, 200)}" data-type="str-slider">
        <input type="text" class="fader-input" value="${strVol}%" data-type="str-input" title="點擊手動輸入 (0~500%)">
        <button class="fader-btn eq-btn" data-type="str-eq" title="${t('eq_btn_tip')}">
          <svg viewBox="0 0 24 24" class="eq-icon"><path d="M3 17h2v3H3v-3zm0-14h2v11H3V3zm4 11h2v6H7v-6zm0-11h2v8H7V3zm4 4h2v13h-2V7zm0-4h2v2h-2V3zm4 7h2v10h-2V10zm0-7h2v4h-2V3zm4 12h2v5h-2v-5zm0-12h2v9h-2V3z"/></svg>
        </button>
      </div>
    </div>
    <div class="card-right-action">
      <button class="card-reset-btn" data-type="reset" title="${t('reset_tooltip')}">↺</button>
    </div>
  `;

  const monSlider = card.querySelector('[data-type="mon-slider"]');
  const monInput = card.querySelector('[data-type="mon-input"]');
  const monMuteBtn = card.querySelector('[data-type="mon-mute"]');
  const monEqBtn = card.querySelector('[data-type="mon-eq"]');

  const strSlider = card.querySelector('[data-type="str-slider"]');
  const strInput = card.querySelector('[data-type="str-input"]');
  const strMuteBtn = card.querySelector('[data-type="str-mute"]');
  const strEqBtn = card.querySelector('[data-type="str-eq"]');

  updateEqButtonGlow(monEqBtn, monDsp);
  updateEqButtonGlow(strEqBtn, strDsp);

  monEqBtn.addEventListener("click", () => {
    openEqModalForTarget(app.name, "monitor", parseInt(card.dataset.pid, 10));
  });

  strEqBtn.addEventListener("click", () => {
    openEqModalForTarget(app.name, "stream", parseInt(card.dataset.pid, 10));
  });

  const specializeCard = (mVal, sVal) => {
    const curMonVol = mVal !== undefined ? mVal / 100.0 : parseInt(monInput.value, 10) / 100.0;
    const curStrVol = sVal !== undefined ? sVal / 100.0 : parseInt(strInput.value, 10) / 100.0;
    const curMonMute = monMuteBtn.classList.contains("muted");
    const curStrMute = strMuteBtn.classList.contains("muted");

    const existing = workingProfile.customized_apps[app.name] || {};

    workingProfile.customized_apps[app.name] = {
      mon_vol: curMonVol,
      str_vol: curStrVol,
      mon_muted: curMonMute,
      str_muted: curStrMute,
      mon_dsp: existing.mon_dsp || null,
      str_dsp: existing.str_dsp || null
    };

    setDirty(true);
    card.classList.add("customized");

    const curPid = parseInt(card.dataset.pid, 10);
    if (curPid > 0) {
      invoke("update_app_channel", {
        pid: curPid,
        monVol: curMonVol,
        strVol: curStrVol,
        monMute: curMonMute,
        strMute: curStrMute
      });
    }
  };

  setupFaderPair(monSlider, monInput, (val) => specializeCard(val, undefined));
  setupFaderPair(strSlider, strInput, (val) => specializeCard(undefined, val));

  if (monMuteBtn) {
    monMuteBtn.addEventListener("click", () => {
      monMuteBtn.classList.toggle("muted");
      specializeCard();
    });
  }

  if (strMuteBtn) {
    strMuteBtn.addEventListener("click", () => {
      strMuteBtn.classList.toggle("muted");
      specializeCard();
    });
  }

  const resetBtn = card.querySelector('[data-type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      delete workingProfile.customized_apps[app.name];
      setDirty(true);

      card.classList.remove("customized");

      const mPercent = Math.round(workingProfile.global.mon_vol * 100);
      const sPercent = Math.round(workingProfile.global.str_vol * 100);

      if (monSlider) monSlider.value = Math.min(mPercent, 200);
      if (monInput) monInput.value = mPercent + "%";
      if (monMuteBtn) monMuteBtn.classList.toggle("muted", workingProfile.global.mon_muted);

      if (strSlider) strSlider.value = Math.min(sPercent, 200);
      if (strInput) strInput.value = sPercent + "%";
      if (strMuteBtn) strMuteBtn.classList.toggle("muted", workingProfile.global.str_muted);

      updateEqButtonGlow(monEqBtn, workingProfile.global.mon_dsp);
      updateEqButtonGlow(strEqBtn, workingProfile.global.str_dsp);

      const curPid = parseInt(card.dataset.pid, 10);
      if (curPid > 0) {
        invoke("reset_app_channel", { pid: curPid });
        invoke("update_app_channel", {
          pid: curPid,
          monVol: workingProfile.global.mon_vol,
          strVol: workingProfile.global.str_vol,
          monMute: workingProfile.global.mon_muted,
          strMute: workingProfile.global.str_muted
        });
      }
    });
  }

  return card;
}

async function syncRunningStatusAndAppendNew() {
  if (document.hidden) return;
  try {
    const apps = await invoke("get_current_apps");
    const activeMap = new Map(apps.map(a => [a.name, a]));

    const followersContainer = document.getElementById("defaultFollowersList");
    const activeCustomContainer = document.getElementById("activeCustomizedList");
    const offlineContainer = document.getElementById("offlineCustomizedList");
    const offlineDivider = document.getElementById("offlineDivider");

    document.querySelectorAll(".dynamic-card").forEach(card => {
      const appName = card.dataset.name;
      const prevPid = parseInt(card.dataset.pid, 10) || 0;
      const isRunning = activeMap.has(appName);
      const isCustom = !!(workingProfile.customized_apps && workingProfile.customized_apps[appName]);
      const pidSub = card.querySelector(".app-sub");

      card.classList.toggle("offline", !isRunning);

      if (isRunning) {
        const liveApp = activeMap.get(appName);
        const newPid = liveApp.pid;
        card.dataset.pid = newPid.toString();
        if (pidSub) pidSub.innerText = "PID: " + newPid;
        if (liveApp.icon_base64) {
          const img = card.querySelector(".app-icon");
          if (img && (!img.src || img.src.startsWith("data:image/svg"))) {
            img.src = liveApp.icon_base64;
          }
        }

        if (card.parentElement === offlineContainer) {
          if (isCustom && activeCustomContainer) {
            activeCustomContainer.appendChild(card);
          } else if (followersContainer) {
            followersContainer.appendChild(card);
          }
        }

        if (newPid > 0 && newPid !== prevPid) {
          const saved = workingProfile.customized_apps[appName];
          if (saved) {
            invoke("update_app_channel", {
              pid: newPid,
              monVol: saved.mon_vol,
              strVol: saved.str_vol,
              monMute: saved.mon_muted,
              strMute: saved.str_muted
            });
            if (saved.mon_dsp) invoke("update_app_dsp", { pid: newPid, channel: "monitor", dsp: saved.mon_dsp });
            if (saved.str_dsp) invoke("update_app_dsp", { pid: newPid, channel: "stream", dsp: saved.str_dsp });
          } else {
            if (workingProfile.global.mon_dsp) invoke("update_app_dsp", { pid: newPid, channel: "monitor", dsp: workingProfile.global.mon_dsp });
            if (workingProfile.global.str_dsp) invoke("update_app_dsp", { pid: newPid, channel: "stream", dsp: workingProfile.global.str_dsp });
          }
        }
      } else {
        card.dataset.pid = "0";
        if (pidSub) pidSub.innerText = "PID: " + t("pid_offline");

        if (isCustom && offlineContainer && card.parentElement !== offlineContainer) {
          offlineContainer.appendChild(card);
        }
      }
    });

    if (followersContainer) {
      apps.forEach(app => {
        const existingCard = document.querySelector(`.dynamic-card[data-name="${app.name}"]`);
        if (!existingCard) {
          const isCustom = !!(workingProfile.customized_apps && workingProfile.customized_apps[app.name]);
          const card = buildCardElement(app, isCustom);
          if (isCustom && activeCustomContainer) {
            activeCustomContainer.appendChild(card);
          } else {
            followersContainer.appendChild(card);
          }

          if (app.pid > 0) {
            const saved = workingProfile.customized_apps[app.name];
            if (saved) {
              if (saved.mon_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "monitor", dsp: saved.mon_dsp });
              if (saved.str_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "stream", dsp: saved.str_dsp });
            } else {
              if (workingProfile.global.mon_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "monitor", dsp: workingProfile.global.mon_dsp });
              if (workingProfile.global.str_dsp) invoke("update_app_dsp", { pid: app.pid, channel: "stream", dsp: workingProfile.global.str_dsp });
            }
          }
        }
      });
    }

    if (offlineDivider && offlineContainer) {
      const hasOfflineCards = offlineContainer.querySelectorAll(".dynamic-card").length > 0;
      offlineDivider.classList.toggle("hidden", !hasOfflineCards);
    }
  } catch (e) {}
}