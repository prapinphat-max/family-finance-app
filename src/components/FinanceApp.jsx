import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabase';
import { Plus, Check, X, Calendar, Edit3, Trash2, Receipt, DollarSign } from 'lucide-react';

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const formatThaiDateShort = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
};

const formatMoney = (n) => (Number(n)||0).toLocaleString("th-TH",{minimumFractionDigits:0,maximumFractionDigits:2});

const daysFromToday = (iso) => {
  if (!iso) return 0;
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / (1000*60*60*24));
};

export default function FinanceApp({ user }) {
  const [tab, setTab] = useState("credit");
  const [financeItems, setFinanceItems] = useState([]);
  const [filter, setFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");

  const { data: financeData } = useSupabaseQuery('finance_items', user.id);
  const { insert: insertFinance, update: updateFinance, delete_: deleteFinance } = useSupabaseMutation();

  useEffect(() => {
    if (financeData) setFinanceItems(financeData);
  }, [financeData]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleAddFinance = async (item) => {
    const result = await insertFinance('finance_items', {
      user_id: user.id,
      ...item,
    });
    if (result.success) {
      setShowForm(false);
      showToast("เพิ่มรายการแล้ว");
    }
  };

  const handleDeleteFinance = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    await deleteFinance('finance_items', id);
    showToast("ลบแล้ว");
  };

  const handleToggleFinance = async (id, status) => {
    const newStatus = status === "done" ? "pending" : "done";
    await updateFinance('finance_items', id, { status: newStatus });
  };

  const scopeItems = useMemo(() => financeItems.filter(i => i.type === tab), [financeItems, tab]);

  const filtered = useMemo(() => {
    let list = [...scopeItems];
    if (filter === "active") list = list.filter(i => i.status !== "done");
    else if (filter === "done") list = list.filter(i => i.status === "done");
    
    return list.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (b.status === "done" && a.status !== "done") return -1;
      return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
    });
  }, [scopeItems, filter]);

  const totalActive = scopeItems.filter(i => i.status !== "done").reduce((s,i) => s + (Number(i.amount)||0), 0);

  return (
    <div style={styles.root}>
      <div style={styles.summary}>
        <div>รอเก็บ: <strong>฿{formatMoney(totalActive)}</strong></div>
      </div>

      <div style={styles.tabs}>
        {["credit","cash","check"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{...styles.tab, ...(tab === t ? styles.tabActive : {})}}>
            {t === "credit" ? "ขายเชื่อ" : t === "cash" ? "บิลเงินสด" : "เช็ค"}
          </button>
        ))}
      </div>

      <div style={styles.actionbar}>
        <button style={styles.btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> เพิ่ม
        </button>
        <div style={{ flex: 1 }} />
        {[["active","รอเก็บ"],["done","เก็บแล้ว"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{...styles.pill, ...(filter === k ? styles.pillActive : {})}}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>ไม่มีรายการ</div>
      ) : (
        <div style={styles.list}>
          {filtered.map(item => {
            const days = item.due_date ? daysFromToday(item.due_date) : null;
            const isOverdue = item.status !== "done" && days !== null && days < 0;
            
            return (
              <div key={item.id} style={{...styles.card, ...(item.status === "done" ? styles.cardDone : {}), ...(isOverdue ? styles.cardOverdue : {})}}>
                <div style={styles.cardContent}>
                  <div style={styles.cardTitle}>{item.title || "(ไม่มีหัวข้อ)"}</div>
                  <div style={styles.cardMeta}>
                    {item.contact && <span>{item.contact}</span>}
                    {item.amount && <span>฿{formatMoney(item.amount)}</span>}
                    {item.due_date && <span><Calendar size={12} /> {formatThaiDateShort(item.due_date)}</span>}
                  </div>
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => handleToggleFinance(item.id, item.status)} style={styles.btnSmall}>
                    {item.status === "done" ? <X size={14} /> : <Check size={14} />}
                  </button>
                  <button onClick={() => handleDeleteFinance(item.id)} style={styles.btnSmall}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <FinanceForm
          type={tab}
          item={editing}
          onSave={handleAddFinance}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function FinanceForm({ type, item, onSave, onClose }) {
  const [title, setTitle] = useState(item?.title || "");
  const [contact, setContact] = useState(item?.contact || "");
  const [amount, setAmount] = useState(item?.amount || "");
  const [dueDate, setDueDate] = useState(item?.due_date || "");
  const [reason, setReason] = useState(item?.reason || "");
  const [note, setNote] = useState(item?.note || "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      type,
      title: title.trim(),
      contact: contact.trim(),
      amount: Number(amount) || 0,
      due_date: dueDate,
      reason,
      note: note.trim(),
      status: "pending",
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>{item ? "แก้ไข" : "เพิ่ม"}รายการ</h3>
        <input style={styles.input} placeholder="เลขบิล" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <input style={styles.input} placeholder="ลูกค้า" value={contact} onChange={e => setContact(e.target.value)} />
        <input style={styles.input} type="number" placeholder="จำนวนเงิน" value={amount} onChange={e => setAmount(e.target.value)} />
        <input style={styles.input} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        {type === "cash" && (
          <select style={styles.input} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">เลือกสาเหตุ</option>
            <option value="ฝากบิล">ฝากบิล</option>
            <option value="เช็คล่วงหน้า">เช็คล่วงหน้า</option>
            <option value="พนักงานยังไม่ส่ง">พนักงานยังไม่ส่ง</option>
            <option value="โอนไม่เข้า">โอนไม่เข้า</option>
          </select>
        )}
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
  summary: { padding: '12px 16px', background: 'white', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#43504A' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '16px', background: '#E8EBE3', padding: '4px', borderRadius: '8px' },
  tab: { flex: 1, padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, borderRadius: '6px', fontFamily: 'inherit' },
  tabActive: { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  actionbar: { display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' },
  btnPrimary: { padding: '8px 13px', background: '#2D6E5C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  pill: { padding: '6px 11px', border: '1px solid #DDE3D7', borderRadius: '999px', background: 'transparent', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  pillActive: { background: '#1E2620', color: 'white', borderColor: '#1E2620' },
  empty: { textAlign: 'center', padding: '40px', color: '#7D8A82', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { background: 'white', border: '1px solid #DDE3D7', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardDone: { opacity: 0.5 },
  cardOverdue: { borderLeft: '3px solid #B83A2E' },
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
