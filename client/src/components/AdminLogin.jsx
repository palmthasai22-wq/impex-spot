import React, { useState } from 'react';
import { adminLogin } from '../utils/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminLogin({ username, password });
      onLogin(res.token);
      toast.success('เข้าสู่ระบบสำเร็จ');
    } catch (err) {
      toast.error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-full items-center justify-center overflow-hidden bg-slate-950 bg-cover bg-center px-4 py-10 sm:p-8"
      style={{ backgroundImage: "url('/images/login_admin.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />

      <form onSubmit={handleLogin} className="relative w-full max-w-md border border-white/40 bg-slate-900/30 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-10 animate-bounce-in">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <img src="/images/mascot_pin.png" alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-black">Admin Login</h2>
          <p className="mt-1 text-sm font-medium text-white/75">ImpEx Spot Admin Panel</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">ชื่อผู้ใช้</span>
            <div className="flex items-center rounded-full border border-white/45 bg-white/10 px-4 transition-colors focus-within:border-white/80 focus-within:bg-white/20">
              <input type="text" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm font-medium text-white outline-none placeholder:text-white/70"
                placeholder="ชื่อผู้ใช้" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
              <FiUser size={20} className="shrink-0 text-white" aria-hidden="true" />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">รหัสผ่าน</span>
            <div className="flex items-center rounded-full border border-white/45 bg-white/10 px-4 transition-colors focus-within:border-white/80 focus-within:bg-white/20">
              <input type={showPassword ? 'text' : 'password'} className="min-w-0 flex-1 bg-transparent py-3.5 text-sm font-medium text-white outline-none placeholder:text-white/70"
                placeholder="รหัสผ่าน" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="ml-2 shrink-0 rounded-full p-1 text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
              <FiLock size={20} className="ml-1.5 shrink-0 text-white" aria-hidden="true" />
            </div>
          </label>

          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-white py-3.5 text-base font-black text-slate-800 shadow-lg transition-all hover:bg-green-50 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </form>
    </div>
  );
}
