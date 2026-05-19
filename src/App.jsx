import React, { useState, useEffect, useMemo } from "react";
import {
  Users, Plus, Check, X, Clock, Copy, Trash2, Calendar, Edit3,
  CheckCircle2, GraduationCap, Briefcase, FileText, Sparkles, Send, Heart,
  Repeat, User, Grid3x3, CloudOff, Cloud,
} from "lucide-react";

// ============ helpers ============
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const THAI_DAYS_SHORT = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const tomorrowISO = () => {
  const d = new Date(); d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const formatThaiDateShort = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
};
const daysFromToday = (iso) => {
  if (!iso) return 0;
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / (1000*60*60*24));
};
const formatRelativeTime = (iso) => {
  if (!iso) return "ยังไม่เคยแชร์";
  const diffMs = new Date() - new Date(iso);
  const diffMin = Math.floor(diffMs/(1000*60));
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffH = Math.floor(diffMin/60);
  if (diffH < 24) return `${diffH} ชั่วโมงที่แล้ว`;
  const diffD = Math.floor(diffH/24);
  if (diffD < 7) return `${diffD} วันที่แล้ว`;
  return formatThaiDateShort(iso.slice(0,10));
};

const SCHEDULE_TYPES = {
  study: { label: "เรียน", icon: GraduationCap, color: "var(--c-blue)" },
  work: { label: "ทำงาน", icon: Briefcase, color: "var(--c-amber)" },
  exam: { label: "สอบ", icon: FileText, color: "var(--c-rose)" },
  other: { label: "อื่นๆ", icon: Sparkles, color: "var(--c-green)" },
};

