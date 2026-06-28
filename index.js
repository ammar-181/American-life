// ============================================================
// American Life — Veli İletişim — script.js
// ============================================================

const SUPABASE_URL = "https://glgdrymnefndxrzsejnp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZ2RyeW1uZWZuZHhyenNlam5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjYyMTEsImV4cCI6MjA5NzEwMjIxMX0.5T_3a29gtb37yfx1_pBuyb0roi9ZJKSWAdM_lR6Q4o0";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REGIONS_KEY = "americanLifeRegions_v1";
const SCHEDULE_KEY = "americanLifeSchedule_v1";

const defaultRegions = {
  Atakum: { telegram: "https://t.me/+BFwaPdYjN1EyZWI0", resourceImage: "" },
  "İlkadım": { telegram: "https://t.me/+ZO2aqbj3UgswZTRk", resourceImage: "" }
};

function loadRegions() {
  try {
    const raw = localStorage.getItem(REGIONS_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultRegions));
    const parsed = JSON.parse(raw);
    ["Atakum", "İlkadım"].forEach(r => {
      if (!parsed[r]) parsed[r] = { telegram: "", resourceImage: "" };
    });
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultRegions));
  }
}

function saveRegions() {
  try {
    localStorage.setItem(REGIONS_KEY, JSON.stringify(appData.regions));
  } catch (e) {
    console.warn("Could not save region data:", e);
  }
}

let classes = [];
let activeClassId = null;
let appData = { regions: loadRegions() };
let selected = new Map();
let editingClassId = null;
let activeRegionFilter = "all";
let modalSelectedRegion = "Atakum";
let isLoading = true;
let loadError = null;

function makeDefaultLessonNumbers() {
  const nums = [];
  for (let i = 1; i <= 30; i++) nums.push(i);
  return nums;
}

