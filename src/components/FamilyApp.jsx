import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery, useSupabaseMutation, supabase } from '../useSupabase';
import { Plus, Check, X, Clock, Calendar, Edit3, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';

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

const formatThaiDateFull = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return `${THAI_DAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
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
  const [activeTab, setActiveTab] = useState("list"); // list, calendar, summary
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [memberInput, setMemberInput] = useState("");
  const [toast, setToast] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: memberData } = useSupabaseQuery('family_members', user.id);
  const { data: scheduleData } = useSupabaseQuery('schedule_items', user.id);
  const { insert: insertMember, delete_: deleteMember } = useSupabaseMutation();
  const { insert: insertSchedule, update: updateSchedule, delete_: deleteSchedule } = useSupabaseMutation();

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

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('user_id', user.id);
    if (!error) setScheduleItems(data);
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
    if (editing) {
      const result = await updateSchedule('schedule_items', editing.id, { ...item });
      if (result.success) {
        setShowForm(false);
        setEditing(null);
        showToast("แก้ไขแล้ว");
        fetchSchedules();
      }
    } else {
      const result = await insertSchedule('schedule_items', {
        user_id: user.id,
        ...item,
      });
      if (result.success) {
        setShowForm(false);
        showToast("เพิ่มตารางแล้ว");
        fetchSchedules();
      }
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    await deleteSchedule('schedule_items', id);
    showToast("ลบแล้ว");
    fetchSchedules();
  };

  const handleToggleSchedule = async (id, status) => {
    const newStatus = status === "done" ? "pending" : "done";
    await updateSchedule('schedule_items', id, { status: newStatus });
    fetchSchedules();
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

  // Calendar view
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const getSchedulesForDate = (date) => {
    if (!date) return [];
    const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return scheduleItems.filter(item => item.date === iso && item.status !== "done");
  };

  // Summary by member
  const summaryByMember = useMemo(() => {
    const summary = {};
    members.forEach(m => {
      summary[m.id] = scheduleItems.filter(s => s.member_id === m.id && s.status !== "done");
    });
    return summary;
  }, [members, scheduleItems]);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📅 ตารางครอบครัว</h2>
        <button style={styles.btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> เพิ่มตาราง
        </button>
      </div>

      {/* Members Section */}
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

      {/* Tabs */}
      <div style={styles.tabs}>
        {[["list","📋 รายการ"],["calendar","📅 ปฏิทิน"],["summary","👥 สรุป"]].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{...styles.tab, ...(activeTab === k ? styles.tabActive : {})}}>
            {l}
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {activeTab === "list" && (
        <div>
          <div style={styles.filterBar}>
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
                    {members.find(m => m.id === item.member_id) && (
                      <div style={styles.cardMember}>👤 {members.find(m => m.id === item.member_id)?.name}</div>
                    )}
                    <div style={styles.cardMeta}>
                      {item.date && <span><Calendar size={12} /> {formatThaiDateShort(item.date)}</span>}
                      {formatTimeRange(item.start_time, item.end_time) && <span><Clock size={12} /> {formatTimeRange(item.start_time, item.end_time)}</span>}
                    </div>
                    {item.note && <div style={styles.cardNote}>{item.note}</div>}
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => { setEditing(item); setShowForm(true); }} style={styles.btnSmall} title="แก้ไข">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleToggleSchedule(item.id, item.status)} style={styles.btnSmall} title={item.status === "done" ? "ยกเลิก" : "สำเร็จ"}>
                      {item.status === "done" ? <X size={14} /> : <Check size={14} />}
                    </button>
                    <button onClick={() => handleDeleteSchedule(item.id)} style={styles.btnSmall} title="ลบ">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <div style={styles.calendarSection}>
          <div style={styles.calendarHeader}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={styles.btnNav}>
              <ChevronLeft size={16} />
            </button>
            <h3 style={styles.calendarTitle}>
              {THAI_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}
            </h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={styles.btnNav}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={styles.weekdays}>
            {THAI_DAYS.map(day => (
              <div key={day} style={styles.weekday}>{day}</div>
            ))}
          </div>

          <div style={styles.daysGrid}>
            {calendarDays.map((date, idx) => {
              const schedules = getSchedulesForDate(date);
              return (
                <div key={idx} style={{...styles.dayCell, ...(date && date.toDateString() === new Date().toDateString() ? styles.dayToday : {})}}>
                  {date && (
                    <>
                      <div style={styles.dayNumber}>{date.getDate()}</div>
                      <div style={styles.daySchedules}>
                        {schedules.slice(0, 2).map(s => (
                          <div key={s.id} style={styles.dayScheduleItem} title={s.title}>
                            {s.title.substring(0, 8)}
                          </div>
                        ))}
                        {schedules.length > 2 && (
                          <div style={styles.dayMore}>+{schedules.length - 2}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUMMARY VIEW */}
      {activeTab === "summary" && (
        <div style={styles.summarySection}>
          {members.length === 0 ? (
            <div style={styles.empty}>ยังไม่มีสมาชิก</div>
          ) : (
            members.map(member => (
              <div key={member.id} style={styles.summaryCard}>
                <h4 style={styles.summaryTitle}>👤 {member.name}</h4>
                {summaryByMember[member.id]?.length === 0 ? (
                  <div style={styles.summaryEmpty}>ไม่มีตารางสำหรับสมาชิกนี้</div>
                ) : (
                  <div style={styles.summaryList}>
                    {summaryByMember[member.id]?.map(item => (
                      <div key={item.id} style={styles.summaryItem}>
                        <div>{item.title}</div>
                        <div style={styles.summaryMeta}>{formatThaiDateShort(item.date)} {formatTimeRange(item.start_time, item.end_time)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
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
  const [memberId, setMemberId] = useState(item?.member_id || "");
  const [date, setDate] = useState(item?.date || todayISO());
  const [startTime, setStartTime] = useState(item?.start_time || "");
  const [endTime, setEndTime] = useState(item?.end_time || "");
  const [mapLink, setMapLink] = useState(item?.map_link || "");
  const [note, setNote] = useState(item?.note || "");

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      type,
      title: title.trim(),
      member_id: memberId ? parseInt(memberId) : null,
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
        
        <select style={styles.input} value={memberId} onChange={e => setMemberId(e.target.value)}>
          <option value="">-- เลือกสมาชิก (ไม่บังคับ) --</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

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
  root: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: '0', fontSize: '20px', fontWeight: 600 },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '14px', fontWeight: 500, color: '#43504A', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' },
  memberList: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
  memberChip: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#E8EBE3', borderRadius: '999px', fontSize: '13px' },
  memberDelete: { border: 'none', background: 'none', cursor: 'pointer', color: '#7D8A82', padding: '0 2px' },
  memberInput: { padding: '6px 12px', border: '1px solid #DDE3D7', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' },
  btnPrimary: { padding: '8px 13px', background: '#2D6E5C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #DDE3D7' },
  tab: { padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#7D8A82', borderBottom: '2px solid transparent' },
  tabActive: { color: '#2D6E5C', borderBottomColor: '#2D6E5C' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '16px' },
  pill: { padding: '6px 11px', border: '1px solid #DDE3D7', borderRadius: '999px', background: 'transparent', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  pillActive: { background: '#1E2620', color: 'white', borderColor: '#1E2620' },
  empty: { textAlign: 'center', padding: '40px', color: '#7D8A82', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { background: 'white', border: '1px solid #DDE3D7', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  cardDone: { opacity: 0.5 },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: 500, marginBottom: '4px' },
  cardMember: { fontSize: '12px', color: '#2D6E5C', marginBottom: '4px', fontWeight: 500 },
  cardMeta: { display: 'flex', gap: '10px', fontSize: '12px', color: '#43504A', marginBottom: '4px' },
  cardNote: { fontSize: '12px', color: '#7D8A82', marginTop: '4px', fontStyle: 'italic' },
  cardActions: { display: 'flex', gap: '4px' },
  btnSmall: { padding: '4px 6px', border: '1px solid #DDE3D7', background: 'transparent', borderRadius: '4px', cursor: 'pointer', color: '#7D8A82' },
  calendarSection: { background: 'white', border: '1px solid #DDE3D7', borderRadius: '8px', padding: '16px' },
  calendarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  calendarTitle: { margin: '0', fontSize: '16px', fontWeight: 600 },
  btnNav: { padding: '6px 10px', border: '1px solid #DDE3D7', background: 'transparent', borderRadius: '4px', cursor: 'pointer' },
  weekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' },
  weekday: { padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#43504A' },
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  dayCell: { minHeight: '80px', border: '1px solid #DDE3D7', borderRadius: '4px', padding: '4px', fontSize: '11px' },
  dayToday: { background: '#E8EBE3' },
  dayNumber: { fontWeight: 600, marginBottom: '4px' },
  daySchedules: { display: 'flex', flexDirection: 'column', gap: '2px' },
  dayScheduleItem: { background: '#2D6E5C', color: 'white', padding: '2px 4px', borderRadius: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dayMore: { color: '#2D6E5C', fontWeight: 600 },
  summarySection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  summaryCard: { background: 'white', border: '1px solid #DDE3D7', borderRadius: '8px', padding: '12px' },
  summaryTitle: { margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 },
  summaryEmpty: { color: '#7D8A82', fontSize: '12px', fontStyle: 'italic' },
  summaryList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  summaryItem: { padding: '8px', background: '#F5F7F3', borderRadius: '4px' },
  summaryMeta: { fontSize: '11px', color: '#7D8A82', marginTop: '2px' },
  overlay: { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'white', borderRadius: '10px', padding: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #DDE3D7', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #DDE3D7', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', fontFamily: 'inherit', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  btnCancel: { padding: '8px 12px', border: '1px solid #DDE3D7', background: 'transparent', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1E2620', color: 'white', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', zIndex: 200 },
};