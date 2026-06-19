// script.js
const STORAGE_KEY = "americanLifeParentComms_v2";

const defaultClasses = [{
    id: 1,
    name: "C+",
    day: "Pazar",
    time: "13.30 – 15.50",
    region: "Atakum",
    students: [
        { name: "Beren Türker", phone: "905466921104" },
        { name: "Simay Yıldız", phone: "905054522575" },
        { name: "Ege Eroğlu", phone: "905301825561" },
        { name: "Ceylin Mısırcı", phone: "905442929999" },
    ],
    lessons: [],
    note: ""
}, {
    id: 2,
    name: "B1 - Class 6",
    day: "Cumartesi – Pazar",
    time: "09.30 – 11.50",
    region: "İlkadım",
    students: [
        { name: "Öykü Cün", phone: "905442979143" },
        { name: "Egemen Albay", phone: "905054989523" },
        { name: "Mustafa Enes Alkoç", phone: "905053135952" },
        { name: "Talha Türkdönmez", phone: "905061715180" },
        { name: "Taylan Erkevet", phone: "905057441803" },
        { name: "Zafer Çelik", phone: "905521795610" },
        { name: "Batuhan Turgut", phone: "905414145840" },
        { name: "Melisa Kaptan", phone: "905466050948" },
    ],
    lessons: [],
    note: ""
}];

const defaultRegions = {
    Atakum: { telegram: "https://t.me/+BFwaPdYjN1EyZWI0", resourceImage: "" },
    "İlkadım": { telegram: "https://t.me/+ZO2aqbj3UgswZTRk", resourceImage: "" }
};

function makeDefaultLessons() {
    const lessons = [];
    for (let i = 1; i <= 30; i++) {
        lessons.push({ num: i, done: false, note: "" });
    }
    return lessons;
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const fresh = JSON.parse(JSON.stringify(defaultClasses));
            fresh.forEach(c => { if (!c.lessons || !c.lessons.length) c.lessons = makeDefaultLessons(); });
            return { classes: fresh, activeClassId: fresh[0].id, regions: JSON.parse(JSON.stringify(defaultRegions)) };
        }
        const parsed = JSON.parse(raw);
        if (!parsed.classes || !parsed.classes.length) throw new Error("empty");
        parsed.classes.forEach(c => {
            if (!c.lessons || !c.lessons.length) c.lessons = makeDefaultLessons();
            if (typeof c.note !== "string") c.note = "";
            if (!c.region) c.region = "Atakum";
        });
        if (!parsed.regions) parsed.regions = JSON.parse(JSON.stringify(defaultRegions));
        ["Atakum", "İlkadım"].forEach(r => {
            if (!parsed.regions[r]) parsed.regions[r] = { telegram: "", resourceImage: "" };
        });
        return parsed;
    } catch (e) {
        const fresh = JSON.parse(JSON.stringify(defaultClasses));
        fresh.forEach(c => { if (!c.lessons || !c.lessons.length) c.lessons = makeDefaultLessons(); });
        return { classes: fresh, activeClassId: fresh[0].id, regions: JSON.parse(JSON.stringify(defaultRegions)) };
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ classes, activeClassId, regions: appData.regions }));
    } catch (e) {
        console.warn("Could not save data:", e);
    }
}

const loaded = loadData();
let classes = loaded.classes;
let activeClassId = loaded.activeClassId;
const appData = { regions: loaded.regions };
let selected = new Map();
let editingClassId = null;
let activeRegionFilter = "all";

