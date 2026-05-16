import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './useSupabase';
import { LogOut, Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import FamilyApp from './components/FamilyApp';

export default function App() {
  const { user, loading, login, signup, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState('');

  const ADMIN_PASSWORD = 'admin123';

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      showToast('โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      return;
    }

    setUsers(data || []);
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword('');
      showToast('เข้าสู่ระบบ Admin แล้ว');
    } else {
      showToast('รหัส Admin ผิด');
    }
  };

  const handleCreateUser = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      showToast('กรุณาใส่ Email, Username และ Password');
      return;
    }

    if (password.length < 6) {
      showToast('Password ต้องยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const result = await signup(email.trim(), password);

    if (!result.success) {
      const msg = result.error?.message || 'สร้างผู้ใช้ไม่สำเร็จ';
      showToast('Error: ' + msg);
      return;
    }

    const authUser = result.data?.user;

    if (authUser) {
      await supabase.from('profiles').upsert({
        id: authUser.id,
        email: email.trim(),
        username: username.trim(),
      });
    }

    setEmail('');
    setPassword('');
    setUsername('');
    showToast('✅ สร้าง user สำเร็จ');
    fetchUsers();
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !username.trim()) {
      showToast('กรุณาใส่ Username');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', editingUser.id);

    if (error) {
      showToast('Error: ' + error.message);
      return;
    }

    showToast('✅ แก้ไข user สำเร็จ');
    setEditingUser(null);
    setUsername('');
    fetchUsers();
  };

  const handleUserLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('กรุณาใส่ Email และ Password');
      return;
    }

    const result = await login(email.trim(), password);

    if (result.success) {
      setEmail('');
      setPassword('');
      showToast('เข้าสู่ระบบแล้ว');
    } else {
      showToast(result.error?.message || 'Email หรือ Password ผิด');
    }
  };

  if (loading) {
    return <div style={styles.loading}>กำลังโหลด...</div>;
  }

  if (!user && isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.adminPanel}>
          <h2 style={styles.title}>⚙️ Admin Panel</h2>

          {!editingUser ? (
            <div style={styles.form}>
              <h3>📝 สร้างผู้ใช้ใหม่</h3>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />

              <div style={styles.passwordGroup}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button onClick={handleCreateUser} style={styles.btnCreate}>
                <Plus size={14} /> สร้างผู้ใช้
              </button>
            </div>
          ) : (
            <div style={styles.form}>
              <h3>✏️ แก้ไข Username</h3>

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />

              <div style={styles.formActions}>
                <button onClick={handleUpdateUser} style={styles.btnUpdate}>
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUsername('');
                  }}
                  style={styles.btnCancel}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          <h3 style={styles.listTitle}>👥 รายชื่อผู้ใช้ ({users.length})</h3>

          <div style={styles.userList}>
            {users.length === 0 ? (
              <div style={styles.empty}>ยังไม่มีผู้ใช้</div>
            ) : (
              users.map((u) => (
                <div key={u.id} style={styles.userItem}>
                  <div>
                    <div style={styles.userEmail}>{u.email}</div>
                    <div style={styles.userUsername}>@{u.username || '-'}</div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setUsername(u.username || '');
                    }}
                    style={styles.btnSmall}
                    title="แก้ไข"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button onClick={() => setIsAdmin(false)} style={styles.btnBack}>
            กลับ
          </button>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPanel}>
          <h1 style={styles.appTitle}>📅 ตารางครอบครัว</h1>

          <div style={styles.form}>
            <h3>🔓 เข้าสู่ระบบ</h3>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()}
            />

            <div style={styles.passwordGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button onClick={handleUserLogin} style={styles.btnLogin}>
              เข้าสู่ระบบ
            </button>
          </div>

          <div style={styles.divider}>หรือ</div>

          <div style={styles.adminSection}>
            <h4>⚙️ Admin?</h4>

            <input
              type="password"
              placeholder="รหัส Admin"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
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
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f7f3',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '16px',
    color: '#43504A',
  },
  appTitle: {
    margin: '0',
    fontSize: '24px',
    fontWeight: 600,
    color: '#2D6E5C',
    textAlign: 'center',
  },
  loginPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  },
  adminPanel: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '90%',
    maxWidth: '600px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    fontWeight: 600,
    textAlign: 'center',
  },
  form: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #DDE3D7',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #DDE3D7',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  passwordGroup: {
    position: 'relative',
    marginBottom: '12px',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '10px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#7D8A82',
    padding: '4px',
  },
  btnLogin: {
    width: '100%',
    padding: '12px',
    background: '#2D6E5C',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnCreate: {
    width: '100%',
    padding: '12px',
    background: '#2D6E5C',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  btnUpdate: {
    flex: 1,
    padding: '10px',
    background: '#2D6E5C',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnCancel: {
    flex: 1,
    padding: '10px',
    background: '#7D8A82',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnAdmin: {
    width: '100%',
    padding: '12px',
    background: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnBack: {
    width: '100%',
    padding: '12px',
    background: '#7D8A82',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
  divider: {
    textAlign: 'center',
    color: '#7D8A82',
    margin: '24px 0',
    fontSize: '12px',
  },
  adminSection: {
    paddingTop: '24px',
    borderTop: '1px solid #DDE3D7',
  },
  listTitle: {
    margin: '24px 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  userItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#F5F7F3',
    borderRadius: '6px',
  },
  userEmail: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#2D6E5C',
  },
  userUsername: {
    fontSize: '11px',
    color: '#7D8A82',
    marginTop: '2px',
  },
  btnSmall: {
    padding: '6px 8px',
    border: '1px solid #DDE3D7',
    background: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#7D8A82',
  },
  empty: {
    textAlign: 'center',
    padding: '20px',
    color: '#7D8A82',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  appContainer: {
    minHeight: '100vh',
    background: '#f5f7f3',
  },
  header: {
    background: 'white',
    padding: '16px',
    borderBottom: '1px solid #DDE3D7',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px',
  },
  btnLogout: {
    padding: '8px 12px',
    background: '#D32F2F',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toast: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1E2620',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '13px',
    zIndex: 200,
    maxWidth: '90%',
    textAlign: 'center',
  },
};