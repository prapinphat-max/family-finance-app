
import React, { useState } from 'react';
import { useAuth, supabase } from './useSupabase';
import FamilyApp from './components/FamilyApp';

export default function App() {
  const { user, loading, login, logout } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    setMessage('');

    let email = identifier.trim();

    // support short username เช่น ball / bright / brill
    if (!email.includes('@')) {
      email = `${email}@familyapp.test`;
    }

    const result = await login(email, password);

    if (!result.success) {
      setMessage(result.error?.message || 'Login ไม่สำเร็จ');
      return;
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  if (loading) {
    return <div style={{ padding: 30 }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: 30 }}>
        <h2>Family Calendar Login</h2>

        <button
          onClick={loginWithGoogle}
          style={{
            padding: 12,
            marginBottom: 18,
            display: 'block',
            width: 300,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Continue with Google
        </button>

        <div style={{ marginBottom: 12, color: '#777' }}>
          หรือ login ด้วย username/password
        </div>

        <input
          placeholder="Username หรือ Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          style={{
            padding: 10,
            marginBottom: 10,
            display: 'block',
            width: 300,
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 10,
            marginBottom: 10,
            display: 'block',
            width: 300,
          }}
        />

        <button onClick={handleLogin}>Login</button>

        {message && (
          <div style={{ marginTop: 12, color: 'red' }}>
            {message}
          </div>
        )}
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