function getInitials(name) {
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatPhone(phone) {
  if (!phone) return "";
  if (phone.startsWith("90")) return "0" + phone.slice(2);
  return phone;
}

function normalizePhone(raw) {
  let p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "90" + p.slice(1);
  if (!p.startsWith("90")) p = "90" + p;
  return p;
}

function formatTimeRange(start, end) {
  const trim = t => (t || "").slice(0, 5);
  if (!start && !end) return "";
  return `${trim(start)} – ${trim(end)}`;
}

function loadSchedule() {
  try {
    const data = localStorage.getItem(SCHEDULE_KEY);
    if (data) {
      const img = document.getElementById("schedulePreview");
      const container = document.getElementById("schedulePreviewContainer");
      const status = document.getElementById("scheduleStatus");
      if (img && container) {
        img.src = data;
        container.style.display = "block";
        if (status) status.textContent = "Program yüklendi ✓";
      }
    }
  } catch (e) {
    console.warn("Could not load schedule:", e);
  }
}

function handleScheduleUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    try {
      localStorage.setItem(SCHEDULE_KEY, dataUrl);
    } catch (err) {
      alert("Görsel çok büyük. Lütfen daha küçük bir dosya seçin.");
      return;
    }
    const img = document.getElementById("schedulePreview");
    const container = document.getElementById("schedulePreviewContainer");
    const status = document.getElementById("scheduleStatus");
    if (img && container) {
      img.src = dataUrl;
      container.style.display = "block";
      if (status) status.textContent = "Program yüklendi ✓";
    }
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function openResources() {
  document.getElementById("resourcesBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
  updateResourcesUI();
  loadSchedule();
}

function closeResources() {
  document.getElementById("resourcesBackdrop").classList.remove("open");
  document.body.style.overflow = "";
}

function closeResourcesOnBackdrop(e) {
  if (e.target.id === "resourcesBackdrop") closeResources();
}

function updateResourcesUI() {
  const regions = appData.regions;
  const atakumSub = document.getElementById("atakumSub");
  const atakumImg = document.getElementById("atakumImage");
  if (!atakumSub || !atakumImg) return;

  const atakumLink = (regions.Atakum || {}).telegram || "";
  atakumSub.innerHTML = atakumLink ? 'Telegram grubu <i class="fa-solid fa-check" style="color:var(--green);"></i>' : "Telegram grubu (ekle)";
  if (regions.Atakum && regions.Atakum.resourceImage) {
    atakumImg.src = regions.Atakum.resourceImage;
    atakumImg.style.display = "block";
  } else {
    atakumImg.style.display = "none";
  }

  const ilkadimSub = document.getElementById("ilkadimSub");
  const ilkadimImg = document.getElementById("ilkadimImage");
  const ilkadimLink = (regions["İlkadım"] || {}).telegram || "";
  ilkadimSub.innerHTML = ilkadimLink ? 'Telegram grubu <i class="fa-solid fa-check" style="color:var(--green);"></i>' : "Telegram grubu (ekle)";
  if (regions["İlkadım"] && regions["İlkadım"].resourceImage) {
    ilkadimImg.src = regions["İlkadım"].resourceImage;
    ilkadimImg.style.display = "block";
  } else {
    ilkadimImg.style.display = "none";
  }
}

function openRegionLink(region) {
  const link = (appData.regions[region] || {}).telegram || "";
  if (link) {
    window.open(link, "_blank");
  } else {
    const newLink = prompt(`${region} için Telegram grup linkini girin:`, "https://t.me/...");
    if (newLink && newLink.trim()) {
      appData.regions[region].telegram = newLink.trim();
      saveRegions();
      updateResourcesUI();
      renderApp();
    }
  }
}

function triggerImageUpload(region) {
  const fileInput = document.getElementById(region === "Atakum" ? "fileAtakum" : "fileIlkadim");
  if (fileInput) fileInput.click();
}

function handleImageUpload(region, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    appData.regions[region].resourceImage = dataUrl;
    saveRegions();
    updateResourcesUI();
    const img = document.getElementById(region === "Atakum" ? "atakumImage" : "ilkadimImage");
    if (img) {
      img.src = dataUrl;
      img.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
  input.value = "";
}

async function fetchAllData() {
  isLoading = true;
  loadError = null;
  renderLoadingState();

  try {
    const { data: classRows, error: classErr } = await sb
      .from("classes")
      .select("*")
      .order("created_at", { ascending: true });
    if (classErr) throw classErr;

    const { data: studentRows, error: studentErr } = await sb
      .from("students")
      .select("*")
      .order("created_at", { ascending: true });
    if (studentErr) throw studentErr;

    const { data: lessonRows, error: lessonErr } = await sb
      .from("lessons")
      .select("*")
      .order("number", { ascending: true });
    if (lessonErr) throw lessonErr;

    classes = (classRows || []).map(c => ({
      ...c,
      note: "",
      students: (studentRows || []).filter(s => s.class_id === c.id),
      lessons: (lessonRows || []).filter(l => l.class_id === c.id)
    }));

    if (classes.length && !classes.some(c => c.id === activeClassId)) {
      activeClassId = classes[0].id;
    }

    isLoading = false;
    render();
  } catch (err) {
    console.error("Supabase fetch error:", err);
    isLoading = false;
    loadError = err.message || "Veriler yüklenirken bir hata oluştu.";
    renderErrorState();
  }
}

async function createClassInDb(name, branch, days, timeStart, timeEnd, students) {
  const { data: classRow, error: classErr } = await sb
    .from("classes")
    .insert({ name, branch, days, time_start: timeStart || null, time_end: timeEnd || null })
    .select()
    .single();
  if (classErr) throw classErr;

  const newClassId = classRow.id;

  if (students.length) {
    const studentPayload = students.map(s => ({ class_id: newClassId, name: s.name, phone: s.phone }));
    const { error: studentErr } = await sb.from("students").insert(studentPayload);
    if (studentErr) throw studentErr;
  }

  const lessonPayload = makeDefaultLessonNumbers().map(n => ({
    class_id: newClassId, number: n, is_complete: false, notes: ""
  }));
  const { error: lessonErr } = await sb.from("lessons").insert(lessonPayload);
  if (lessonErr) throw lessonErr;

  return newClassId;
}

async function updateClassInDb(classId, name, branch, days, timeStart, timeEnd, students) {
  const { error: classErr } = await sb
    .from("classes")
    .update({ name, branch, days, time_start: timeStart || null, time_end: timeEnd || null })
    .eq("id", classId);
  if (classErr) throw classErr;

  const { error: delErr } = await sb.from("students").delete().eq("class_id", classId);
  if (delErr) throw delErr;

  if (students.length) {
    const studentPayload = students.map(s => ({ class_id: classId, name: s.name, phone: s.phone }));
    const { error: insErr } = await sb.from("students").insert(studentPayload);
    if (insErr) throw insErr;
  }
}

async function deleteClassInDb(classId) {
  await sb.from("students").delete().eq("class_id", classId);
  await sb.from("lessons").delete().eq("class_id", classId);
  const { error } = await sb.from("classes").delete().eq("id", classId);
  if (error) throw error;
}

async function toggleLessonInDb(lessonId, newValue) {
  const { error } = await sb.from("lessons").update({ is_complete: newValue }).eq("id", lessonId);
  if (error) throw error;
}

async function updateLessonNoteInDb(lessonId, notes) {
  const { error } = await sb.from("lessons").update({ notes }).eq("id", lessonId);
  if (error) throw error;
}

function renderLoadingState() {
  const root = document.getElementById("appRoot");
  if (!root) return;
  root.innerHTML = `
    <div class="panel" style="grid-column: 1 / -1; text-align:center; padding: 30px 16px;">
      <div style="font-size:24px; margin-bottom:8px; color:var(--gold);"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <div style="color:var(--slate); font-size:13px;">Veriler yükleniyor...</div>
    </div>
  `;
}

function renderErrorState() {
  const root = document.getElementById("appRoot");
  if (!root) return;
  root.innerHTML = `
    <div class="panel" style="grid-column: 1 / -1; text-align:center; padding: 24px 16px;">
      <div style="font-size:24px; margin-bottom:8px; color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div style="color:#E74C3C; font-weight:600; font-size:13px; margin-bottom:4px;">Bağlantı hatası</div>
      <div style="color:var(--slate); font-size:12px; margin-bottom:12px;">${loadError}</div>
      <button class="modal-btn primary" style="display:inline-block; padding:8px 16px; font-size:13px;" onclick="fetchAllData()">Tekrar Dene</button>
    </div>
  `;
}

function render() {
  renderTabs();
  renderApp();
}

function renderTabs() {
  const filterBar = document.getElementById("regionFilterBar");
  if (filterBar) {
    filterBar.querySelectorAll(".region-filter-btn").forEach(b => b.remove());
    ["all", "Atakum", "İlkadım"].forEach(r => {
      const b = document.createElement("button");
      b.className = "region-filter-btn" + (activeRegionFilter === r ? " active" : "");
      b.textContent = r === "all" ? "Tümü" : r;
      b.onclick = () => {
        activeRegionFilter = r;
        const visible = classes.filter(c => r === "all" || c.branch === r);
        if (visible.length && !visible.some(c => c.id === activeClassId)) {
          activeClassId = visible[0].id;
          selected = new Map();
        }
        render();
      };
      filterBar.appendChild(b);
    });
  }

  const bar = document.getElementById("classBar");
  const addBtn = document.getElementById("addClassBtn");
  bar.querySelectorAll(".class-tab").forEach(t => t.remove());
  const visibleClasses = classes.filter(c => activeRegionFilter === "all" || c.branch === activeRegionFilter);
  visibleClasses.forEach(cls => {
    const tab = document.createElement("div");
    tab.className = "class-tab" + (cls.id === activeClassId ? " active" : "");
    tab.innerHTML = `<span class="tab-dot"></span>${cls.name}`;
    tab.onclick = () => {
      activeClassId = cls.id;
      selected = new Map();
      render();
    };
    bar.insertBefore(tab, addBtn);
  });
}

function renderApp() {
  const root = document.getElementById("appRoot");

  if (isLoading) { renderLoadingState(); return; }
  if (loadError) { renderErrorState(); return; }

  const cls = classes.find(c => c.id === activeClassId);
  if (!cls) {
    root.innerHTML = `
      <div class="panel" style="grid-column: 1 / -1; text-align:center; padding: 24px 16px; color:var(--slate); font-size:13px;">
        Henüz sınıf eklenmedi. Üstteki "+" butonuna dokunarak ilk sınıfınızı oluşturun.
      </div>
    `;
    return;
  }

  const prevNoteEl = document.getElementById("extraNote");
  const prevNote = prevNoteEl ? prevNoteEl.value : (cls.note || "");
  cls.note = prevNote;
  root.innerHTML = "";
  const regions = appData.regions;

  const infoBar = make("div", "class-info-bar");
  infoBar.style.gridColumn = "1 / -1";
  infoBar.innerHTML = `
    <div class="info-chips">
      <div class="info-chip"><i class="fa-solid fa-book-open"></i> ${cls.name}</div>
      <div class="info-chip"><i class="fa-solid fa-location-dot"></i> ${cls.branch || "Atakum"}</div>
      <div class="info-chip"><i class="fa-solid fa-calendar-days"></i> ${cls.days || ""}</div>
      <div class="info-chip"><i class="fa-solid fa-clock"></i> ${formatTimeRange(cls.time_start, cls.time_end)}</div>
    </div>
    <button class="edit-class-btn" onclick="openModal('${cls.id}')"><i class="fa-solid fa-pen"></i> Düzenle</button>
  `;
  root.appendChild(infoBar);

  const sPanel = make("div", "panel");
  const ph = make("div", "panel-header");
  const pt = make("div", "panel-title");
  pt.textContent = "Öğrenciler";
  const sc = make("div", "selected-count");
  sc.id = "selectedCount";
  sc.style.display = selected.size > 0 ? "inline" : "none";
  sc.textContent = selected.size + " seçili";
  ph.appendChild(pt);
  ph.appendChild(sc);
  sPanel.appendChild(ph);

  const sg = make("div", "students-grid");
  sg.id = "studentsGrid";

  if (!cls.students.length) {
    const empty = make("div", "");
    empty.style.cssText = "text-align:center; color:var(--slate); font-size:12px; padding:10px;";
    empty.textContent = "Bu sınıfta öğrenci yok. Düzenle ile ekleyebilirsiniz.";
    sg.appendChild(empty);
  }

  cls.students.forEach((s, i) => {
    const entry = selected.get(i);
    const card = make("div", "student-card");
    if (entry) { card.classList.add("selected"); card.classList.add("has-status"); }
    card.innerHTML = `
      <div class="student-avatar">${getInitials(s.name)}</div>
      <div class="student-info">
        <div class="student-name">${s.name}</div>
        <div class="student-phone">${formatPhone(s.phone)}</div>
      </div>
      <div class="check-mark"><i class="fa-solid fa-check"></i></div>
    `;
    card.addEventListener("click", () => toggleStudent(i, card));
    sg.appendChild(card);

    if (entry) {
      const statusBox = make("div", "student-status");
      statusBox.innerHTML = `
        <div class="status-row">
          <button class="status-btn ${entry.status === 'absent' ? 'active' : ''}" data-s="absent" onclick="event.stopPropagation(); setStudentStatus(${i},'absent')">
            <span class="btn-icon"><i class="fa-solid fa-xmark"></i></span>Yok
          </button>
          <button class="status-btn ${entry.status === 'late' ? 'active' : ''}" data-s="late" onclick="event.stopPropagation(); setStudentStatus(${i},'late')">
            <span class="btn-icon"><i class="fa-solid fa-clock"></i></span>Geç
          </button>
          <button class="status-btn ${entry.status === 'left_early' ? 'active' : ''}" data-s="left_early" onclick="event.stopPropagation(); setStudentStatus(${i},'left_early')">
            <span class="btn-icon"><i class="fa-solid fa-door-open"></i></span>Erken
          </button>
          <button class="status-btn ${entry.status === 'late_left_early' ? 'active' : ''}" data-s="late_left_early" onclick="event.stopPropagation(); setStudentStatus(${i},'late_left_early')">
            <span class="btn-icon"><i class="fa-solid fa-arrows-left-right"></i></span>İkisi
          </button>
        </div>
        <div class="extra-field ${(entry.status === 'late' || entry.status === 'late_left_early') ? 'visible' : ''}">
          <label class="field-label"><i class="fa-solid fa-stopwatch"></i>Kaç dakika geç kaldı?</label>
          <input type="number" placeholder="örn. 20" min="1" max="120" inputmode="numeric" pattern="[0-9]*"
            value="${entry.lateMin}"
            onclick="event.stopPropagation()"
            oninput="updateStudentField(${i},'lateMin',this.value)">
        </div>
        <div class="extra-field ${(entry.status === 'left_early' || entry.status === 'late_left_early') ? 'visible' : ''}">
          <label class="field-label"><i class="fa-solid fa-door-open"></i>Ders bitmeden kaç dakika önce ayrıldı?</label>
          <input type="number" placeholder="örn. 15" min="1" max="120" inputmode="numeric" pattern="[0-9]*"
            value="${entry.earlyMin}"
            onclick="event.stopPropagation()"
            oninput="updateStudentField(${i},'earlyMin',this.value)">
        </div>
        <div class="exam-btn-wrapper">
          <button class="whatsapp-btn" onclick="event.stopPropagation(); sendDirectWhatsApp(${i})">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </button>
        </div>
      `;
      sg.appendChild(statusBox);
    }
  });
  sPanel.appendChild(sg);
  root.appendChild(sPanel);

  const stPanel = make("div", "panel");
  stPanel.innerHTML = `
    <div class="panel-title">Ek Bilgi</div>
    <label class="field-label"><i class="fa-solid fa-note-sticky"></i>Ek not (opsiyonel)</label>
    <input type="text" id="extraNote" placeholder="Eklemek istediğiniz bir not..." autocomplete="off" oninput="updatePreview()" value="${prevNote.replace(/"/g, '&quot;')}">
  `;
  root.appendChild(stPanel);

  const pPanel = make("div", "panel preview-panel");
  pPanel.style.gridColumn = "1 / -1";
  pPanel.innerHTML = `
    <div class="panel-title">Mesaj Önizleme & Gönder</div>
    <span class="msg-label wa"><i class="fa-brands fa-whatsapp"></i>WhatsApp — Her Veliye Ayrı</span>
    <div class="message-preview" id="whatsappPreview"><span class="placeholder-text">Öğrenci seçince mesaj burada görünür...</span></div>
    <div class="wa-buttons-section" id="waButtonsSection"></div>
    <div class="divider"></div>
    <span class="msg-label tg"><i class="fa-brands fa-telegram"></i>Telegram Grup Mesajı</span>
    <div class="telegram-preview" id="telegramPreview"><span class="placeholder-text">Öğrenci seçince grup mesajı burada görünür...</span></div>
    <button class="tg-copy-btn" id="tgCopyBtn" onclick="copyTelegram()" disabled>
      <i class="fa-brands fa-telegram"></i>
      Telegram Grubuna Kopyala
    </button>
    <div class="region-tg-row" id="regionTgRow"></div>
  `;
  root.appendChild(pPanel);

  const regionRow = document.getElementById("regionTgRow");
  ["Atakum", "İlkadım"].forEach(regionName => {
    const link = (regions[regionName] || {}).telegram || "";
    const btn = document.createElement(link ? "a" : "button");
    btn.className = "region-tg-btn";
    btn.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${regionName} Grubu`;
    if (link) {
      btn.href = link;
      btn.target = "_blank";
      btn.rel = "noopener";
    } else {
      btn.dataset.missing = "true";
      btn.onclick = () => alert(`${regionName} grup linki henüz ayarlanmadı. Kaynaklar bölümünden "More" butonundan ekleyebilirsiniz.`);
    }
    regionRow.appendChild(btn);
  });

  const sortedLessons = [...cls.lessons].sort((a, b) => a.number - b.number);
  const doneCount = sortedLessons.filter(l => l.is_complete).length;
  const lPanel = make("div", "panel lessons-panel");
  const lh = make("div", "panel-header");
  const lt = make("div", "panel-title");
  lt.textContent = `Ders Takibi (${sortedLessons.length} Ders)`;
  const lprog = make("div", "lessons-progress");
  lprog.textContent = `${doneCount} / ${sortedLessons.length} tamamlandı`;
  lh.appendChild(lt);
  lh.appendChild(lprog);
  lPanel.appendChild(lh);

  const lessonsList = make("div", "lessons-list");
  const leftCol = make("div", "lessons-col");
  const rightCol = make("div", "lessons-col");
  sortedLessons.forEach((lesson) => {
    const row = make("div", "lesson-row" + (lesson.is_complete ? " done" : ""));
    row.dataset.lessonId = lesson.id;
    row.innerHTML = `
      <div class="lesson-checkbox"><i class="fa-solid fa-check"></i></div>
      <div class="lesson-body">
        <div class="lesson-num">Ders ${lesson.number}</div>
        <input type="text" class="lesson-note-input" placeholder="Not ekle..." value="${(lesson.notes || "").replace(/"/g, '&quot;')}" autocomplete="off">
      </div>
    `;
    const checkbox = row.querySelector(".lesson-checkbox");
    checkbox.addEventListener("click", () => toggleLesson(lesson.id));
    const noteInput = row.querySelector(".lesson-note-input");
    let noteTimer = null;
    noteInput.addEventListener("input", (e) => {
      lesson.notes = e.target.value;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => updateLessonNote(lesson.id, e.target.value), 500);
    });
    if (lesson.number % 2 === 1) leftCol.appendChild(row);
    else rightCol.appendChild(row);
  });
  lessonsList.appendChild(leftCol);
  lessonsList.appendChild(rightCol);
  lPanel.appendChild(lessonsList);
  root.appendChild(lPanel);

  updatePreview();
  updateResourcesUI();
}

function make(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function toggleStudent(i, card) {
  if (selected.has(i)) {
    selected.delete(i);
  } else {
    selected.set(i, { status: "absent", lateMin: "", earlyMin: "" });
  }
  renderApp();
}

function setStudentStatus(i, status) {
  const entry = selected.get(i);
  if (!entry) return;
  entry.status = status;
  renderApp();
}

function updateStudentField(i, field, value) {
  const entry = selected.get(i);
  if (!entry) return;
  entry[field] = value;
  updatePreview();
}

async function toggleLesson(lessonId) {
  const cls = classes.find(c => c.id === activeClassId);
  if (!cls) return;
  const lesson = cls.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  const newValue = !lesson.is_complete;
  lesson.is_complete = newValue;

  const row = document.querySelector(`.lesson-row[data-lesson-id="${lessonId}"]`);
  if (row) row.classList.toggle("done", newValue);
  const doneCount = cls.lessons.filter(l => l.is_complete).length;
  const lprog = document.querySelector(".lessons-progress");
  if (lprog) lprog.textContent = `${doneCount} / ${cls.lessons.length} tamamlandı`;

  try {
    await toggleLessonInDb(lessonId, newValue);
  } catch (err) {
    console.error("Could not save lesson status:", err);
    lesson.is_complete = !newValue;
    if (row) row.classList.toggle("done", !newValue);
    alert("Ders durumu kaydedilemedi. İnternet bağlantınızı kontrol edin.");
  }
}

async function updateLessonNote(lessonId, value) {
  try {
    await updateLessonNoteInDb(lessonId, value);
  } catch (err) {
    console.error("Could not save lesson note:", err);
  }
}

// ── DIRECT WHATSAPP (opens with empty message) ──
function sendDirectWhatsApp(index) {
  const cls = classes.find(c => c.id === activeClassId);
  if (!cls) return;
  const student = cls.students[index];
  if (!student) return;
  const waUrl = `https://wa.me/${student.phone}`;
  window.open(waUrl, "_blank");
}

function buildWAMessage(studentName, entry) {
  const note = (document.getElementById("extraNote") || {}).value?.trim() || "";
  const late = (entry.lateMin || "").toString().trim();
  const early = (entry.earlyMin || "").toString().trim();
  let msg;

  if (entry.status === "absent") {
    msg = `İyi günler,\n\n${studentName} bugün derse katılmadı. Bilginize sunarız.`;
  } else {
    let statusLine = "";
    if (entry.status === "late") {
      statusLine = `${studentName} bugün kursumuza geç katılmıştır${late ? " (" + late + " dakika geç)" : ""}.`;
    } else if (entry.status === "left_early") {
      statusLine = `${studentName} bugün kursumuzdan erken ayrıldı${early ? " (dersin bitiminden " + early + " dakika önce)" : ""}.`;
    } else if (entry.status === "late_left_early") {
      statusLine = `${studentName} bugün kursumuza geç katılmıştır${late ? " (" + late + " dakika geç)" : ""} ve dersten erken ayrıldı${early ? " (dersin bitiminden " + early + " dakika önce)" : ""}.`;
    }
    msg = `İyi günler,\n\n${statusLine} Bilginize sunarız.`;
  }
  if (note) msg += `\n\nNot: ${note}`;
  msg += `\n\nİyi günler dileriz.\n\n*American Life*`;
  return msg;
}

function studentStatusNote(entry) {
  const late = (entry.lateMin || "").toString().trim();
  const early = (entry.earlyMin || "").toString().trim();
  const parts = [];
  if (entry.status === "absent") {
    parts.push("katılmadı");
  } else if (entry.status === "late") {
    parts.push(`${late ? late + " dk " : ""}geç katıldı`);
  } else if (entry.status === "left_early") {
    parts.push(`dersin bitiminden ${early ? early + " dk " : ""}önce ayrıldı`);
  } else if (entry.status === "late_left_early") {
    parts.push(`${late ? late + " dk " : ""}geç katıldı`);
    parts.push(`dersin bitiminden ${early ? early + " dk " : ""}önce ayrıldı`);
  }
  return parts.join(", ");
}

function studentStatusIcon(entry) {
  switch (entry.status) {
    case "absent": return "❌";
    case "late": return "⏰";
    case "left_early": return "🚪";
    case "late_left_early": return "↔️";
    default: return "";
  }
}

function buildTelegramMessage(selectedList) {
  const cls = classes.find(c => c.id === activeClassId);
  const note = (document.getElementById("extraNote") || {}).value?.trim() || "";
  
  const start = cls.time_start ? cls.time_start.slice(0, 5) : "";
  const end = cls.time_end ? cls.time_end.slice(0, 5) : "";
  const timeStr = start && end ? `${start} – ${end}` : "";
  
  let msg = `📚 ${cls.name} Sınıfı\n🗓️ ${cls.days || ""}\n🕜 ${timeStr}\n\n📌 Bilgilendirme\n\n`;
  
  const hasStatus = selectedList.some(({ entry }) => entry && entry.status);
  
  if (selectedList.length === 0 || !hasStatus) {
    msg += `✅  Tam katılım sağlanmıştır`;
  } else {
    let list = selectedList.map(({ s, entry }) => {
      const icon = studentStatusIcon(entry);
      const tag = studentStatusNote(entry);
      return `- ${icon} ${s.name}${tag ? " (" + tag + ")" : ""}`;
    }).join("\n");
    msg += list;
    msg += `\n\n✅ Veliler bilgilendirilmiştir. 👍`;
  }
  
  if (note) msg += `\n\n📝 ${note}`;
  
  return msg;
}

function updatePreview() {
  const cls = classes.find(c => c.id === activeClassId);
  if (!cls) return;
  const selectedList = [...selected.entries()].map(([i, entry]) => ({ s: cls.students[i], entry }));
  const wp = document.getElementById("whatsappPreview");
  const tg = document.getElementById("telegramPreview");
  const waSection = document.getElementById("waButtonsSection");
  const tgBtn = document.getElementById("tgCopyBtn");
  if (!wp) return;

  if (selectedList.length === 0) {
    wp.innerHTML = '<span class="placeholder-text">Öğrenci seçince mesaj burada görünür...</span>';
    wp.classList.remove("has-content");
    waSection.innerHTML = "";
    if (tgBtn) tgBtn.disabled = false;
  } else {
    wp.textContent = buildWAMessage(selectedList[0].s.name, selectedList[0].entry);
    wp.classList.add("has-content");
    waSection.innerHTML = "";
    selectedList.forEach(({ s, entry }) => {
      const msg = buildWAMessage(s.name, entry);
      const waUrl = `https://wa.me/${s.phone}?text=${encodeURIComponent(msg)}`;
      const telUrl = `tel:+${s.phone}`;
      const row = document.createElement("div");
      row.className = "contact-row";
      const a = document.createElement("a");
      a.className = "wa-student-btn";
      a.href = waUrl;
      a.innerHTML = `
        <i class="fa-brands fa-whatsapp" style="font-size:15px;"></i>
        <span class="btn-name">${s.name}</span>
        <span class="btn-arrow"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
      `;
      row.appendChild(a);
      const callBtn = document.createElement("a");
      callBtn.className = "call-student-btn";
      callBtn.href = telUrl;
      callBtn.title = `${s.name} velisini ara`;
      callBtn.innerHTML = `<i class="fa-solid fa-phone" style="font-size:15px;"></i>`;
      row.appendChild(callBtn);
      waSection.appendChild(row);
    });
  }

  tg.textContent = buildTelegramMessage(selectedList);
  if (tgBtn) tgBtn.disabled = false;
}

function copyTelegram() {
  const cls = classes.find(c => c.id === activeClassId);
  if (!cls) return;
  const selectedList = [...selected.entries()].map(([i, entry]) => ({ s: cls.students[i], entry }));
  const text = buildTelegramMessage(selectedList);

  const done = () => {
    const btn = document.getElementById("tgCopyBtn");
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.classList.add("copied");
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Kopyalandı!`;
    setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = orig; }, 2200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}

function legacyCopy(text, callback) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, 99999);
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
  if (callback) callback();
}

function pickRegion(region) {
  modalSelectedRegion = region;
  updateRegionPickerUI();
}

function updateRegionPickerUI() {
  const aBtn = document.getElementById("regionPickAtakum");
  const iBtn = document.getElementById("regionPickIlkadim");
  if (!aBtn || !iBtn) return;
  [aBtn, iBtn].forEach(b => {
    b.style.borderColor = "var(--border)";
    b.style.background = "#fff";
    b.style.color = "var(--slate)";
  });
  const active = modalSelectedRegion === "Atakum" ? aBtn : iBtn;
  active.style.borderColor = "var(--gold)";
  active.style.background = "var(--gold-soft)";
  active.style.color = "#9C6F1E";
}

function openModal(classId) {
  editingClassId = classId || null;
  const deleteBtn = document.getElementById("deleteClassBtn");

  if (classId) {
    const cls = classes.find(c => c.id === classId);
    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-pen"></i>Sınıfı Düzenle';
    document.getElementById("mClassName").value = cls.name;
    document.getElementById("mDay").value = cls.days || "";
    document.getElementById("mTimeStart").value = (cls.time_start || "").slice(0, 5);
    document.getElementById("mTimeEnd").value = (cls.time_end || "").slice(0, 5);
    modalSelectedRegion = cls.branch || "Atakum";
    document.getElementById("studentBuilder").innerHTML = "";
    cls.students.forEach(s => addStudentRow(s.name, formatPhone(s.phone)));
    deleteBtn.style.display = classes.length > 1 ? "block" : "none";
  } else {
    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-plus"></i>Yeni Sınıf Ekle';
    document.getElementById("mClassName").value = "";
    document.getElementById("mDay").value = "";
    document.getElementById("mTimeStart").value = "";
    document.getElementById("mTimeEnd").value = "";
    modalSelectedRegion = "Atakum";
    document.getElementById("studentBuilder").innerHTML = "";
    addStudentRow(); addStudentRow(); addStudentRow();
    deleteBtn.style.display = "none";
  }
  updateRegionPickerUI();
  document.getElementById("modalBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("open");
  document.body.style.overflow = "";
}

function closeModalOnBackdrop(e) {
  if (e.target.id === "modalBackdrop") closeModal();
}

function addStudentRow(name = "", phone = "") {
  const builder = document.getElementById("studentBuilder");
  const row = document.createElement("div");
  row.className = "student-row";
  row.innerHTML = `
    <input type="text" placeholder="Ad Soyad" value="${name}" data-role="name" autocomplete="off">
    <input type="text" placeholder="05xx..." value="${phone}" data-role="phone" inputmode="numeric" autocomplete="off">
    <button class="remove-student-btn" onclick="removeStudentRow(this)"><i class="fa-solid fa-xmark"></i></button>
  `;
  builder.appendChild(row);
}

function removeStudentRow(btn) {
  btn.closest(".student-row").remove();
}

function openBulkImport() {
  const raw = prompt("Öğrencileri satır satır girin (Ad - Telefon):\nÖrn:\nAhmet Yılmaz - 5051234567\nAyşe Demir - 5329876543");
  if (!raw) return;
  const lines = raw.split("\n").filter(l => l.trim());
  const builder = document.getElementById("studentBuilder");
  builder.innerHTML = "";
  lines.forEach(line => {
    const parts = line.split("-").map(s => s.trim());
    if (parts.length >= 2) addStudentRow(parts[0], parts[1]);
  });
  if (builder.children.length === 0) addStudentRow();
}

async function saveClass() {
  const name = document.getElementById("mClassName").value.trim();
  const days = document.getElementById("mDay").value.trim();
  const timeStart = document.getElementById("mTimeStart").value.trim();
  const timeEnd = document.getElementById("mTimeEnd").value.trim();
  if (!name) { document.getElementById("mClassName").focus(); return; }

  const rows = document.querySelectorAll("#studentBuilder .student-row");
  const students = [];
  rows.forEach(row => {
    const n = row.querySelector("[data-role=name]").value.trim();
    const ph = row.querySelector("[data-role=phone]").value.trim();
    if (n && ph) students.push({ name: n, phone: normalizePhone(ph) });
  });

  const saveBtn = document.querySelector(".modal-btn.primary");
  const origText = saveBtn ? saveBtn.textContent : "";
  if (saveBtn) { saveBtn.textContent = "Kaydediliyor..."; saveBtn.disabled = true; }

  try {
    if (editingClassId) {
      await updateClassInDb(editingClassId, name, modalSelectedRegion, days, timeStart, timeEnd, students);
    } else {
      const newId = await createClassInDb(name, modalSelectedRegion, days, timeStart, timeEnd, students);
      activeClassId = newId;
    }
    selected = new Map();
    closeModal();
    await fetchAllData();
  } catch (err) {
    console.error("Could not save class:", err);
    alert("Sınıf kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
  } finally {
    if (saveBtn) { saveBtn.textContent = origText; saveBtn.disabled = false; }
  }
}

async function deleteClass() {
  if (classes.length <= 1) return;
  if (!confirm("Bu sınıfı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
  try {
    await deleteClassInDb(editingClassId);
    selected = new Map();
    closeModal();
    await fetchAllData();
  } catch (err) {
    console.error("Could not delete class:", err);
    alert("Sınıf silinemedi: " + (err.message || "Bilinmeyen hata"));
  }
}

fetchAllData();