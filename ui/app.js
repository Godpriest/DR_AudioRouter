// === 雙語系多國語言字典 ===
const I18N = {
  "zh-TW": {
    btn_save: "💾 儲存",
    btn_saved: "💾 已儲存",
    btn_done: "完成設定",
    btn_cancel: "取消",
    btn_got_it: "我知道了",
    search_ph: "搜尋軟體或 PID...",
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
    eq_modal_suffix: "等化器與細節增益",
    channel_mon: "耳機輸出",
    channel_str: "OBS 輸出",
    eq_enable: "啟用 7 段等化器 (EQ)",
    eq_reset: "重置平坦 (0 dB)",
    boost_enable: "啟用小聲音動態增益 (細節捕捉)",
    boost_noise_floor: "底噪遮蔽門檻",
    boost_ceiling: "大聲保護上限",
    boost_gain: "細節增強補償",
    boost_hint: "💡 作用原理：自動提升門檻與上限之間的微弱動態（如遠處腳步、木板踩踏、換彈匣聲音），越小聲補償越多，接近上限自動回歸原音保護耳朵。",
    help_title: "💡 音訊設定與說明",
    help_sec1_title: "1. Windows 預設播放裝置 需設為黑洞端點",
    help_sec1_desc: "請在 Windows 設定中，將「預設輸出裝置」改選為本軟體指定的黑洞端點。<br>這樣所有日常遊戲、影音與應用程式的聲音才會流入 DR_AudioRouter，由本軟體進行獨立混音、EQ 調校與 OBS 轉發。",
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
    pid_offline: "PID: 離線",
    reset_tooltip: "重置回到跟隨預設狀態",
    mute_mon_tip: "靜音耳機",
    mute_str_tip: "靜音 OBS",
    eq_btn_tip: "調整專屬等化器與細節增益"
  },
  "en": {
    btn_save: "💾 Save",
    btn_saved: "💾 Saved",
    btn_done: "Done",
    btn_cancel: "Cancel",
    btn_got_it: "Got It",
    search_ph: "Search application or PID...",
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
    eq_modal_suffix: "EQ & Detail Boost",
    channel_mon: "Headphones",
    channel_str: "OBS Stream",
    eq_enable: "Enable 7-Band Parametric EQ",
    eq_reset: "Reset Flat (0 dB)",
    boost_enable: "Enable Dynamic Detail Boost",
    boost_noise_floor: "Noise Floor Threshold",
    boost_ceiling: "Ceiling Protection",
    boost_gain: "Detail Boost Compensation",
    boost_hint: "💡 How it works: Dynamically amplifies subtle sounds (footsteps, reloads) between threshold and ceiling. Lower sounds receive more boost while louder sounds remain untouched.",
    help_title: "💡 Audio Setup & Guide",
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
    pid_offline: "PID: Offline",
    reset_tooltip: "Reset to inherit default settings",
    mute_mon_tip: "Mute Headphones",
    mute_str_tip: "Mute OBS",
    eq_btn_tip: "Adjust Parametric EQ & Detail Boost"
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

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("dr_lang", lang);

  // 1. 替換靜態標籤文字
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.innerHTML = t(key);
  });

  // 2. 替換 placeholder 屬性
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    if (key) el.placeholder = t(key);
  });

  // 3. 同步設定選單選中狀態
  const langSel = document.getElementById("langSelect");
  if (langSel) langSel.value = lang;

  // 4. 重整 Profile 下拉選單與卡片上的提示文字
  initProfileDropdown();
}

const { invoke } = window.__TAURI__.tauri;

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
      customized_apps: {}
    }
  }
};

let workingProfile = null;
let isDirty = false;
let checkTimer = null;
let toastTimer = null;
let autostartCooldown = false;
let isDefaultCollapsed = false;