function generateRecurring(pattern, skipDates = []) {
  const events = [];
  const start = new Date(pattern.startDate + "T00:00:00");
  const end = new Date(pattern.endDate + "T00:00:00");
  const skipSet = new Set(skipDates);

  let current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (pattern.weekdays.includes(dow)) {
      const dateStr = current.toISOString().slice(0, 10);
      if (!skipSet.has(dateStr)) {
        events.push({
          id: uid(),
          ...pattern,
          date: dateStr,
          createdAt: new Date().toISOString(),
          status: "pending",
          isRecurring: true,
          recurringParent: pattern.id,
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return events;
}

function buildFamilyUpdateText(items, lastShared) {
  if (!lastShared) return null;
  const t = todayISO(), tmr = tomorrowISO();
  const completed = items.filter((i) => i.status === "done" && i.completedAt && i.completedAt > lastShared);
  const newItems = items.filter((i) => i.status !== "done" && i.createdAt && i.createdAt > lastShared && i.date >= t);
  const newIds = new Set(newItems.map((i) => i.id));
  const todayItems = items.filter((i) => i.status !== "done" && i.date === t && !newIds.has(i.id));
  const tomorrowItems = items.filter((i) => i.status !== "done" && i.date === tmr && !newIds.has(i.id));
  if (!completed.length && !newItems.length && !todayItems.length && !tomorrowItems.length) return null;

  let text = `👨‍👩‍👧 อัปเดตตารางครอบครัว ${formatThaiDateShort(t)}\n━━━━━━━━━━━━━━━\n`;
  if (completed.length) {
    text += `\n✅ เสร็จแล้ว (${completed.length})\n`;
    completed.forEach((i) => { text += `• ${i.member ? "[" + i.member + "] " : ""}${i.title}\n`; });
  }
  if (newItems.length) {
    text += `\n🆕 เพิ่มใหม่ (${newItems.length})\n`;
    newItems.forEach((i) => { text += `• ${formatThaiDateShort(i.date)}${i.time ? " " + i.time : ""} ${i.member ? "[" + i.member + "] " : ""}${SCHEDULE_TYPES[i.type]?.label || ""}: ${i.title}${i.note ? " (" + i.note + ")" : ""}\n`; });
  }
  if (todayItems.length) {
    text += `\n📅 วันนี้\n`;
    todayItems.forEach((i) => { text += `• ${i.time ? i.time + " " : ""}${i.member ? "[" + i.member + "] " : ""}${SCHEDULE_TYPES[i.type]?.label || ""}: ${i.title}${i.note ? " (" + i.note + ")" : ""}\n`; });
  }
  if (tomorrowItems.length) {
    text += `\n📅 พรุ่งนี้\n`;
    tomorrowItems.forEach((i) => { text += `• ${i.time ? i.time + " " : ""}${i.member ? "[" + i.member + "] " : ""}${SCHEDULE_TYPES[i.type]?.label || ""}: ${i.title}${i.note ? " (" + i.note + ")" : ""}\n`; });
  }
  return text;
}

function buildFamilyFullText(items) {
  const t = todayISO(), tmr = tomorrowISO();
  const todayItems = items.filter((i) => i.status !== "done" && i.date === t);
  const tomorrowItems = items.filter((i) => i.status !== "done" && i.date === tmr);
  if (!todayItems.length && !tomorrowItems.length) return null;

  let text = `👨‍👩‍👧 ตารางครอบครัว\n━━━━━━━━━━━━━━━\n`;
  if (todayItems.length) {
    text += `\n📅 วันนี้ ${formatThaiDateShort(t)}\n`;
    todayItems.forEach((i) => { text += `• ${i.time ? i.time + " " : ""}${i.member ? "[" + i.member + "] " : ""}${SCHEDULE_TYPES[i.type]?.label || ""}: ${i.title}${i.note ? " (" + i.note + ")" : ""}\n`; });
  }
  if (tomorrowItems.length) {
    text += `\n📅 พรุ่งนี้ ${formatThaiDateShort(tmr)}\n`;
    tomorrowItems.forEach((i) => { text += `• ${i.time ? i.time + " " : ""}${i.member ? "[" + i.member + "] " : ""}${SCHEDULE_TYPES[i.type]?.label || ""}: ${i.title}${i.note ? " (" + i.note + ")" : ""}\n`; });
  }
  return text;
}

const StorageHelper = {
  async getLocal(key) {
    try {
      const result = await window.storage.get(key);
      return result?.value ? JSON.parse(result.value) : null;
    } catch {
      return null;
    }
  },
  async setLocal(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  },
};

export default function FamilyApp() {
  const [view, setView] = useState("all");
  const [selectedMember, setSelectedMember] = useState("");
  const [members, setMembers] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [lastShared, setLastShared] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [cloudConnected, setCloudConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const [mem, s, fls] = await Promise.all([
        StorageHelper.getLocal("family_v2_members"),
        StorageHelper.getLocal("family_v2_items"),
        StorageHelper.getLocal("family_v2_last_shared"),
      ]);
      if (mem) setMembers(mem);
      if (s) setScheduleItems(s);
      if (fls) setLastShared(fls);
      setLoaded(true);
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const saveMembers = async (next) => {
    setMembers(next);
    await StorageHelper.setLocal("family_v2_members", next);
  };
  const saveSchedule = async (next) => {
    setScheduleItems(next);
    await StorageHelper.setLocal("family_v2_items", next);
  };
  const saveLastShared = async (t) => {
    setLastShared(t);
    await StorageHelper.setLocal("family_v2_last_shared", t);
  };

  const handleConnectCloud = () => {
    alert("🚧 ฟีเจอร์เชื่อม Google Sheets\n\nขณะนี้อยู่ระหว่างพัฒนา — จะเปิดให้ใช้งานเร็วๆ นี้\n\n✅ ตอนนี้ข้อมูลเก็บในเครื่อง (browser storage) ปลอดภัยแล้ว\n\nถ้าต้องการ Google Sheets + แจ้งเตือน แจ้งกลับมาได้ครับ");
  };

  const now = new Date();
  const dateHeader = `${THAI_DAYS[now.getDay()]} ${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const todayCount = scheduleItems.filter(i => i.status !== "done" && i.date === todayISO()).length;
  const tomorrowCount = scheduleItems.filter(i => i.status !== "done" && i.date === tomorrowISO()).length;
  const upcomingCount = scheduleItems.filter(i => i.status !== "done" && i.date > tomorrowISO()).length;

  return (
    <>
      <style>{`
        :root {
          --c-bg: #F2F4F0; --c-bg-2: #E8EBE3; --c-surface: #FFFFFF;
          --c-ink: #1E2620; --c-ink-2: #43504A; --c-ink-3: #7D8A82;
          --c-line: #DDE3D7; --c-line-2: #C4CDB9;
          --c-accent: #2D6E5C; --c-accent-dark: #205144;
          --c-blue: #3B5BA5; --c-amber: #B8851E; --c-rose: #A8425D;
          --c-green: #4A7C3A; --c-red: #B83A2E;
        }
        .dt-root { min-height: 100vh; background: var(--c-bg); color: var(--c-ink); font-family: 'Sarabun', system-ui, sans-serif; padding-bottom: 60px; }
        .dt-root * { box-sizing: border-box; }
        .dt-wrap { max-width: 920px; margin: 0 auto; padding: 22px 16px; }
        .dt-header { margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--c-line); }
        .dt-header-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .dt-title { font-family: 'Prompt', sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -0.01em; margin: 0; display: flex; align-items: center; gap: 8px; }
        .dt-title-tag { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 4px; background: var(--c-accent); color: white; letter-spacing: 0.04em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 3px; }
        .dt-cloud-status { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--c-ink-3); padding: 4px 9px; border-radius: 6px; background: var(--c-bg-2); border: 1px solid var(--c-line); cursor: pointer; transition: all 0.15s; }
        .dt-cloud-status:hover { background: var(--c-line); }
        .dt-cloud-status.connected { color: var(--c-green); border-color: var(--c-green); }
        .dt-date { font-size: 12.5px; color: var(--c-ink-3); font-variant-numeric: tabular-nums; }
        .dt-summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
        .dt-summary-card { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 10px; padding: 12px 14px; }
        .dt-summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--c-ink-3); font-weight: 500; }
        .dt-summary-value { font-family: 'Prompt', sans-serif; font-size: 22px; font-weight: 600; margin-top: 4px; font-variant-numeric: tabular-nums; }
        .dt-summary-value.warn { color: var(--c-amber); }
        .dt-summary-value small { font-size: 12px; font-weight: 400; color: var(--c-ink-3); }

        .dt-view-switch { display: flex; gap: 6px; background: var(--c-bg-2); padding: 4px; border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--c-line); }
        .dt-view-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border: none; background: transparent; font-family: 'Prompt', sans-serif; font-size: 13.5px; font-weight: 500; color: var(--c-ink-2); cursor: pointer; border-radius: 7px; transition: all 0.15s; }
        .dt-view-btn.active { background: var(--c-surface); color: var(--c-ink); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .dt-view-btn:hover:not(.active) { color: var(--c-ink); }

        .dt-actionbar { display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
        .dt-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 8px; border: 1px solid var(--c-line-2); background: var(--c-surface); color: var(--c-ink); font-family: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .dt-btn:hover { background: var(--c-bg-2); border-color: var(--c-ink-3); }
        .dt-btn.primary { background: var(--c-accent); color: white; border-color: var(--c-accent); }
        .dt-btn.primary:hover { background: var(--c-accent-dark); border-color: var(--c-accent-dark); }
        .dt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dt-btn.ghost { background: transparent; border-color: transparent; padding: 6px 8px; color: var(--c-ink-3); }
        .dt-btn.ghost:hover { color: var(--c-ink); background: var(--c-bg-2); }
        .dt-btn.danger:hover { color: var(--c-red); }

        .dt-filters { display: flex; gap: 5px; flex-wrap: wrap; }
        .dt-pill { padding: 6px 11px; border-radius: 999px; border: 1px solid var(--c-line); background: transparent; font-size: 12.5px; font-family: inherit; color: var(--c-ink-2); cursor: pointer; transition: all 0.15s; }
        .dt-pill.active { background: var(--c-ink); color: var(--c-bg); border-color: var(--c-ink); }
        .dt-pill:hover:not(.active):not(:disabled) { background: var(--c-bg-2); }
        .dt-pill:disabled { opacity: 0.4; cursor: not-allowed; }

        .dt-list { display: flex; flex-direction: column; gap: 8px; }
        .dt-card { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 10px; padding: 12px 14px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; transition: all 0.15s; }
        .dt-card:hover { border-color: var(--c-line-2); }
        .dt-card.done { opacity: 0.55; }
        .dt-card.today { border-left: 3px solid var(--c-amber); }
        .dt-card.overdue { border-left: 3px solid var(--c-red); }
        .dt-card-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--c-bg-2); }
        .dt-card-body { min-width: 0; }
        .dt-card-top { display: flex; align-items: center; gap: 7px; margin-bottom: 3px; flex-wrap: wrap; }
        .dt-card-type { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-ink-3); font-weight: 500; }
        .dt-card-title { font-family: 'Prompt', sans-serif; font-size: 15px; font-weight: 500; line-height: 1.3; word-break: break-word; }
        .dt-card.done .dt-card-title { text-decoration: line-through; }
        .dt-card-meta { display: flex; gap: 12px; margin-top: 4px; flex-wrap: wrap; font-size: 12.5px; color: var(--c-ink-2); }
        .dt-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .dt-card-actions { display: flex; gap: 2px; align-items: center; }
        .dt-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
        .dt-badge.overdue { background: #FBE9E7; color: var(--c-red); }
        .dt-badge.today { background: #FFF4E0; color: var(--c-amber); }
        .dt-badge.soon { background: #E8F0FB; color: var(--c-blue); }
        .dt-badge.done { background: #E6F0E0; color: var(--c-green); }
        .dt-badge.fresh { background: #F2EAFA; color: #6B4FA8; }
        .dt-badge.recurring { background: #E3E8EE; color: #4A5568; }

        .dt-empty { text-align: center; padding: 40px 20px; color: var(--c-ink-3); font-size: 13.5px; border: 1px dashed var(--c-line-2); border-radius: 10px; background: var(--c-surface); }

        .dt-overlay { position: fixed; inset: 0; background: rgba(26,25,22,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 100; animation: dt-fade 0.18s ease; }
        @keyframes dt-fade { from { opacity: 0; } to { opacity: 1; } }
        .dt-modal { background: var(--c-surface); border-radius: 14px; padding: 22px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; border: 1px solid var(--c-line); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .dt-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .dt-modal-title { font-family: 'Prompt', sans-serif; font-size: 18px; font-weight: 600; margin: 0; }
        .dt-field { margin-bottom: 12px; }
        .dt-label { display: block; font-size: 12.5px; font-weight: 500; color: var(--c-ink-2); margin-bottom: 5px; }
        .dt-input, .dt-select, .dt-textarea { width: 100%; padding: 9px 11px; border: 1px solid var(--c-line-2); border-radius: 8px; font-family: inherit; font-size: 13.5px; background: var(--c-surface); color: var(--c-ink); outline: none; transition: border-color 0.15s; }
        .dt-input:focus, .dt-select:focus, .dt-textarea:focus { border-color: var(--c-accent); }
        .dt-textarea { resize: vertical; min-height: 58px; }
        .dt-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .dt-checkbox-group { display: flex; gap: 6px; flex-wrap: wrap; }
        .dt-checkbox-label { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--c-line); background: var(--c-surface); font-size: 12.5px; cursor: pointer; transition: all 0.15s; }
        .dt-checkbox-label:hover { background: var(--c-bg-2); }
        .dt-checkbox-label.checked { background: var(--c-accent); color: white; border-color: var(--c-accent); }
        .dt-checkbox-label input { display: none; }

        .dt-skip-dates { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
        .dt-skip-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; background: var(--c-bg-2); border: 1px solid var(--c-line); font-size: 11.5px; }
        .dt-skip-chip button { border: none; background: none; cursor: pointer; padding: 0; color: var(--c-ink-3); display: flex; align-items: center; }
        .dt-skip-chip button:hover { color: var(--c-red); }

        .dt-preview { background: var(--c-bg-2); border: 1px solid var(--c-line); border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.55; font-family: 'Sarabun', monospace; white-space: pre-wrap; max-height: 260px; overflow-y: auto; color: var(--c-ink); }
        .dt-preview-empty { color: var(--c-ink-3); font-style: italic; }
        .dt-mode-row { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
        .dt-mode-info { font-size: 11.5px; color: var(--c-ink-3); margin-bottom: 10px; line-height: 1.5; }
        .dt-mode-info b { color: var(--c-ink-2); font-weight: 500; }

        .dt-section-title { font-family: 'Prompt', sans-serif; font-size: 14.5px; font-weight: 500; color: var(--c-ink-2); margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
        .dt-member-list { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
        .dt-member-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 11px; border-radius: 999px; background: var(--c-bg-2); border: 1px solid var(--c-line); font-size: 12.5px; cursor: pointer; transition: all 0.15s; }
        .dt-member-chip:hover { background: var(--c-line); }
        .dt-member-chip.selected { background: var(--c-accent); color: white; border-color: var(--c-accent); }
        .dt-member-chip button { border: none; background: none; cursor: pointer; padding: 0; color: var(--c-ink-3); display: flex; align-items: center; }
        .dt-member-chip button:hover { color: var(--c-red); }

        .dt-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-top: 10px; }
        .dt-cal-header { text-align: center; font-size: 11px; font-weight: 500; color: var(--c-ink-3); padding: 6px 2px; text-transform: uppercase; letter-spacing: 0.04em; }
        .dt-cal-day { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 6px; padding: 6px 4px; min-height: 60px; font-size: 11px; position: relative; }
        .dt-cal-day.other-month { opacity: 0.3; }
        .dt-cal-day.today { background: var(--c-bg-2); border-color: var(--c-accent); }
        .dt-cal-date { font-family: 'Prompt', sans-serif; font-weight: 500; font-size: 12px; margin-bottom: 3px; }
        .dt-cal-event { background: var(--c-blue); color: white; padding: 2px 4px; border-radius: 3px; font-size: 10px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dt-cal-event.work { background: var(--c-amber); }
        .dt-cal-event.exam { background: var(--c-rose); }
        .dt-cal-event.other { background: var(--c-green); }

        .dt-toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--c-ink); color: var(--c-bg); padding: 11px 18px; border-radius: 8px; font-size: 13.5px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 200; animation: dt-rise 0.25s ease; max-width: 90vw; }
        @keyframes dt-rise { from { opacity: 0; transform: translate(-50%, 10px); } }

        @media (max-width: 640px) {
          .dt-wrap { padding: 16px 12px; }
          .dt-title { font-size: 20px; }
          .dt-summary-row { grid-template-columns: 1fr 1fr; }
          .dt-summary-row > :first-child { grid-column: 1 / -1; }
          .dt-summary-value { font-size: 17px; }
          .dt-row-2 { grid-template-columns: 1fr; }
          .dt-card { grid-template-columns: auto 1fr; }
          .dt-card-actions { grid-column: 1 / -1; justify-content: flex-end; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="dt-root">
        <div className="dt-wrap">
          <header className="dt-header">
            <div className="dt-header-top">
              <h1 className="dt-title">
                ตารางครอบครัว
                <span className="dt-title-tag"><Heart size={11} /> ส่วนตัว</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className={`dt-cloud-status ${cloudConnected ? "connected" : ""}`} onClick={handleConnectCloud}>
                  {cloudConnected ? <Cloud size={13} /> : <CloudOff size={13} />}
                  {cloudConnected ? "ซิงค์แล้ว" : "เก็บในเครื่อง"}
                </div>
                <div className="dt-date">{dateHeader}</div>
              </div>
            </div>
            <div className="dt-summary-row">
              <div className="dt-summary-card">
                <div className="dt-summary-label">วันนี้</div>
                <div className={`dt-summary-value ${todayCount ? "warn" : ""}`}>{todayCount} <small>เรื่อง</small></div>
              </div>
              <div className="dt-summary-card">
                <div className="dt-summary-label">พรุ่งนี้</div>
                <div className="dt-summary-value">{tomorrowCount} <small>เรื่อง</small></div>
              </div>
              <div className="dt-summary-card">
                <div className="dt-summary-label">ที่จะถึง</div>
                <div className="dt-summary-value">{upcomingCount} <small>เรื่อง</small></div>
              </div>
            </div>
          </header>

          <div className="dt-view-switch">
            <button className={`dt-view-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
              <Grid3x3 size={14} /> ทั้งหมด
            </button>
            <button className={`dt-view-btn ${view === "member" ? "active" : ""}`} onClick={() => setView("member")}>
              <User size={14} /> ตามคน
            </button>
          </div>

          {loaded && view === "all" && (
            <FamilySection
              items={scheduleItems} members={members}
              lastShared={lastShared} onShared={saveLastShared}
              onChangeItems={saveSchedule} onChangeMembers={saveMembers}
              showToast={showToast}
            />
          )}
          {loaded && view === "member" && (
            <MemberView
              items={scheduleItems} members={members}
              selectedMember={selectedMember} onSelectMember={setSelectedMember}
              showToast={showToast}
            />
          )}
        </div>
        {toast && <div className="dt-toast">{toast}</div>}
      </div>
    </>
  );
}

// [ส่วนนี้ต่อไปมีการรวมฟังก์ชันเดิมทั้งหมด — FamilySection, ScheduleCard, ScheduleForm, RecurringForm, ShareModal, MemberView]
// เนื่องจากความยาว ผมจะย่อให้เห็นโครงสร้าง แต่ในไฟล์จริงครบ

function FamilySection({ items, members, lastShared, onShared, onChangeItems, onChangeMembers, showToast }) {
  // [ฟังก์ชันเดิม — มี filter, showForm, showRecurringForm, handling recurring events, etc.]
  const [filter, setFilter] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editing, setEditing] = useState(null);
  const [memberInput, setMemberInput] = useState("");

  const filtered = useMemo(() => {
    let list = [...items];
    const t = todayISO();
    if (filter === "today") list = list.filter((i) => i.status !== "done" && i.date === t);
    else if (filter === "upcoming") list = list.filter((i) => i.status !== "done" && i.date >= t);
    else if (filter === "past") list = list.filter((i) => i.status !== "done" && i.date < t);
    else if (filter === "done") list = list.filter((i) => i.status === "done");
    return list.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (b.status === "done" && a.status !== "done") return -1;
      const d = (a.date || "").localeCompare(b.date || "");
      if (d !== 0) return d;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [items, filter]);

  const handleSave = (item) => {
    let next;
    if (item.id) next = items.map((i) => (i.id === item.id ? item : i));
    else next = [...items, { ...item, id: uid(), createdAt: new Date().toISOString() }];
    onChangeItems(next);
    setShowForm(false); setEditing(null);
  };
  const handleDelete = (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    onChangeItems(items.filter((i) => i.id !== id));
  };
  const handleToggle = (id) => {
    onChangeItems(items.map((i) => i.id === id
      ? { ...i, status: i.status === "done" ? "pending" : "done", completedAt: i.status === "done" ? null : new Date().toISOString() }
      : i));
  };
  const addMember = () => {
    const name = memberInput.trim();
    if (!name) return;
    if (members.includes(name)) { showToast("มีชื่อนี้แล้ว"); return; }
    onChangeMembers([...members, name]);
    setMemberInput("");
  };
  const removeMember = (name) => onChangeMembers(members.filter((m) => m !== name));

  const handleSaveRecurring = (pattern) => {
    const newEvents = generateRecurring(pattern, pattern.skipDates);
    onChangeItems([...items, ...newEvents]);
    showToast(`สร้าง ${newEvents.length} รายการแล้ว`);
    setShowRecurringForm(false);
  };

  return (
    <>
      <div className="dt-section-title"><Users size={14} /> สมาชิกในครอบครัว</div>
      <div className="dt-member-list">
        {members.map((m) => (
          <span key={m} className="dt-member-chip">
            {m}
            <button onClick={() => removeMember(m)} title="ลบ"><X size={12} /></button>
          </span>
        ))}
        <span className="dt-member-chip" style={{ background: "transparent", padding: 0 }}>
          <input className="dt-input" style={{ padding: "5px 10px", fontSize: 12.5, width: 130 }}
            placeholder="+ เพิ่มชื่อ" value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()} />
        </span>
      </div>

      <div className="dt-actionbar" style={{ marginTop: 14 }}>
        <button className="dt-btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={15} /> เพิ่มตาราง
        </button>
        <button className="dt-btn" onClick={() => setShowRecurringForm(true)}>
          <Repeat size={14} /> เพิ่มแบบซ้ำ
        </button>
        <button className="dt-btn" onClick={() => setShowShare(true)}>
          <Send size={14} /> สรุปตาราง
        </button>
        <div style={{ flex: 1 }} />
        <div className="dt-filters">
          {[["today","วันนี้"],["upcoming","ที่จะถึง"],["past","ผ่านมาแล้ว"],["done","เสร็จแล้ว"],["all","ทั้งหมด"]].map(([k,l]) => (
            <button key={k} className={`dt-pill ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {lastShared && (
        <div style={{ fontSize: 11.5, color: "var(--c-ink-3)", marginBottom: 10 }}>
          📨 แชร์ครั้งล่าสุด: {formatRelativeTime(lastShared)}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="dt-empty">
          {members.length === 0 ? "เริ่มจากเพิ่มชื่อสมาชิกในครอบครัวก่อน แล้วค่อยเพิ่มตาราง" : "ไม่มีรายการในหมวดนี้"}
        </div>
      ) : (
        <div className="dt-list">
          {filtered.map((item) => (
            <ScheduleCard key={item.id} item={item} lastShared={lastShared}
              onToggle={() => handleToggle(item.id)}
              onEdit={() => { setEditing(item); setShowForm(true); }}
              onDelete={() => handleDelete(item.id)} />
          ))}
        </div>
      )}

      {showForm && (
        <ScheduleForm item={editing} members={members} onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
      {showRecurringForm && (
        <RecurringForm members={members} onSave={handleSaveRecurring} onClose={() => setShowRecurringForm(false)} />
      )}
      {showShare && (
        <ShareModal
          title="สรุปตารางครอบครัว"
          updateText={buildFamilyUpdateText(items, lastShared)}
          fullText={buildFamilyFullText(items)}
          lastShared={lastShared}
          onClose={() => setShowShare(false)}
          onCopied={() => {
            onShared(new Date().toISOString());
            showToast("คัดลอกแล้ว — บันทึกเวลาแชร์");
            setShowShare(false);
          }} />
      )}
    </>
  );
}

// [คอมโพเนนต์เหลือครับ — ฟังก์ชันเดิมทั้งหมด]
function ScheduleCard({ item, lastShared, onToggle, onEdit, onDelete }) {
  const type = SCHEDULE_TYPES[item.type] || SCHEDULE_TYPES.other;
  const Icon = type.icon;
  const days = item.date ? daysFromToday(item.date) : null;
  const isToday = item.status !== "done" && days === 0;
  const isOverdue = item.status !== "done" && days !== null && days < 0;
  const isFresh = lastShared && item.createdAt && item.createdAt > lastShared && item.status !== "done";

  return (
    <div className={`dt-card ${item.status === "done" ? "done" : ""} ${isToday ? "today" : ""} ${isOverdue ? "overdue" : ""}`}>
      <div className="dt-card-icon" style={{ background: `${type.color}15` }}>
        <Icon size={17} style={{ color: type.color }} />
      </div>
      <div className="dt-card-body">
        <div className="dt-card-top">
          <span className="dt-card-type">{type.label}{item.member ? " · " + item.member : ""}</span>
          {item.status === "done" && <span className="dt-badge done"><CheckCircle2 size={11} /> เสร็จ</span>}
          {isToday && <span className="dt-badge today"><Clock size={11} /> วันนี้</span>}
          {isOverdue && <span className="dt-badge overdue">เลย {Math.abs(days)} วัน</span>}
          {!isToday && !isOverdue && days !== null && days > 0 && days <= 3 && item.status !== "done" && (
            <span className="dt-badge soon">อีก {days} วัน</span>
          )}
          {isFresh && <span className="dt-badge fresh">🆕 ใหม่</span>}
          {item.isRecurring && <span className="dt-badge recurring"><Repeat size={10} /> ซ้ำ</span>}
        </div>
        <div className="dt-card-title">{item.title || "(ไม่มีหัวข้อ)"}</div>
        <div className="dt-card-meta">
          {item.date && <span><Calendar size={12} /> {formatThaiDateShort(item.date)}</span>}
          {item.time && <span><Clock size={12} /> {item.time}</span>}
          {item.note && <span style={{ color: "var(--c-ink-3)" }}>· {item.note}</span>}
        </div>
      </div>
      <div className="dt-card-actions">
        <button className="dt-btn ghost" onClick={onToggle}>
          {item.status === "done" ? <X size={15} /> : <Check size={15} />}
        </button>
        {!item.isRecurring && <button className="dt-btn ghost" onClick={onEdit}><Edit3 size={14} /></button>}
        <button className="dt-btn ghost danger" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function ScheduleForm({ item, members, onSave, onClose }) {
  const [type, setType] = useState(item?.type || "study");
  const [member, setMember] = useState(item?.member || (members[0] || ""));
  const [title, setTitle] = useState(item?.title || "");
  const [date, setDate] = useState(item?.date || todayISO());
  const [time, setTime] = useState(item?.time || "");
  const [note, setNote] = useState(item?.note || "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({ ...(item || {}), type, member, title: title.trim(), date, time, note: note.trim(), status: item?.status || "pending" });
  };

  return (
    <div className="dt-overlay" onClick={onClose}>
      <div className="dt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dt-modal-head">
          <h3 className="dt-modal-title">{item ? "แก้ไขตาราง" : "เพิ่มตาราง"}</h3>
          <button className="dt-btn ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dt-row-2">
          <div className="dt-field">
            <label className="dt-label">ประเภท</label>
            <select className="dt-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="study">เรียน</option>
              <option value="work">ทำงาน</option>
              <option value="exam">สอบ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div className="dt-field">
            <label className="dt-label">สมาชิก</label>
            <select className="dt-select" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">(ไม่ระบุ)</option>
              {members.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="dt-field">
          <label className="dt-label">หัวข้อ</label>
          <input className="dt-input" placeholder="เช่น สอบกลางภาควิชาคณิต / ประชุมลูกค้า" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="dt-row-2">
          <div className="dt-field">
            <label className="dt-label">วันที่</label>
            <input className="dt-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="dt-field">
            <label className="dt-label">เวลา</label>
            <input className="dt-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="dt-field">
          <label className="dt-label">หมายเหตุ</label>
          <textarea className="dt-textarea" placeholder="เช่น ห้อง 301 / ลิงก์เอกสาร" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button className="dt-btn" onClick={onClose}>ยกเลิก</button>
          <button className="dt-btn primary" onClick={submit}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function RecurringForm({ members, onSave, onClose }) {
  const [type, setType] = useState("study");
  const [member, setMember] = useState(members[0] || "");
  const [title, setTitle] = useState("");
  const [weekdays, setWeekdays] = useState([]);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [skipDates, setSkipDates] = useState([]);
  const [skipDateInput, setSkipDateInput] = useState("");

  const toggleWeekday = (d) => {
    if (weekdays.includes(d)) setWeekdays(weekdays.filter(w => w !== d));
    else setWeekdays([...weekdays, d].sort((a,b) => a-b));
  };

  const addSkipDate = () => {
    const d = skipDateInput.trim();
    if (!d) return;
    if (skipDates.includes(d)) return;
    setSkipDates([...skipDates, d].sort());
    setSkipDateInput("");
  };

  const submit = () => {
    if (!title.trim() || !weekdays.length || !startDate || !endDate) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    onSave({
      id: uid(),
      type, member, title: title.trim(), weekdays, startDate, endDate, time, note: note.trim(), skipDates,
    });
  };

  return (
    <div className="dt-overlay" onClick={onClose}>
      <div className="dt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dt-modal-head">
          <h3 className="dt-modal-title">เพิ่มตารางแบบซ้ำ (Recurring)</h3>
          <button className="dt-btn ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dt-row-2">
          <div className="dt-field">
            <label className="dt-label">ประเภท</label>
            <select className="dt-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="study">เรียน</option>
              <option value="work">ทำงาน</option>
              <option value="exam">สอบ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div className="dt-field">
            <label className="dt-label">สมาชิก</label>
            <select className="dt-select" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">(ไม่ระบุ)</option>
              {members.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="dt-field">
          <label className="dt-label">หัวข้อ</label>
          <input className="dt-input" placeholder="เช่น เรียนคณิต / เรียนพิเศษภาษาอังกฤษ" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="dt-field">
          <label className="dt-label">วันในสัปดาห์ที่ทำซ้ำ</label>
          <div className="dt-checkbox-group">
            {THAI_DAYS.map((day, i) => (
              <label key={i} className={`dt-checkbox-label ${weekdays.includes(i) ? "checked" : ""}`}>
                <input type="checkbox" checked={weekdays.includes(i)} onChange={() => toggleWeekday(i)} />
                {day}
              </label>
            ))}
          </div>
        </div>
        <div className="dt-row-2">
          <div className="dt-field">
            <label className="dt-label">ตั้งแต่วันที่</label>
            <input className="dt-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="dt-field">
            <label className="dt-label">ถึงวันที่</label>
            <input className="dt-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="dt-field">
          <label className="dt-label">เวลา (เช่น 17:00-18:00)</label>
          <input className="dt-input" placeholder="17:00-18:00" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="dt-field">
          <label className="dt-label">หยุดวันที่ (วันที่ไม่ต้องสร้างรายการ)</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input className="dt-input" type="date" value={skipDateInput} onChange={(e) => setSkipDateInput(e.target.value)} placeholder="เลือกวันหยุด" />
            <button className="dt-btn" onClick={addSkipDate}><Plus size={14} /></button>
          </div>
          {skipDates.length > 0 && (
            <div className="dt-skip-dates">
              {skipDates.map(d => (
                <span key={d} className="dt-skip-chip">
                  {formatThaiDateShort(d)}
                  <button onClick={() => setSkipDates(skipDates.filter(x => x !== d))}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="dt-field">
          <label className="dt-label">หมายเหตุ</label>
          <textarea className="dt-textarea" placeholder="เช่น ห้อง 301 / ครูสมชาย" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button className="dt-btn" onClick={onClose}>ยกเลิก</button>
          <button className="dt-btn primary" onClick={submit}>สร้างตาราง</button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ title, updateText, fullText, lastShared, onClose, onCopied }) {
  const [mode, setMode] = useState(updateText ? "update" : "full");
  const currentText = mode === "update" ? updateText : fullText;

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText).then(() => onCopied(), () => alert("คัดลอกไม่สำเร็จ"));
  };

  return (
    <div className="dt-overlay" onClick={onClose}>
      <div className="dt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dt-modal-head">
          <h3 className="dt-modal-title">{title}</h3>
          <button className="dt-btn ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dt-mode-row">
          <button className={`dt-pill ${mode === "update" ? "active" : ""}`} onClick={() => setMode("update")} disabled={!updateText}>
            📨 อัปเดต
          </button>
          <button className={`dt-pill ${mode === "full" ? "active" : ""}`} onClick={() => setMode("full")}>
            📋 ทั้งหมด
          </button>
        </div>
        <div className="dt-mode-info">
          {mode === "update" ? (
            <><b>โหมดอัปเดต:</b> เสร็จแล้ว/เพิ่มใหม่ ตั้งแต่ครั้งก่อน{lastShared ? ` (${formatRelativeTime(lastShared)})` : ""}</>
          ) : (
            <><b>โหมดทั้งหมด:</b> ตารางวันนี้+พรุ่งนี้</>
          )}
        </div>
        {currentText ? (
          <div className="dt-preview">{currentText}</div>
        ) : (
          <div className="dt-preview">
            <span className="dt-preview-empty">
              {mode === "update" ? "ไม่มีอัปเดตใหม่ — ลองโหมด 'ทั้งหมด'" : "ไม่มีรายการในวันนี้/พรุ่งนี้"}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="dt-btn" onClick={onClose}>ปิด</button>
          <button className="dt-btn primary" onClick={handleCopy} disabled={!currentText}>
            <Copy size={15} /> คัดลอก
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberView({ items, members, selectedMember, onSelectMember, showToast }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!selectedMember && members.length > 0) onSelectMember(members[0]);
  }, [members, selectedMember, onSelectMember]);

  const memberEvents = useMemo(() => {
    return items.filter(i => i.member === selectedMember && i.status !== "done");
  }, [items, selectedMember]);

  const calendarDays = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];
    const prevMonthLast = new Date(y, m - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({ date: null, dayNum: prevMonthLast - i, otherMonth: true });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const evts = memberEvents.filter(e => e.date === dateStr);
      days.push({ date: dateStr, dayNum: d, otherMonth: false, events: evts });
    }
    const endWeekday = lastDay.getDay();
    const nextPadding = 6 - endWeekday;
    for (let i = 1; i <= nextPadding; i++) {
      days.push({ date: null, dayNum: i, otherMonth: true });
    }
    return days;
  }, [currentMonth, memberEvents]);

  const changeMonth = (offset) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const newDate = new Date(y, m - 1 + offset, 1);
    setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return `${THAI_MONTHS[m - 1]} ${y + 543}`;
  }, [currentMonth]);

  if (!selectedMember) {
    return <div className="dt-empty">เพิ่มสมาชิกในครอบครัวก่อนเพื่อดูตารางแยกตามคน</div>;
  }

  return (
    <>
      <div className="dt-section-title"><User size={14} /> เลือกดูตารางของใคร</div>
      <div className="dt-member-list">
        {members.map((m) => (
          <span key={m} className={`dt-member-chip ${m === selectedMember ? "selected" : ""}`} onClick={() => onSelectMember(m)}>
            {m}
          </span>
        ))}
      </div>

      <div className="dt-actionbar" style={{ marginTop: 14 }}>
        <button className="dt-btn" onClick={() => changeMonth(-1)}>← เดือนก่อน</button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "'Prompt', sans-serif", fontWeight: 500, fontSize: 15 }}>
          {monthLabel}
        </div>
        <button className="dt-btn" onClick={() => changeMonth(1)}>เดือนหน้า →</button>
      </div>

      <div className="dt-calendar">
        {THAI_DAYS_SHORT.map((d, i) => (
          <div key={i} className="dt-cal-header">{d}</div>
        ))}
        {calendarDays.map((day, idx) => (
          <div key={idx} className={`dt-cal-day ${day.otherMonth ? "other-month" : ""} ${day.date === todayISO() ? "today" : ""}`}>
            <div className="dt-cal-date">{day.dayNum}</div>
            {day.events && day.events.map(e => (
              <div key={e.id} className={`dt-cal-event ${e.type}`} title={`${e.time || ""} ${e.title}`}>
                {e.time ? e.time.split("-")[0] : ""} {e.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
