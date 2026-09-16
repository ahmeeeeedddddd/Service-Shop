'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithUsername, getCurrentUserSession } from '@/lib/auth';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { language } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const session = await getCurrentUserSession();
        if (session && isMounted) {
          if (session.role === 'operator_main') router.push('/main-shop');
          else if (session.role === 'operator_body') router.push('/body-shop');
          else router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg(language === 'ar' ? 'الرجاء إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithUsername(username, password);
      if (res.role === 'operator_main') {
        router.push('/main-shop');
      } else if (res.role === 'operator_body') {
        router.push('/body-shop');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(
        err.message || (language === 'ar' ? 'خطأ في تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور' : 'Invalid username or password')
      );
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userVal: string) => {
    setUsername(userVal);
    setPassword('123456');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-zinc-900">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-2xl bg-yellow-400 text-zinc-950 shadow-lg shadow-yellow-400/20 mb-2">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">مركز الأنصاري لصيانة السيارات</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">El-Ansary Service Center</p>
        </div>

        {/* Quick Role Shortcuts for Demonstration */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <p className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider">
            {language === 'ar' ? 'اختر حساباً للتسجيل السريع:' : 'Quick Select User:'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('main')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                username === 'main'
                  ? 'bg-yellow-400 text-zinc-950 border-yellow-500 shadow-sm'
                  : 'bg-white text-zinc-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              main
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('body')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                username === 'body'
                  ? 'bg-yellow-400 text-zinc-950 border-yellow-500 shadow-sm'
                  : 'bg-white text-zinc-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              body
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('elansary')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                username === 'elansary'
                  ? 'bg-yellow-400 text-zinc-950 border-yellow-500 shadow-sm'
                  : 'bg-white text-zinc-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              elansary
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 block">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="main / body / elansary"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-xs text-zinc-900 placeholder-slate-400 font-bold focus:bg-white focus:outline-none focus:border-yellow-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 block">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-xs text-zinc-900 placeholder-slate-400 font-bold focus:bg-white focus:outline-none focus:border-yellow-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black rounded-xl shadow-md shadow-yellow-400/20 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-98"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-zinc-950" />
            ) : (
              <>
                <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
