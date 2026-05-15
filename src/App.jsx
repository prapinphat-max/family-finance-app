import React, { useState } from 'react';
import { useAuth } from './useSupabase';
import { LogOut, LogIn, Home } from 'lucide-react';
import FamilyApp from './components/FamilyApp';
import FinanceApp from './components/FinanceApp';

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [activeApp, setActiveApp] = useState('family'); // 'family' or 'finance'

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;500;600&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; background: #F2F4F0; }
        `}</style>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>👨‍👩‍👧 ตารางครอบครัว & บัญชี/การเงิน</h1>
          <p style={styles.loginSubtitle}>เข้าสู่ระบบด้วย Google</p>
          <button style={styles.loginButton} onClick={signInWithGoogle}>
            <span style={styles.loginButtonText}>🔐 เข้าสู่ระบบ</span>
          </button>
          <p style={styles.loginNote}>ข้อมูลของคุณจะถูกเก็บอย่างปลอดภัยบน Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;500;600&display=swap');
        
        :root {
          --c-bg: #F2F4F0;
          --c-bg-2: #E8EBE3;
          --c-surface: #FFFFFF;
          --c-ink: #1E2620;
          --c-ink-2: #43504A;
          --c-ink-3: #7D8A82;
          --c-line: #DDE3D7;
          --c-accent: #2D6E5C;
          --c-accent-dark: #205144;
          --c-amber: #B8851E;
          --c-red: #B83A2E;
        }
        
        * { box-sizing: border-box; }
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Sarabun', system-ui, sans-serif;
          background: var(--c-bg);
          color: var(--c-ink);
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle}>
            {activeApp === 'family' ? '👨‍👩‍👧 ตารางครอบครัว' : '💼 บัญชี/การเงิน'}
          </h1>
          <p style={styles.headerUser}>👤 {user.email}</p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.appTabs}>
            <button
              onClick={() => setActiveApp('family')}
              style={{
                ...styles.tabButton,
                ...(activeApp === 'family' ? styles.tabButtonActive : {}),
              }}
            >
              👨‍👩‍👧 ครอบครัว
            </button>
            <button
              onClick={() => setActiveApp('finance')}
              style={{
                ...styles.tabButton,
                ...(activeApp === 'finance' ? styles.tabButtonActive : {}),
              }}
            >
              💰 บัญชี
            </button>
          </div>

          <button style={styles.logoutButton} onClick={signOut}>
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {activeApp === 'family' ? (
          <FamilyApp user={user} />
        ) : (
          <FinanceApp user={user} />
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>✅ ซิงค์ข้อมูลกับ Supabase | 🚀 Backend: Cloudflare Workers | 📅 Google Sheets/Calendar</p>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--c-bg)',
    display: 'flex',
    flexDirection: 'column',
  },
  
  header: {
    background: 'var(--c-surface)',
    borderBottom: '1px solid var(--c-line)',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  
  headerLeft: {
    flex: 1,
  },
  
  headerTitle: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    fontWeight: 600,
    fontFamily: "'Prompt', sans-serif",
    color: 'var(--c-ink)',
  },
  
  headerUser: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--c-ink-3)',
  },
  
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  
  appTabs: {
    display: 'flex',
    gap: '4px',
    background: 'var(--c-bg-2)',
    padding: '4px',
    borderRadius: '8px',
  },
  
  tabButton: {
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--c-ink-2)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  
  tabButtonActive: {
    background: 'var(--c-surface)',
    color: 'var(--c-ink)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 13px',
    border: '1px solid var(--c-line-2)',
    background: 'var(--c-surface)',
    color: 'var(--c-ink)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  
  main: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  
  footer: {
    background: 'var(--c-surface)',
    borderTop: '1px solid var(--c-line)',
    padding: '12px 24px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--c-ink-3)',
    margin: '24px 0 0 0',
  },
  
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2D6E5C 0%, #1E4D3E 100%)',
  },
  
  loginBox: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    maxWidth: '420px',
  },
  
  loginTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: 600,
    fontFamily: "'Prompt', sans-serif",
    color: '#1E2620',
  },
  
  loginSubtitle: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#7D8A82',
  },
  
  loginButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#2D6E5C',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    marginBottom: '16px',
  },
  
  loginButtonText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  
  loginNote: {
    margin: '0',
    fontSize: '12px',
    color: '#7D8A82',
    lineHeight: 1.5,
  },
  
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F2F4F0',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E8EBE3',
    borderTop: '4px solid #2D6E5C',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
};
