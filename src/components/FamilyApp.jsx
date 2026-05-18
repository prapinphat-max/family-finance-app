import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../useSupabase';

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const COLOR_MAP = { bright: '#2E7D32', brill: '#1565C0', benay: '#7B1FA2', pui: '#795548', 'ปุ้ย': '#795548', ball: '#EF6C00' };
const getColor = (name) => COLOR_MAP[String(name || '').trim().toLowerCase()] || '#607D8B';

const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const todayISO = () => toLocalISO(new Date());

export default function FamilyApp({ user }) {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskMembers, setTaskMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [viewMode, setViewMode] = useState('all');
  const [activeMemberId, setActiveMemberId] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [locationUrl, setLocationUrl] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [zoomUser, setZoomUser] = useState('');
  const [zoomPass, setZoomPass] = useState('');
  const [note, setNote] = useState('');

  const [repeat, setRepeat] = useState(false);
  const [repeatEnd, setRepeatEnd] = useState('');
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [skip, setSkip] = useState('');

  const [subParentId, setSubParentId] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [subStart, setSubStart] = useState('');
  const [subEnd, setSubEnd] = useState('');
  const [subNote, setSubNote] = useState('');
  const [showSubForm, setShowSubForm] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [message, setMessage] = useState('');

  const [showMemberManager, setShowMemberManager] = useState(false);
  const [memberEditingId, setMemberEditingId] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [memberColor, setMemberColor] = useState('#2E7D32');
  const [memberAvatarUrl, setMemberAvatarUrl] = useState('');

  const show = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const load = async () => {
    const [m, t, tm] = await Promise.all([
      supabase.from('family_members').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('date'),
      supabase.from('task_members').select('*').eq('user_id', user.id),
    ]);
    if (m.error) return show(m.error.message);
    if (t.error) return show(t.error.message);
    if (tm.error) return show(tm.error.message);
    setMembers(m.data || []);
    setTasks(t.data || []);
    setTaskMembers(tm.data || []);
  };

  const membersWithColors = useMemo(() => (members || []).map((m) => ({ ...m, color: m.color || getColor(m.name) })), [members]);
  const mainTasks = useMemo(() => (tasks || []).filter((t) => (t.task_level || 'main') !== 'sub'), [tasks]);
  const subTasks = useMemo(() => (tasks || []).filter((t) => t.task_level === 'sub'), [tasks]);

  const getMembersOfTask = (taskId) => {
    const ids = (taskMembers || []).filter((x) => x.task_id === taskId).map((x) => x.member_id);
    return membersWithColors.filter((m) => ids.includes(m.id));
  };
  const isTaskForMember = (task, memberId) => memberId === 'all' || (taskMembers || []).some((x) => x.task_id === task.id && x.member_id === memberId);
  const getSubs = (parentId) => subTasks.filter((s) => s.parent_task_id === parentId).sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

  const visibleMainTasks = useMemo(() => mainTasks.filter((t) => viewMode === 'all' || isTaskForMember(t, activeMemberId)), [mainTasks, viewMode, activeMemberId, taskMembers]);
  const dayTasks = useMemo(() => visibleMainTasks.filter((t) => t.date === selectedDate).sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || ''))), [visibleMainTasks, selectedDate]);

  const calendar = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const arr = [];
    for (let i = 0; i < first.getDay(); i++) arr.push({ empty: true, tasks: [] });
    for (let d = 1; d <= last.getDate(); d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ empty: false, day: d, date: iso, tasks: visibleMainTasks.filter((t) => t.date === iso).sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || ''))) });
    }
    return arr;
  }, [month, visibleMainTasks]);

  const changeMonth = (offset) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y + 543}`;
  }, [month]);

  const toggleMember = (id) => setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleWeekday = (day) => setWeekdays((prev) => prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day].sort());

  const startEdit = (task) => {
    setEditing(task); setShowForm(true);
    setTitle(task.title || ''); setDate(task.date || todayISO()); setStart(task.start_time || ''); setEnd(task.end_time || '');
    setLocationUrl(task.location_url || ''); setZoomUrl(task.zoom_url || ''); setZoomUser(task.zoom_username || ''); setZoomPass(task.zoom_passcode || ''); setNote(task.note || '');
    setSelectedMembers((taskMembers || []).filter((x) => x.task_id === task.id).map((x) => x.member_id));
  };

  const resetForm = () => {
    setEditing(null); setTitle(''); setDate(todayISO()); setStart(''); setEnd(''); setLocationUrl(''); setZoomUrl(''); setZoomUser(''); setZoomPass(''); setNote('');
    setSelectedMembers([]); setRepeat(false); setRepeatEnd(''); setSkip('');
  };

  const save = async () => {
    if (!title.trim()) return show('ใส่ชื่องาน');
    if (!selectedMembers.length) return show('เลือกสมาชิก');

    if (editing) {
      const { error } = await supabase.from('tasks').update({
        title: title.trim(), date, start_time: start, end_time: end, location_url: locationUrl.trim(), zoom_url: zoomUrl.trim(), zoom_username: zoomUser.trim(), zoom_passcode: zoomPass.trim(), note: note.trim()
      }).eq('id', editing.id).eq('user_id', user.id);
      if (error) return show(error.message);
      await supabase.from('task_members').delete().eq('task_id', editing.id).eq('user_id', user.id);
      const r = await supabase.from('task_members').insert(selectedMembers.map((member_id) => ({ task_id: editing.id, member_id, user_id: user.id })));
      if (r.error) return show(r.error.message);
      show('แก้ไขแล้ว'); resetForm(); setShowForm(false); load(); return;
    }

    const makeOne = async (taskDate) => {
      const { data, error } = await supabase.from('tasks').insert({
        title: title.trim(), date: taskDate, start_time: start, end_time: end, location_url: locationUrl.trim(), zoom_url: zoomUrl.trim(), zoom_username: zoomUser.trim(), zoom_passcode: zoomPass.trim(), note: note.trim(), task_level: 'main', user_id: user.id
      }).select().single();
      if (error) throw error;
      const r = await supabase.from('task_members').insert(selectedMembers.map((member_id) => ({ task_id: data.id, member_id, user_id: user.id })));
      if (r.error) throw r.error;
    };

    try {
      if (repeat) {
        if (!repeatEnd) return show('เลือกวันที่สิ้นสุด');
        const skipSet = new Set(skip.split(',').map((x) => x.trim()).filter(Boolean));
        const startDate = new Date(date + 'T00:00:00');
        const endDate = new Date(repeatEnd + 'T00:00:00');
        let count = 0;
        for (let cur = new Date(startDate); cur <= endDate; cur.setDate(cur.getDate() + 1)) {
          const iso = toLocalISO(cur);
          if (weekdays.includes(cur.getDay()) && !skipSet.has(iso)) { await makeOne(iso); count += 1; }
        }
        show(`สร้างตารางซ้ำแล้ว ${count} รายการ`);
      } else { await makeOne(date); show('เพิ่มงานแล้ว'); }
      resetForm(); setShowForm(false); load();
    } catch (e) { show(e.message); }
  };

  const del = async (id) => {
    if (!confirm('ลบรายการนี้?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
    if (error) return show(error.message);
    show('ลบแล้ว'); load();
  };

  const openSubForm = (parentTask) => {
    setSubParentId(parentTask.id); setSubTitle(''); setSubStart(''); setSubEnd(''); setSubNote(''); setShowSubForm(true);
  };

  const addSubTask = async () => {
    if (!subParentId) return show('เลือกงานหลักก่อน');
    if (!subTitle.trim()) return show('ใส่ชื่องานย่อย');
    const parent = mainTasks.find((t) => t.id === subParentId);
    if (!parent) return show('ไม่พบงานหลัก');
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id, title: subTitle.trim(), date: parent.date, start_time: subStart, end_time: subEnd, note: subNote.trim(), task_level: 'sub', parent_task_id: subParentId
    });
    if (error) return show(error.message);
    show('เพิ่มงานย่อยแล้ว'); setSubTitle(''); setSubStart(''); setSubEnd(''); setSubNote(''); setShowSubForm(false); load();
  };

  const toggleSubSelect = (subId) => setSelectedSubIds((prev) => prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]);

  const toggleAllSubs = (subs) => {
    const ids = subs.map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedSubIds.includes(id));
    setSelectedSubIds((prev) => allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
  };

  const deleteSelectedSubs = async (parentId) => {
    const ids = selectedSubIds.filter((id) => subTasks.some((s) => s.id === id && s.parent_task_id === parentId));
    if (!ids.length) return show('ยังไม่ได้เลือกงานย่อย');
    if (!confirm(`ลบงานย่อยที่เลือก ${ids.length} รายการ?`)) return;
    const { error } = await supabase.from('tasks').delete().in('id', ids).eq('user_id', user.id);
    if (error) return show(error.message);
    setSelectedSubIds((prev) => prev.filter((id) => !ids.includes(id)));
    show(`ลบงานย่อยแล้ว ${ids.length} รายการ`); load();
  };


  const resetMemberForm = () => {
    setMemberEditingId(null);
    setMemberName('');
    setMemberColor('#2E7D32');
    setMemberAvatarUrl('');
  };

  const startEditMember = (member) => {
    setMemberEditingId(member.id);
    setMemberName(member.name || '');
    setMemberColor(member.color || getColor(member.name));
    setMemberAvatarUrl(member.avatar_url || '');
  };

  const saveMember = async () => {
    if (!memberName.trim()) return show('ใส่ชื่อสมาชิก');

    if (memberEditingId) {
      const { error } = await supabase
        .from('family_members')
        .update({
          name: memberName.trim(),
          color: memberColor,
          avatar_url: memberAvatarUrl.trim(),
        })
        .eq('id', memberEditingId)
        .eq('user_id', user.id);

      if (error) return show(error.message);

      show('แก้ไขสมาชิกแล้ว');
      resetMemberForm();
      load();
      return;
    }

    const { error } = await supabase
      .from('family_members')
      .insert({
        user_id: user.id,
        name: memberName.trim(),
        color: memberColor,
        avatar_url: memberAvatarUrl.trim(),
      });

    if (error) return show(error.message);

    show('เพิ่มสมาชิกแล้ว');
    resetMemberForm();
    load();
  };

  const deleteMember = async (memberId) => {
    if (!confirm('ลบสมาชิกคนนี้? งานที่ผูกกับสมาชิกอาจได้รับผลกระทบ')) return;

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('user_id', user.id);

    if (error) return show(error.message);

    show('ลบสมาชิกแล้ว');
    load();
  };

  return (
    <div style={styles.page}>
      <div style={styles.calendarCard}>
        <div style={styles.monthBar}>
          <button style={styles.navBtn} onClick={() => changeMonth(-1)}>←</button>
          <b>{monthLabel}</b>
          <button style={styles.navBtn} onClick={() => changeMonth(1)}>→</button>
        </div>
        <div style={styles.calendar}>
          {DAYS.map((d) => <div key={d} style={styles.head}>{d}</div>)}
          {(calendar || []).map((d, i) => (
            <div key={i} onClick={() => d.date && setSelectedDate(d.date)} style={{ ...styles.day, ...(d.date === selectedDate ? styles.selectedDay : {}) }}>
              {d.day && <b style={d.date === todayISO() ? styles.today : {}}>{d.day}</b>}
              {(d.tasks || []).map((t) => {
                const ms = getMembersOfTask(t.id);
                const color = ms.length === 1 ? ms[0].color : '#263238';
                return (
                  <div key={t.id} style={{ ...styles.event, background: color }}>
                    <div>{t.start_time || '--:--'}-{t.end_time || '--:--'} {t.title}</div>
                    <small>{ms.map((m) => m.name).join(', ')}</small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.toolbar}>
          <button style={viewMode === 'all' ? styles.activeTab : styles.tab} onClick={() => { setViewMode('all'); setActiveMemberId('all'); }}>รวม</button>
          <button style={viewMode === 'personal' ? styles.activeTab : styles.tab} onClick={() => { setViewMode('personal'); if (activeMemberId === 'all' && membersWithColors[0]) setActiveMemberId(membersWithColors[0].id); }}>รายคน</button>
          {viewMode === 'personal' && membersWithColors.map((m) => (
            <button key={m.id} onClick={() => setActiveMemberId(m.id)} style={{ ...styles.memberPill, borderColor: m.color, background: activeMemberId === m.id ? m.color : '#fff', color: activeMemberId === m.id ? '#fff' : m.color }}>{m.name}</button>
          ))}
          <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? 'ปิดฟอร์ม' : '+ เพิ่มงาน'}</button>
          <button style={styles.memberManageBtn} onClick={() => setShowMemberManager(!showMemberManager)}>
            {showMemberManager ? 'ปิดสมาชิก' : 'จัดการสมาชิก'}
          </button>
        </div>

        {showMemberManager && (
          <div style={styles.memberManager}>
            <b>จัดการสมาชิก</b>

            <div style={styles.memberFormGrid}>
              <input
                style={styles.input}
                placeholder="ชื่อ เช่น Bright"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
              <input
                style={styles.colorInput}
                type="color"
                value={memberColor}
                onChange={(e) => setMemberColor(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Avatar URL (ไม่ใส่ก็ได้)"
                value={memberAvatarUrl}
                onChange={(e) => setMemberAvatarUrl(e.target.value)}
              />
              <button style={styles.saveBtn} onClick={saveMember}>
                {memberEditingId ? 'บันทึกสมาชิก' : 'เพิ่มสมาชิก'}
              </button>
              {memberEditingId && (
                <button style={styles.cancelBtn} onClick={resetMemberForm}>ยกเลิก</button>
              )}
            </div>

            <div style={styles.memberList}>
              {membersWithColors.map((m) => (
                <div key={m.id} style={styles.memberRow}>
                  <div style={{ ...styles.memberAvatar, background: m.color }}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} style={styles.avatarImg} />
                    ) : (
                      <span>{String(m.name || '?').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b>{m.name}</b>
                    <div style={styles.memberColorText}>{m.color}</div>
                  </div>
                  <button onClick={() => startEditMember(m)}>แก้ไข</button>
                  <button style={styles.deleteBtn} onClick={() => deleteMember(m.id)}>ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <div style={styles.form}>
            <b>{editing ? 'แก้ไขงาน' : 'เพิ่มงาน'}</b>
            <input style={styles.input} placeholder="ชื่อ" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input style={styles.input} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <input style={styles.input} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            <input style={styles.input} placeholder="Map" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
            <input style={styles.input} placeholder="Zoom" value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} />
            <input style={styles.input} placeholder="User" value={zoomUser} onChange={(e) => setZoomUser(e.target.value)} />
            <input style={styles.input} placeholder="Pass" value={zoomPass} onChange={(e) => setZoomPass(e.target.value)} />
            <textarea style={styles.input} placeholder="note" value={note} onChange={(e) => setNote(e.target.value)} />
            <div style={styles.memberSelect}>{membersWithColors.map((m) => (
              <label key={m.id} style={{ ...styles.checkPill, borderColor: m.color, color: m.color }}><input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} />{m.name}</label>
            ))}</div>
            {!editing && (
              <>
                <label><input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> ตารางซ้ำ</label>
                {repeat && <div style={styles.repeatBox}>
                  <div>{DAYS.map((d, idx) => <button key={d} type="button" onClick={() => toggleWeekday(idx)} style={weekdays.includes(idx) ? styles.dayActiveBtn : styles.dayBtn}>{d}</button>)}</div>
                  <input style={styles.input} type="date" value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)} />
                  <input style={styles.input} placeholder="skip เช่น 2026-05-20,2026-05-25" value={skip} onChange={(e) => setSkip(e.target.value)} />
                </div>}
              </>
            )}
            <div style={{ display: 'flex', gap: 8 }}><button style={styles.saveBtn} onClick={save}>บันทึก</button>{editing && <button style={styles.cancelBtn} onClick={resetForm}>ยกเลิก</button>}</div>
          </div>
        )}

        {message && <div style={styles.message}>{message}</div>}
        <h3>{selectedDate}</h3>
        {dayTasks.length === 0 ? <div style={styles.empty}>ไม่มีรายการวันนี้</div> : dayTasks.map((t) => {
          const ms = getMembersOfTask(t.id);
          const color = ms.length === 1 ? ms[0].color : '#263238';
          const subs = getSubs(t.id);
          return (
            <div key={t.id} style={{ ...styles.detailCard, borderLeftColor: color }}>
              <div style={styles.detailTop}><div><b>{t.start_time || '--:--'}-{t.end_time || '--:--'} {t.title}</b><div style={styles.nameRow}>{ms.map((m) => <span key={m.id} style={{ ...styles.nameChip, background: m.color }}>{m.name}</span>)}</div></div><div><button onClick={() => startEdit(t)}>แก้ไข</button><button style={styles.deleteBtn} onClick={() => del(t.id)}>ลบ</button></div></div>
              {t.location_url && <div><a href={t.location_url} target="_blank" rel="noreferrer">📍 Google Maps</a></div>}
              {t.zoom_url && <div><a href={t.zoom_url} target="_blank" rel="noreferrer">🎥 Zoom</a></div>}
              {t.zoom_username && <div style={styles.note}>User/ID: {t.zoom_username}</div>}
              {t.zoom_passcode && <div style={styles.note}>Passcode: {t.zoom_passcode}</div>}
              {t.note && <div style={styles.note}>Note: {t.note}</div>}

              {viewMode === 'personal' && (
                <div style={styles.subBox}>
                  <div style={styles.subHeaderRow}><b>ตารางย่อย / วิชา</b>{subs.length > 0 && <div style={styles.subBulkActions}><label style={styles.bulkLabel}><input type="checkbox" checked={subs.length > 0 && subs.every((s) => selectedSubIds.includes(s.id))} onChange={() => toggleAllSubs(subs)} />เลือกทั้งหมด</label><button style={styles.bulkDeleteBtn} onClick={() => deleteSelectedSubs(t.id)}>ลบที่เลือก</button></div>}</div>
                  {subs.length === 0 ? <div style={styles.empty}>ยังไม่มีงานย่อย</div> : subs.map((s) => (
                    <div key={s.id} style={styles.subItem}><label style={styles.subCheckRow}><input type="checkbox" checked={selectedSubIds.includes(s.id)} onChange={() => toggleSubSelect(s.id)} /><span><b>{s.start_time || '--:--'}-{s.end_time || '--:--'}</b> {s.title}{s.note && <div style={styles.note}>{s.note}</div>}</span></label></div>
                  ))}
                  <button style={styles.addSubBtn} onClick={() => openSubForm(t)}>+ เพิ่มงานย่อย / วิชาใต้รายการนี้</button>
                  {showSubForm && subParentId === t.id && <div style={styles.subForm}><input style={styles.input} placeholder="ชื่อวิชา/งานย่อย" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} /><div style={{ display: 'flex', gap: 6 }}><input style={styles.input} type="time" value={subStart} onChange={(e) => setSubStart(e.target.value)} /><input style={styles.input} type="time" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} /></div><input style={styles.input} placeholder="หมายเหตุของงานย่อย" value={subNote} onChange={(e) => setSubNote(e.target.value)} /><div style={{ display: 'flex', gap: 6 }}><button style={styles.saveBtn} onClick={addSubTask}>บันทึกงานย่อย</button><button style={styles.cancelBtn} onClick={() => setShowSubForm(false)}>ยกเลิก</button></div></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'grid', gridTemplateColumns: '1.45fr .95fr', gap: 12, padding: 16, background: '#F5F7F3', minHeight: '100vh', fontFamily: 'Sarabun, sans-serif' },
  calendarCard: { background: '#fff', border: '1px solid #DDE3D7', borderRadius: 12, padding: 12 },
  monthBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { border: '1px solid #CDD6CC', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' },
  calendar: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 },
  head: { textAlign: 'center', fontWeight: 800, color: '#2D6E5C', padding: 6 },
  day: { minHeight: 120, border: '1px solid #E1E5DE', padding: 5, borderRadius: 8, background: '#fff', cursor: 'pointer', overflow: 'hidden' },
  selectedDay: { outline: '3px solid #2D6E5C' },
  today: { background: '#2D6E5C', color: '#fff', borderRadius: 999, padding: '2px 7px' },
  event: { color: '#fff', fontSize: 11, marginTop: 4, padding: 4, borderRadius: 6, lineHeight: 1.2 },
  panel: { background: '#fff', border: '1px solid #DDE3D7', borderRadius: 12, padding: 12 },
  toolbar: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  tab: { padding: '7px 12px', borderRadius: 999, border: '1px solid #CDD6CC', background: '#fff', cursor: 'pointer', fontWeight: 700 },
  activeTab: { padding: '7px 12px', borderRadius: 999, border: '1px solid #2D6E5C', background: '#2D6E5C', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  memberPill: { padding: '7px 11px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontWeight: 700 },
  addBtn: { marginLeft: 'auto', background: '#2D6E5C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  form: { border: '1px solid #E1E5DE', borderRadius: 10, padding: 10, marginBottom: 10, background: '#FAFAFA', display: 'grid', gap: 6 },
  input: { padding: 8, border: '1px solid #CDD6CC', borderRadius: 7, fontFamily: 'inherit' },
  memberSelect: { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 },
  checkPill: { padding: '5px 9px', borderRadius: 999, border: '1px solid', background: '#fff', fontWeight: 700 },
  repeatBox: { display: 'grid', gap: 6, padding: 8, background: '#F5F7F3', borderRadius: 8, marginTop: 6 },
  dayBtn: { marginRight: 4, border: '1px solid #ccc', background: '#fff', borderRadius: 999, padding: '5px 8px' },
  dayActiveBtn: { marginRight: 4, border: '1px solid #2D6E5C', background: '#2D6E5C', color: '#fff', borderRadius: 999, padding: '5px 8px' },
  saveBtn: { flex: 1, background: '#2D6E5C', color: '#fff', border: 'none', borderRadius: 7, padding: 9, fontWeight: 700 },
  cancelBtn: { flex: 1, background: '#777', color: '#fff', border: 'none', borderRadius: 7, padding: 9, fontWeight: 700 },
  message: { background: '#FFF8E1', border: '1px solid #FFE082', padding: 8, borderRadius: 8, marginBottom: 8 },
  empty: { color: '#7A837C', fontSize: 13, padding: 8 },
  detailCard: { background: '#F8FAF6', borderLeft: '6px solid', borderRadius: 10, padding: 10, marginBottom: 10 },
  detailTop: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  nameRow: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 },
  nameChip: { color: '#fff', borderRadius: 999, padding: '3px 7px', fontSize: 11, fontWeight: 700 },
  deleteBtn: { marginLeft: 5, border: '1px solid #E57373', background: '#fff', color: '#C62828', borderRadius: 6, cursor: 'pointer' },
  note: { fontSize: 12, color: '#4C554F', marginTop: 4 },
  subBox: { marginTop: 8, paddingTop: 8, borderTop: '1px solid #E1E5DE' },
  subHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  subBulkActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bulkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 },
  bulkDeleteBtn: { border: '1px solid #E57373', background: '#fff', color: '#C62828', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontWeight: 700 },
  subItem: { background: '#fff', border: '1px solid #E1E5DE', borderRadius: 7, padding: 7, marginTop: 6, fontSize: 13 },
  subCheckRow: { display: 'flex', alignItems: 'flex-start', gap: 7 },
  addSubBtn: { width: '100%', marginTop: 8, padding: 8, border: '1px dashed #2D6E5C', background: '#fff', color: '#2D6E5C', borderRadius: 7, cursor: 'pointer', fontWeight: 700 },
  subForm: { marginTop: 8, padding: 8, border: '1px solid #DDE3D7', borderRadius: 8, background: '#fff', display: 'grid', gap: 6 },
  memberManageBtn: { background: '#fff', color: '#2D6E5C', border: '1px solid #2D6E5C', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  memberManager: { border: '1px solid #DDE3D7', borderRadius: 10, padding: 10, marginBottom: 10, background: '#FAFAFA', display: 'grid', gap: 8 },
  memberFormGrid: { display: 'grid', gridTemplateColumns: '1fr 52px 1fr auto auto', gap: 6, alignItems: 'center' },
  colorInput: { width: 48, height: 38, padding: 2, border: '1px solid #CDD6CC', borderRadius: 7, background: '#fff' },
  memberList: { display: 'grid', gap: 6 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E1E5DE', borderRadius: 8, padding: 8 },
  memberAvatar: { width: 34, height: 34, borderRadius: 999, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  memberColorText: { color: '#7A837C', fontSize: 11 },

};