function getInitials(name) {
    return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatPhone(phone) {
    if (phone.startsWith("90")) return "0" + phone.slice(2);
    return phone;
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
                const visible = classes.filter(c => r === "all" || c.region === r);
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
    const visibleClasses = classes.filter(c => activeRegionFilter === "all" || c.region === activeRegionFilter);
    visibleClasses.forEach(cls => {
        const tab = document.createElement("div");
        tab.className = "class-tab" + (cls.id === activeClassId ? " active" : "");
        tab.innerHTML = `<span class="tab-dot"></span>${cls.name}`;
        tab.onclick = () => {
            activeClassId = cls.id;
            selected = new Map();
            saveData();
            render();
        };
        bar.insertBefore(tab, addBtn);
    });
}

function renderApp() {
    const cls = classes.find(c => c.id === activeClassId);
    if (!cls) return;
    const root = document.getElementById("appRoot");
    const prevNoteEl = document.getElementById("extraNote");
    const prevNote = prevNoteEl ? prevNoteEl.value : "";
    root.innerHTML = "";
    const regions = appData.regions;

    const infoBar = make("div", "class-info-bar");
    infoBar.style.gridColumn = "1 / -1";
    infoBar.innerHTML = `
        <div class="info-chips">
            <div class="info-chip"><span>📚</span> ${cls.name} Sınıfı</div>
            <div class="info-chip"><span>📍</span> ${cls.region || "Atakum"}</div>
            <div class="info-chip"><span>🗓️</span> ${cls.day}</div>
            <div class="info-chip"><span>🕜</span> ${cls.time}</div>
        </div>
        <button class="edit-class-btn" onclick="openModal(${cls.id})">✏️ Düzenle</button>
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
    cls.students.forEach((s, i) => {
        const entry = selected.get(i);
        const card = make("div", "student-card");
        if (entry) { card.classList.add("selected");
            card.classList.add("has-status"); }
        card.innerHTML = `
            <div class="student-avatar">${getInitials(s.name)}</div>
            <div class="student-info">
                <div class="student-name">${s.name}</div>
                <div class="student-phone">${formatPhone(s.phone)}</div>
            </div>
            <div class="check-mark">✓</div>
        `;
        card.addEventListener("click", () => toggleStudent(i, card));
        sg.appendChild(card);

        if (entry) {
            const statusBox = make("div", "student-status");
            statusBox.innerHTML = `
                <div class="status-row">
                    <button class="status-btn ${entry.status === 'absent' ? 'active' : ''}" data-s="absent" onclick="event.stopPropagation(); setStudentStatus(${i},'absent')">
                        <span class="btn-icon">❌</span>Yok
                    </button>
                    <button class="status-btn ${entry.status === 'late' ? 'active' : ''}" data-s="late" onclick="event.stopPropagation(); setStudentStatus(${i},'late')">
                        <span class="btn-icon">⏰</span>Geç
                    </button>
                    <button class="status-btn ${entry.status === 'left_early' ? 'active' : ''}" data-s="left_early" onclick="event.stopPropagation(); setStudentStatus(${i},'left_early')">
                        <span class="btn-icon">🚪</span>Erken
                    </button>
                    <button class="status-btn ${entry.status === 'late_left_early' ? 'active' : ''}" data-s="late_left_early" onclick="event.stopPropagation(); setStudentStatus(${i},'late_left_early')">
                        <span class="btn-icon">↔️</span>İkisi
                    </button>
                </div>
                <div class="extra-field ${(entry.status === 'late' || entry.status === 'late_left_early') ? 'visible' : ''}">
                    <label class="field-label">⏱ Kaç dakika geç kaldı?</label>
                    <input type="number" placeholder="örn. 20" min="1" max="120" inputmode="numeric" pattern="[0-9]*"
                        value="${entry.lateMin}"
                        onclick="event.stopPropagation()"
                        oninput="updateStudentField(${i},'lateMin',this.value)">
                </div>
                <div class="extra-field ${(entry.status === 'left_early' || entry.status === 'late_left_early') ? 'visible' : ''}">
                    <label class="field-label">🚪 Ders bitmeden kaç dakika önce ayrıldı?</label>
                    <input type="number" placeholder="örn. 15" min="1" max="120" inputmode="numeric" pattern="[0-9]*"
                        value="${entry.earlyMin}"
                        onclick="event.stopPropagation()"
                        oninput="updateStudentField(${i},'earlyMin',this.value)">
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
        <label class="field-label">📝 Ek not (opsiyonel)</label>
        <input type="text" id="extraNote" placeholder="Eklemek istediğiniz bir not..." autocomplete="off" oninput="updatePreview()" value="${prevNote.replace(/"/g, '&quot;')}">
    `;
    root.appendChild(stPanel);

    const pPanel = make("div", "panel preview-panel");
    pPanel.style.gridColumn = "1 / -1";
    pPanel.innerHTML = `
        <div class="panel-title">Mesaj Önizleme & Gönder</div>
        <span class="msg-label wa">📱 WhatsApp — Her Veliye Ayrı</span>
        <div class="message-preview" id="whatsappPreview"><span class="placeholder-text">Öğrenci seçince mesaj burada görünür...</span></div>
        <div class="wa-buttons-section" id="waButtonsSection"></div>
        <div class="divider"></div>
        <span class="msg-label tg">📢 Telegram Grup Mesajı</span>
        <div class="telegram-preview" id="telegramPreview"><span class="placeholder-text">Öğrenci seçince grup mesajı burada görünür...</span></div>
        <button class="tg-copy-btn" id="tgCopyBtn" onclick="copyTelegram()" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
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
        btn.textContent = `📍 ${regionName} Grubu`;
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

    if (!cls.lessons || !cls.lessons.length) cls.lessons = makeDefaultLessons();
    const doneCount = cls.lessons.filter(l => l.done).length;
    const lPanel = make("div", "panel lessons-panel");
    const lh = make("div", "panel-header");
    const lt = make("div", "panel-title");
    lt.textContent = "Ders Takibi (30 Ders)";
    const lprog = make("div", "lessons-progress");
    lprog.textContent = `${doneCount} / 30 tamamlandı`;
    lh.appendChild(lt);
    lh.appendChild(lprog);
    lPanel.appendChild(lh);

    const lessonsList = make("div", "lessons-list");
    const leftCol = make("div", "lessons-col");
    const rightCol = make("div", "lessons-col");
    cls.lessons.forEach((lesson, li) => {
        const row = make("div", "lesson-row" + (lesson.done ? " done" : ""));
        row.dataset.lessonIndex = li;
        row.innerHTML = `
            <div class="lesson-checkbox">✓</div>
            <div class="lesson-body">
                <div class="lesson-num">Ders ${lesson.num}</div>
                <input type="text" class="lesson-note-input" placeholder="Not ekle..." value="${(lesson.note || "").replace(/"/g, '&quot;')}" autocomplete="off">
            </div>
        `;
        const checkbox = row.querySelector(".lesson-checkbox");
        checkbox.addEventListener("click", () => toggleLesson(li));
        const noteInput = row.querySelector(".lesson-note-input");
        noteInput.addEventListener("input", (e) => updateLessonNote(li, e.target.value));
        if (lesson.num % 2 === 1) leftCol.appendChild(row);
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

function toggleLesson(li) {
    const cls = classes.find(c => c.id === activeClassId);
    if (!cls || !cls.lessons[li]) return;
    cls.lessons[li].done = !cls.lessons[li].done;
    saveData();
    const row = document.querySelector(`.lesson-row[data-lesson-index="${li}"]`);
    if (row) row.classList.toggle("done", cls.lessons[li].done);
    const doneCount = cls.lessons.filter(l => l.done).length;
    const lprog = document.querySelector(".lessons-progress");
    if (lprog) lprog.textContent = `${doneCount} / 30 tamamlandı`;
}

function updateLessonNote(li, value) {
    const cls = classes.find(c => c.id === activeClassId);
    if (!cls || !cls.lessons[li]) return;
    cls.lessons[li].note = value;
    saveData();
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
        case "absent":
            return "❌";
        case "late":
            return "⏰";
        case "left_early":
            return "🚪";
        case "late_left_early":
            return "↔️";
        default:
            return "";
    }
}

function buildTelegramMessage(selectedList) {
    const cls = classes.find(c => c.id === activeClassId);
    const note = (document.getElementById("extraNote") || {}).value?.trim() || "";
    let list = selectedList.map(({ s, entry }) => {
        const icon = studentStatusIcon(entry);
        const tag = studentStatusNote(entry);
        return `- ${icon} ${s.name}${tag ? " (" + tag + ")" : ""}`;
    }).join("\n");
    let msg = `📚 ${cls.name} Sınıfı\n🗓️ ${cls.day}\n🕜 ${cls.time}\n\n📌 Bilgilendirme\n\n${list}`;
    if (note) msg += `\n\n📝 ${note}`;
    msg += `\n\n✅ Veliler bilgilendirilmiştir. 👍`;
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
        tg.innerHTML = '<span class="placeholder-text">Öğrenci seçince grup mesajı burada görünür...</span>';
        waSection.innerHTML = "";
        if (tgBtn) tgBtn.disabled = true;
        return;
    }

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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span class="btn-name">${s.name}</span>
            <span class="btn-arrow">↗</span>
        `;
        row.appendChild(a);

        const callBtn = document.createElement("a");
        callBtn.className = "call-student-btn";
        callBtn.href = telUrl;
        callBtn.title = `${s.name} velisini ara`;
        callBtn.innerHTML = `
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z"/></svg>
        `;
        row.appendChild(callBtn);

        waSection.appendChild(row);
    });

    tg.textContent = buildTelegramMessage(selectedList);
    if (tgBtn) tgBtn.disabled = false;
}

function copyTelegram() {
    const cls = classes.find(c => c.id === activeClassId);
    if (!cls) return;
    const selectedList = [...selected.entries()].map(([i, entry]) => ({ s: cls.students[i], entry }));
    if (!selectedList.length) return;
    const text = buildTelegramMessage(selectedList);

    const done = () => {
        const btn = document.getElementById("tgCopyBtn");
        if (!btn) return;
        const orig = btn.innerHTML;
        btn.classList.add("copied");
        btn.textContent = "✓ Kopyalandı!";
        setTimeout(() => { btn.classList.remove("copied");
            btn.innerHTML = orig; }, 2200);
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

function openResources() {
    document.getElementById("resourcesBackdrop").classList.add("open");
    document.body.style.overflow = "hidden";
    updateResourcesUI();
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
    const atakumLink = (regions.Atakum || {}).telegram || "";
    atakumSub.textContent = atakumLink ? "Telegram grubu ✔️" : "Telegram grubu (ekle)";
    if (regions.Atakum && regions.Atakum.resourceImage) {
        atakumImg.src = regions.Atakum.resourceImage;
        atakumImg.style.display = "block";
    } else {
        atakumImg.style.display = "none";
    }
    const ilkadimSub = document.getElementById("ilkadimSub");
    const ilkadimImg = document.getElementById("ilkadimImage");
    const ilkadimLink = (regions["İlkadım"] || {}).telegram || "";
    ilkadimSub.textContent = ilkadimLink ? "Telegram grubu ✔️" : "Telegram grubu (ekle)";
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
            saveData();
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
        saveData();
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

let modalSelectedRegion = "Atakum";

function pickRegion(region) {
    modalSelectedRegion = region;
    updateRegionPickerUI();
}

function updateRegionPickerUI() {
    const aBtn = document.getElementById("regionPickAtakum");
    const iBtn = document.getElementById("regionPickIlkadim");
    [aBtn, iBtn].forEach(b => {
        b.style.borderColor = "var(--border)";
        b.style.background = "#fff";
        b.style.color = "var(--slate)";
    });
    const active = modalSelectedRegion === "Atakum" ? aBtn : iBtn;
    active.style.borderColor = "var(--amber)";
    active.style.background = "var(--amber-soft)";
    active.style.color = "#B97309";
}

function openModal(classId) {
    editingClassId = classId;
    modalStudentRows = [];
    const deleteBtn = document.getElementById("deleteClassBtn");

    if (classId) {
        const cls = classes.find(c => c.id === classId);
        document.getElementById("modalTitle").textContent = "Sınıfı Düzenle";
        document.getElementById("mClassName").value = cls.name;
        document.getElementById("mDay").value = cls.day;
        document.getElementById("mTime").value = cls.time;
        modalSelectedRegion = cls.region || "Atakum";
        document.getElementById("studentBuilder").innerHTML = "";
        cls.students.forEach(s => addStudentRow(s.name, formatPhone(s.phone)));
        deleteBtn.style.display = classes.length > 1 ? "block" : "none";
    } else {
        document.getElementById("modalTitle").textContent = "Yeni Sınıf Ekle";
        document.getElementById("mClassName").value = "";
        document.getElementById("mDay").value = "";
        document.getElementById("mTime").value = "";
        modalSelectedRegion = "Atakum";
        document.getElementById("studentBuilder").innerHTML = "";
        addStudentRow();
        addStudentRow();
        addStudentRow();
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
        <button class="remove-student-btn" onclick="removeStudentRow(this)">×</button>
    `;
    builder.appendChild(row);
}

