import React, { useState } from 'react';
import { useAuth } from './useSupabase';
import FamilyApp from './components/FamilyApp';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    const result = await login(email, password);

    if (!result.success) {
      setMessage(result.error?.message || 'Login ไม่สำเร็จ');
      return;
    }

    setMessage('');
  };

  if (loading) {
    return <div style={{ padding: 30 }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: 30 }}>
        <h2>Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, marginBottom: 10, display: 'block', width: 300 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, marginBottom: 10, display: 'block', width: 300 }}
        />

        <button onClick={handleLogin}>Login</button>

        {message && <div style={{ marginTop: 12, color: 'red' }}>{message}</div>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
        Login: {user.email}
        <button onClick={logout} style={{ marginLeft: 12 }}>
          Logout
        </button>
      </div>

      <FamilyApp user={user} />
    </div>
  );
}