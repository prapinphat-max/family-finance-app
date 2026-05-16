import React, { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { LogOut, Plus, Trash2 } from 'lucide-react';
import FamilyApp from './components/FamilyApp';

export default function App() {
  const { user, loading, login, logout, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState('');

  const ADMIN_PASSWORD = 'admin123'; // เปลี่ยนได้

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      showToast('เข้าสู่ระบบ Admin แล้ว');
    } else {
      showToast('รหัส Admin ผิด');
    }
  };

  const handleCreateUser = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('กรุณาใส่ Email และ Password');
      return;
    }
    
    const result = await signup(email, password);
    if (result.success) {
      setEmail('');
      setPassword('');
      showToast('สร้างผู้ใช้แล้ว: ' + email);
    } else {
      showToast('Error: ' + result.error?.message);
    }
  };

  const handleUserLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('กรุณาใส่ Email และ Password');
      return;
    }
    
    const result = await login(email, password);
    if (result.success) {
      setEmail('');
      setPassword('');
      showToast('เข้าสู่ระบบแล้ว');
    } else {
      showToast('Email หรือ Password ผิด');
    }
  };

  if (loading) {
    return <div style={styles.loading}>กำลังโหลด...</div>;
  }

  // Admin Panel
  if (!user && isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.adminPanel}>
          <h2 style={styles.title}>⚙️ Admin Panel - เพิ่มผู้ใช้</h2>
          
          <div style={styles.form}>
            <h3>สร้างผู้ใช้ใหม่</h3>
            <input
              type="email"
              placeholder="Email ของผู้ใช้"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
            />
            <button onClick={handleCreateUser} style={styles.btnCreate}>
              <Plus size={14} /> สร้างผู้ใช้
            </button>
          </div>

          <button onClick={() => setIsAdmin(false)} style={styles.btnBack}>
            กลับ
          </button>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    );
  }

  // Login Page
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPanel}>
          <h1 style={styles.appTitle}>📅 ตารางครอบครัว</h1>
          
          <div style={styles.form}>
            <h3>เข้าสู่ระบบ</h3>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleUserLogin()}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleUserLogin()}
            />
            <button onClick={handleUserLogin} style={styles.btnLogin}>
              เข้าสู่ระบบ
            </button>
          </div>

          <div style={styles.divider}>หรือ</div>

          <div style={styles.adminSection}>
            <h4>Admin?</h4>
            <input
              type="password"
              placeholder="รหัส Admin"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <button onClick={handleAdminLogin} style={styles.btnAdmin}>
              เข้า Admin Panel
            </button>
          </div>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    );
  }

  // Main App
  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <h1 style={styles.appTitle}>📅 ตารางครอบครัว</h1>
        <div style={styles.userInfo}>
          <span>{user.email}</span>
          <button onClick={logout} style={styles.btnLogout}>
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <FamilyApp user={user} />

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f3' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '16px', color: '#43504A' },
  appTitle: { margin: '0', fontSize: '24px', fontWeight: 600, color: '#2D6E5C', textAlign: 'center' },
  loginPanel: { background: 'white', borderRadius: '12px', padding: '40px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
  adminPanel: { background: 'white', borderRadius: '12px', padding: '40px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
  form: { marginBottom: '24px' },
  formH3: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 },
  input: { width: '100%', padding: '12px', border: '1px solid #DDE3D7', borderRadius: '6px', marginBottom: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnLogin: { width: '100%', padding: '12px', background: '#2D6E5C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnCreate: { width: '100%', padding: '12px', background: '#2D6E5C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  btnAdmin: { width: '100%', padding: '12px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnBack: { width: '100%', padding: '12px', background: '#7D8A82', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  divider: { textAlign: 'center', color: '#7D8A82', margin: '24px 0', fontSize: '12px' },
  adminSection: { paddingTop: '24px', borderTop: '1px solid #DDE3D7' },
  appContainer: { minHeight: '100vh', background: '#f5f7f3' },
  header: { background: 'white', padding: '16px', borderBottom: '1px solid #DDE3D7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' },
  btnLogout: { padding: '8px 12px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
  toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1E2620', color: 'white', padding: '12px 20px', borderRadius: '6px', fontSize: '13px', zIndex: 200 },
};