// 7 段頻率邊界約束（防重疊保護）
const BAND_DEFINITIONS = [
  { defaultFreq: 60, minFreq: 20, maxFreq: 100, defaultQ: 0.7, name: "B1", role: "低架" },
  { defaultFreq: 150, minFreq: 100, maxFreq: 300, defaultQ: 1.0, name: "B2", role: "轟鳴" },
  { defaultFreq: 400, minFreq: 300, maxFreq: 800, defaultQ: 1.4, name: "B3", role: "踏地" },
  { defaultFreq: 1000, minFreq: 800, maxFreq: 2000, defaultQ: 1.4, name: "B4", role: "機關" },
  { defaultFreq: 2500, minFreq: 2000, maxFreq: 4500, defaultQ: 1.4, name: "B5", role: "腳步" },
  { defaultFreq: 6000, minFreq: 4500, maxFreq: 9000, defaultQ: 1.0, name: "B6", role: "碎物" },
  { defaultFreq: 12000, minFreq: 9000, maxFreq: 18000, defaultQ: 0.7, name: "B7", role: "高架" }
];

// 當前正在 EQ 彈窗編輯的目標音軌上下文
let currentEqTarget = null; // { appName: string, channel: 'monitor' | 'stream', pid: number }

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
      noise_floor_db: -55.0,
      ceiling_db: -20.0,
      boost_db: 8.0
    }
  };
}

function showWarningToast(msg) {
  const toast = document.getElementById("toastWarn");
  if (!toast) return;
  toast.innerText = msg || "⚠️ 音量上限為 500%，無法超出極限！";
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
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
    } else {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          profileStore.profiles["prof_1"] = {
            name: "Profile 1",
            global: legacy.global || profileStore.profiles["prof_1"].global,
            customized_apps: legacy.customized_apps || {}
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
      saveBtn.title = "有未儲存的變更，點擊儲存至 config.json 並重新整理";
    }
  } else {
    if (bulb) {
      bulb.className = "status-bulb bulb-green";
      bulb.innerHTML = "";
    }
    if (saveBtn) {
      saveBtn.className = "save-profile-btn dimmed";
      saveBtn.disabled = true;
      saveBtn.title = "目前設定已全數儲存至 config.json";
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
  initProfileDropdown();
  initGlobalControlsUI();
  initEqModalDom();
  initUIEventListeners();
  initFirstLoad();
  setInterval(syncRunningStatusAndAppendNew, 2000);
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
  newOpt.innerText = "➕ 新增設定檔...";
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

  // 同步預設 DSP 與發光狀態
  if (g.mon_dsp) {
    invoke("update_app_dsp", { pid: 0, channel: "monitor", dsp: g.mon_dsp });
  }
  if (g.str_dsp) {
    invoke("update_app_dsp", { pid: 0, channel: "stream", dsp: g.str_dsp });
  }
  updateEqButtonGlow(document.getElementById("defMonEq"), g.mon_dsp);
  updateEqButtonGlow(document.getElementById("defStrEq"), g.str_dsp);
}

function updateEqButtonGlow(btn, dsp) {
  if (!btn) return;
  const isActive = dsp && (dsp.eq?.enabled || dsp.boost?.enabled);
  btn.classList.toggle("active", !!isActive);
}

// 產生並綁定 7 段 EQ 的控制欄 DOM
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
      <input type="text" class="band-input-mini" id="eqFreqInput_${idx}" value="${band.defaultFreq}" title="頻率 Hz (${band.minFreq}~${band.maxFreq})">
      <input type="text" class="band-input-mini" id="eqQInput_${idx}" value="${band.defaultQ}" title="Q 帶寬 (0.3~5.0)">
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

  // EQ 開關與重置
  const eqToggle = document.getElementById("eqEnableToggle");
  if (eqToggle) eqToggle.addEventListener("change", applyEqChangeFromModal);

  const resetBtn = document.getElementById("eqResetFlatBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      BAND_DEFINITIONS.forEach((_, idx) => {
        const s = document.getElementById(`eqGainSlider_${idx}`);
        const t = document.getElementById(`eqGainTxt_${idx}`);
        if (s) s.value = 0;
        if (t) t.innerText = "+0 dB";
      });
      applyEqChangeFromModal();
    });
  }

  // 小聲音增益開關與推桿
  const boostToggle = document.getElementById("boostEnableToggle");
  if (boostToggle) boostToggle.addEventListener("change", applyEqChangeFromModal);

  bindBoostSlider("boostNoiseFloorSlider", "boostNoiseFloorVal", " dBFS");
  bindBoostSlider("boostCeilingSlider", "boostCeilingVal", " dBFS");
  bindBoostSlider("boostGainSlider", "boostGainVal", " dB", true);

  const confirmBtn = document.getElementById("confirmEqModalBtn");
  if (confirmBtn) confirmBtn.addEventListener("click", () => closeModal("eqModal"));
  const closeBtn = document.getElementById("closeEqModalBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("eqModal"));
}

