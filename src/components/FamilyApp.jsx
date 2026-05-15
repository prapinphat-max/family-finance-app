import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery, useSupabaseMutation, supabase } from '../useSupabase';
import { Plus, Check, X, Clock, Calendar, Edit3, Trash2, Users, Repeat } from 'lucide-react';

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const formatThaiDateShort = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime && !endTime) return "";
  if (startTime && endTime) return `${startTime}-${endTime}`;
  if (startTime) return startTime;
  return "";
};

export default function FamilyApp({ user }) {
  const [members, setMembers] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [memberInput, setMemberInput] = useState("");
  const [toast, setToast] = useState("");

  const { data: memberData } = useSupabaseQuery('family_members', user.id);
  const { data: scheduleData } = useSupabaseQuery('schedule_items', user.id);
  const { insert: insertMember, delete_: deleteMember } = useSupabaseMutation();
  const { insert: insertSchedule, update: updateSchedule, delete_: deleteSchedule } = useSupabaseMutation();

  // Sync data from Supabase
  useEffect(() => {
    if (memberData) setMembers(memberData);
  }, [memberData]);

  useEffect(() => {
    if (scheduleData) setScheduleItems(scheduleData);
  }, [scheduleData]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleAddMember = async () => {
    const name = memberInput.trim();
    if (!name) return;
    if (members.some(m => m.name === name)) {
      showToast("มีชื่อนี้แล้ว");
      return;
    }
    const result = await insertMember('family_members', {
      user_id: user.id,
      name,
    });
    if (result.success) {
      setMemberInput("");
      showToast("เพิ่มสมาชิกแล้ว");
    }
  };

  const handleRemoveMember = async (id) => {
    if (!confirm("ลบสมาชิกนี้?")) return;
    await deleteMember('family_members', id);
    showToast("ลบสมาชิกแล้ว");
  };

  const handleAddSchedule = async (item) => {
    const result = await insertSchedule('schedule_items', {
      user_id: user.id,
      ...item,
    });
    if (result.success) {
      setShowForm(false);
      showToast("เพิ่มตารางแล้ว");
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    await deleteSchedule('schedule_items', id);
    showToast("ลบแล้ว");
  };

  const handleToggleSchedule = async (id, status) => {
    const newStatus = status === "done" ? "pending" : "done";
    await updateSchedule('schedule_items', id, { status: newStatus });
  };

  const filtered = useMemo(() => {
    let list = [...scheduleItems];
    const t = todayISO();
    if (filter === "today") list = list.filter(i => i.status !== "done" && i.date === t);
    else if (filter === "upcoming") list = list.filter(i => i.status !== "done" && i.date >= t);
    else if (filter === "done") list = list.filter(i => i.status === "done");
    
    return list.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (b.status === "done" && a.status !== "done") return -1;
      return (a.date || "").localeCompare(b.date || "");
    });
  }, [scheduleItems, filter]);

  return (
    <div style={styles.root}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><Users size={16} /> สมาชิกในครอบครัว</h3>
        <div style={styles.memberList}>
          {members.map(m => (
            <div key={m.id} style={styles.memberChip}>
              {m.name}
              <button onClick={() => handleRemoveMember(m.id)} style={styles.memberDelete}>✕</button>
            </div>
          ))}
          <input
            style={styles.memberInput}
            placeholder="+ เพิ่มชื่อ"
            value={memberInput}
            onChange={e => setMemberInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddMember()}
          />
        </div>
      </div>

      <div style={styles.actionbar}>
        <button style={styles.btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> เพิ่มตาราง
        </button>
        <div style={{ flex: 1 }} />
        {[["today","วันนี้"],["upcoming","ที่จะถึง"],["done","เสร็จแล้ว"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{...styles.pill, ...(filter === k ? styles.pillActive : {})}}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>ไม่มีรายการ</div>
      ) : (
        <div style={styles.list}>
          {filtered.map(item => (
            <div key={item.id} style={{...styles.card, ...(item.status === "done" ? styles.cardDone : {})}}>
              <div style={styles.cardContent}>
                <div style={styles.cardTitle}>{item.title}</div>
                <div style={styles.cardMeta}>
                  {item.date && <span><Calendar size={12} /> {formatThaiDateShort(item.date)}</span>}
                  {formatTimeRange(item.start_time, item.end_time) && <span><Clock size={12} /> {formatTimeRange(item.start_time, item.end_time)}</span>}
                </div>
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => handleToggleSchedule(item.id, item.status)} style={styles.btnSmall}>
                  {item.status === "done" ? <X size={14} /> : <Check size={14} />}
                </button>
                <button onClick={() => handleDeleteSchedule(item.id)} style={styles.btnSmall}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ScheduleForm
          members={members}
          item={editing}
          onSave={handleAddSchedule}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function ScheduleForm({ members, item, onSave, onClose }) {
  const [type, setType] = useState(item?.type || "study");
  const [title, setTitle] = useState(item?.title || "");
  const [date, setDate] = useState(item?.date || todayISO());
  const [startTime, setStartTime] = useState(item?.start_time || "");
  const [endTime, setEndTime] = useState(item?.end_time || "");
  const [mapLink, setMapLink] = useState(item?.map_link || "");
  const [note, setNote] = useState(item?.note || "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      type,
      title: title.trim(),
      date,
      start_time: startTime,
      end_time: endTime,
      map_link: mapLink.trim(),
      note: note.trim(),
      status: "pending",
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>{item ? "แก้ไข" : "เพิ่ม"}ตาราง</h3>
        <input style={styles.input} placeholder="หัวข้อ" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input style={styles.input} type="time" placeholder="เวลาเริ่ม" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <input style={styles.input} type="time" placeholder="เวลาจบ" value={endTime} onChange={e => setEndTime(e.target.value)} />
        <input style={styles.input} type="url" placeholder="ลิงก์ Map" value={mapLink} onChange={e => setMapLink(e.target.value)} />
        <textarea style={styles.textarea} placeholder="หมายเหตุ" value={note} onChange={e => setNote(e.target.value)} />
        <div style={styles.modalActions}>
          <button style={styles.btnCancel} onClick={onClose}>ยกเลิก</button>
          <button style={styles.btnPrimary} onClick={submit}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { padding: '0' },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '14px', fontWeight: 500, color: '#43504A', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' },
  memberList: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  memberChip: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#E8EBE3', borderRadius: '999px', fontSize: '13px' },
  memberDelete: { border: 'none', background: 'none', cursor: 'pointer', color: '#7D8A82', padding: '0 2px' },
  memberInput: { padding: '6px 12px', border: '1px solid #DDE3D7', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' },
  actionbar: { display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' },
  btnPrimary: { padding: '8px 13px', background: '#2D6E5C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  pill: { padding: '6px 11px', border: '1px solid #DDE3D7', borderRadius: '999px', background: 'transparent', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  pillActive: { background: '#1E2620', color: 'white', borderColor: '#1E2620' },
  empty: { textAlign: 'center', padding: '40px', color: '#7D8A82', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { background: 'white', border: '1px solid #DDE3D7', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardDone: { opacity: 0.5 },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: 500, marginBottom: '4px' },
  cardMeta: { display: 'flex', gap: '10px', fontSize: '12px', color: '#43504A' },
  cardActions: { display: 'flex', gap: '4px' },
  btnSmall: { padding: '4px 6px', border: '1px solid #DDE3D7', background: 'transparent', borderRadius: '4px', cursor: 'pointer', color: '#7D8A82' },
  overlay: { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '10px', padding: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #DDE3D7', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #DDE3D7', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', fontFamily: 'inherit', minHeight: '60px', resize: 'vertical' },
  modalActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  btnCancel: { padding: '8px 12px', border: '1px solid #DDE3D7', background: 'transparent', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1E2620', color: 'white', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', zIndex: 200 },
};