function removeStudentRow(btn) {
    btn.closest(".student-row").remove();
}

function normalizePhone(raw) {
    let p = raw.replace(/\D/g, "");
    if (p.startsWith("0")) p = "90" + p.slice(1);
    if (!p.startsWith("90")) p = "90" + p;
    return p;
}

function saveClass() {
    const name = document.getElementById("mClassName").value.trim();
    const day = document.getElementById("mDay").value.trim();
    const time = document.getElementById("mTime").value.trim();
    if (!name) { document.getElementById("mClassName").focus(); return; }

    const rows = document.querySelectorAll("#studentBuilder .student-row");
    const students = [];
    rows.forEach(row => {
        const n = row.querySelector("[data-role=name]").value.trim();
        const ph = row.querySelector("[data-role=phone]").value.trim();
        if (n && ph) students.push({ name: n, phone: normalizePhone(ph) });
    });

    if (editingClassId) {
        const cls = classes.find(c => c.id === editingClassId);
        cls.name = name;
        cls.day = day;
        cls.time = time;
        cls.students = students;
        cls.region = modalSelectedRegion;
    } else {
        const newId = Date.now();
        classes.push({ id: newId, name, day, time, region: modalSelectedRegion, students, lessons: makeDefaultLessons(),
            note: "" });
        activeClassId = newId;
    }
    selected = new Map();
    saveData();
    closeModal();
    render();
}

function deleteClass() {
    if (classes.length <= 1) return;
    classes = classes.filter(c => c.id !== editingClassId);
    activeClassId = classes[0].id;
    selected = new Map();
    saveData();
    closeModal();
    render();
}

function openBulkImport() {
    const raw = prompt("Öğrencileri satır satır girin (Ad - Telefon):\nÖrn:\nAhmet Yılmaz - 5051234567\nAyşe Demir - 5329876543");
    if (!raw) return;
    const lines = raw.split("\n").filter(l => l.trim());
    const builder = document.getElementById("studentBuilder");
    builder.innerHTML = "";
    lines.forEach(line => {
        const parts = line.split("-").map(s => s.trim());
        if (parts.length >= 2) {
            addStudentRow(parts[0], parts[1]);
        }
    });
    if (builder.children.length === 0) addStudentRow();
}

render();