function bindBoostSlider(sliderId, labelId, suffix, isPlus = false) {
  const s = document.getElementById(sliderId);
  const l = document.getElementById(labelId);
  if (s && l) {
    s.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      l.innerText = (isPlus && val > 0 ? "+" : "") + val + suffix;
      applyEqChangeFromModal();
    });
  }
}

// 點擊卡片上的 EQ 按鈕時打開彈窗
function openEqModalForTarget(appName, channel, pid) {
  currentEqTarget = { appName, channel, pid };
  const modal = document.getElementById("eqModal");
  const title = document.getElementById("eqModalTitle");

  const channelLabel = channel === "monitor" ? "耳機輸出" : "OBS 輸出";
  if (title) title.innerText = `${appName} - ${channelLabel} 等化器與細節增益`;

  // 取得目標的 DSP 物件（若無則套用預設）
  let targetDsp = null;
  if (appName === "預設 (全域基準)") {
    targetDsp = channel === "monitor" ? workingProfile.global.mon_dsp : workingProfile.global.str_dsp;
  } else {
    const custom = workingProfile.customized_apps[appName];
    if (custom) {
      targetDsp = channel === "monitor" ? custom.mon_dsp : custom.str_dsp;
    }
  }

  if (!targetDsp) {
    targetDsp = defaultDspState();
  }

  // 同步狀態至彈窗控制項
  const eqToggle = document.getElementById("eqEnableToggle");
  if (eqToggle) eqToggle.checked = !!targetDsp.eq.enabled;

  targetDsp.eq.bands.forEach((b, idx) => {
    const s = document.getElementById(`eqGainSlider_${idx}`);
    const t = document.getElementById(`eqGainTxt_${idx}`);
    const f = document.getElementById(`eqFreqInput_${idx}`);
    const q = document.getElementById(`eqQInput_${idx}`);

    if (s) s.value = b.gain_db;
    if (t) t.innerText = (b.gain_db > 0 ? "+" : "") + b.gain_db + " dB";
    if (f) f.value = Math.round(b.freq);
    if (q) q.value = b.q.toFixed(1);
  });

  const boostToggle = document.getElementById("boostEnableToggle");
  if (boostToggle) boostToggle.checked = !!targetDsp.boost.enabled;

  const floorS = document.getElementById("boostNoiseFloorSlider");
  const floorL = document.getElementById("boostNoiseFloorVal");
  if (floorS && floorL) {
    floorS.value = targetDsp.boost.noise_floor_db;
    floorL.innerText = targetDsp.boost.noise_floor_db + " dBFS";
  }

  const ceilS = document.getElementById("boostCeilingSlider");
  const ceilL = document.getElementById("boostCeilingVal");
  if (ceilS && ceilL) {
    ceilS.value = targetDsp.boost.ceiling_db;
    ceilL.innerText = targetDsp.boost.ceiling_db + " dBFS";
  }

  const gainS = document.getElementById("boostGainSlider");
  const gainL = document.getElementById("boostGainVal");
  if (gainS && gainL) {
    gainS.value = targetDsp.boost.boost_db;
    gainL.innerText = "+" + targetDsp.boost.boost_db + " dB";
  }

  drawEqCanvas(targetDsp);
  openModal("eqModal");
}

// 彈窗內部數值更動時：即時更新記憶體、發送 IPC 並更新曲線圖與按鈕發光
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

  const floorS = document.getElementById("boostNoiseFloorSlider");
  const ceilS = document.getElementById("boostCeilingSlider");
  const gainS = document.getElementById("boostGainSlider");

  const dspData = {
    eq: {
      enabled: eqToggle ? eqToggle.checked : false,
      bands: bands
    },
    boost: {
      enabled: boostToggle ? boostToggle.checked : false,
      noise_floor_db: floorS ? parseFloat(floorS.value) : -55.0,
      ceiling_db: ceilS ? parseFloat(ceilS.value) : -20.0,
      boost_db: gainS ? parseFloat(gainS.value) : 8.0
    }
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

    if (pid > 0) {
      invoke("update_app_dsp", { pid, channel, dsp: dspData });
    }

    const card = document.querySelector(`.dynamic-card[data-name="${appName}"]`);
    if (card) {
      card.classList.add("customized");
      const btn = card.querySelector(`[data-type="${channel === 'monitor' ? 'mon-eq' : 'str-eq'}"]`);
      updateEqButtonGlow(btn, dspData);
    }
  }

  setDirty(true);
  drawEqCanvas(dspData);
}

