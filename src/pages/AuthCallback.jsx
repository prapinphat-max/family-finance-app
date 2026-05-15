import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // Auth token อยู่ใน URL hash แล้ว
    // Supabase จะ parse มันอัตโนมัติ
    // Redirect กลับ home
    window.location.href = '/';
  }, []);

  return <div>กำลังเข้าสู่ระบบ...</div>;
}