// 繪製對數座標 EQ 曲線圖 (20Hz ~ 20kHz, -12dB ~ +12dB)
function drawEqCanvas(dsp) {
  const canvas = document.getElementById("eqCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 背景網格
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  // 繪製 dB 參考線 (+12, +6, 0, -6, -12)
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

  // 繪製對數 Hz 參考線
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

  // 若未啟用，繪製灰平坦虛線
  if (!dsp.eq || !dsp.eq.enabled) {
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

  // 計算並繪製 7 級濾波器疊加響應曲線
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  const pointsCount = 140;
  for (let i = 0; i <= pointsCount; i++) {
    const ratio = i / pointsCount;
    const freq = 20 * Math.pow(20000 / 20, ratio);
    const x = ratio * w;

    let totalGain = 0;
    dsp.eq.bands.forEach((b) => {
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

  // 繪製 7 個節點彩色圓點
  dsp.eq.bands.forEach((b) => {
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

function initUIEventListeners() {
  // A. Profile 下拉切換
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
      setDirty(false);
      await persistFullConfig();

      initGlobalControlsUI();
      const apps = await invoke("get_current_apps");
      renderInitialLayout(apps);
    });
  }

  // B. 重新命名 Profile
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

  // C. 建立新 Profile
  const confirmNewBtn = document.getElementById("confirmNewProfileBtn");
  if (confirmNewBtn) {
    confirmNewBtn.addEventListener("click", async () => {
      const input = document.getElementById("newProfileInput");
      const newName = (input ? input.value : "").trim() || "新設定檔";
      const newId = "prof_" + Date.now();

      profileStore.profiles[newId] = {
        name: newName,
        global: { ...workingProfile.global },
        customized_apps: {}
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

  // D. 刪除 Profile
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

  // E. 💾 手動儲存按鈕
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

  // F. 搜尋篩選
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

  // G. 折疊跟隨預設
  const defFoldBtn = document.getElementById("defFoldBtn");
  const followersList = document.getElementById("defaultFollowersList");
  if (defFoldBtn && followersList) {
    defFoldBtn.addEventListener("click", () => {
      isDefaultCollapsed = !isDefaultCollapsed;
      defFoldBtn.classList.toggle("collapsed", isDefaultCollapsed);
      followersList.classList.toggle("collapsed", isDefaultCollapsed);
    });
  }

  // H. OBS 複製網址按鈕
  const obsStatusBtn = document.getElementById("obsStatusBtn");
  if (obsStatusBtn) {
    obsStatusBtn.addEventListener("click", () => {
      navigator.clipboard.writeText("http://127.0.0.1:9876");
      const txt = document.getElementById("obsText");
      if (txt) {
        const old = txt.innerText;
        txt.innerText = "已複製網址！";
        setTimeout(() => { txt.innerText = old; }, 1500);
      }
    });
  }

  // I. 預設全域靜音與 EQ 按鈕綁定
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

  // J. 齒輪設定彈窗
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
    });
  }

  // K. 開機自啟動 Checkbox
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

  // L. 關閉視窗確認對話框
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

  // 齒輪內淺黃色問號說明按鈕
  const openHelpBtn = document.getElementById("openHelpBtn");
  const closeHelpBtn = document.getElementById("closeHelpBtn");
  const confirmHelpBtn = document.getElementById("confirmHelpBtn");
  if (openHelpBtn) openHelpBtn.addEventListener("click", () => openModal("helpModal"));
  if (closeHelpBtn) closeHelpBtn.addEventListener("click", () => closeModal("helpModal"));
  if (confirmHelpBtn) confirmHelpBtn.addEventListener("click", () => closeModal("helpModal"));
  
  //語言切換
  const langSel = document.getElementById("langSelect");
  if (langSel) {
    langSel.value = currentLang;
    langSel.addEventListener("change", (e) => {
      applyLanguage(e.target.value);
    });
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
      showWarningToast("⚠️ 音量上限為 500%，無法超出極限！");
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

  blackholeSel.add(new Option("【跟隨系統預設】Windows 預設裝置", "__DEFAULT__"));
  monitorSel.add(new Option("【跟隨系統預設】Windows 預設裝置", "__DEFAULT__"));

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
      <span class="status-indicator ${app.is_active ? 'active' : ''}"></span>
      <img src="${iconSrc}" class="app-icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'38\\' height=\\'38\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23334155\\'/></svg>'">
      <div class="app-info">
        <span class="app-name">${app.name}</span>
        <span class="app-sub">PID: ${app.pid || '離線'}</span>
      </div>
    </div>
    <div class="card-faders">
      <div class="fader-row">
        <button class="fader-btn mute-btn ${monMuted ? 'muted' : ''}" data-type="mon-mute" title="靜音耳機">
          <span class="btn-icon">🎧</span>
        </button>
        <input type="range" class="fader-slider" min="0" max="200" value="${Math.min(monVol, 200)}" data-type="mon-slider">
        <input type="text" class="fader-input" value="${monVol}%" data-type="mon-input" title="點擊手動輸入 (0~500%)">
        <button class="fader-btn eq-btn" data-type="mon-eq" title="調整耳機專屬等化器與細節增益">
          <svg viewBox="0 0 24 24" class="eq-icon"><path d="M3 17h2v3H3v-3zm0-14h2v11H3V3zm4 11h2v6H7v-6zm0-11h2v8H7V3zm4 4h2v13h-2V7zm0-4h2v2h-2V3zm4 7h2v10h-2V10zm0-7h2v4h-2V3zm4 12h2v5h-2v-5zm0-12h2v9h-2V3z"/></svg>
        </button>
      </div>
      <div class="fader-row">
        <button class="fader-btn mute-btn ${strMuted ? 'muted' : ''}" data-type="str-mute" title="靜音 OBS">
          <span class="btn-icon">📶</span>
        </button>
        <input type="range" class="fader-slider" min="0" max="200" value="${Math.min(strVol, 200)}" data-type="str-slider">
        <input type="text" class="fader-input" value="${strVol}%" data-type="str-input" title="點擊手動輸入 (0~500%)">
        <button class="fader-btn eq-btn" data-type="str-eq" title="調整 OBS 專屬等化器與細節增益">
          <svg viewBox="0 0 24 24" class="eq-icon"><path d="M3 17h2v3H3v-3zm0-14h2v11H3V3zm4 11h2v6H7v-6zm0-11h2v8H7V3zm4 4h2v13h-2V7zm0-4h2v2h-2V3zm4 7h2v10h-2V10zm0-7h2v4h-2V3zm4 12h2v5h-2v-5zm0-12h2v9h-2V3z"/></svg>
        </button>
      </div>
    </div>
    <div class="card-right-action">
      <button class="card-reset-btn" data-type="reset" title="重置回到跟隨預設狀態">↺</button>
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
  try {
    const apps = await invoke("get_current_apps");
    const activeMap = new Map(apps.map(a => [a.name, a]));

    document.querySelectorAll(".dynamic-card").forEach(card => {
      const appName = card.dataset.name;
      const isRunning = activeMap.has(appName);
      const dot = card.querySelector(".status-indicator");
      const pidSub = card.querySelector(".app-sub");

      if (dot) dot.classList.toggle("active", isRunning);
      card.classList.toggle("offline", !isRunning);

      if (isRunning) {
        const liveApp = activeMap.get(appName);
        card.dataset.pid = liveApp.pid.toString();
        if (pidSub) pidSub.innerText = "PID: " + liveApp.pid;
        if (liveApp.icon_base64) {
          const img = card.querySelector(".app-icon");
          if (img && (!img.src || img.src.startsWith("data:image/svg"))) {
            img.src = liveApp.icon_base64;
          }
        }
      } else {
        if (pidSub) pidSub.innerText = "PID: 離線";
      }
    });

    const followersContainer = document.getElementById("defaultFollowersList");
    if (followersContainer) {
      apps.forEach(app => {
        const existingCard = document.querySelector(`.dynamic-card[data-name="${app.name}"]`);
        if (!existingCard) {
          const isCustom = !!workingProfile.customized_apps[app.name];
          const card = buildCardElement(app, isCustom);
          followersContainer.appendChild(card);
        }
      });
    }
  } catch (e) {}
}