'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.');
        } else {
          setMessage('Akun berhasil dibuat.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Gagal autentikasi:', error);
      setErrorMessage(error.message || 'Tidak dapat memproses akun. Periksa koneksi dan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Uang Jajan Tracker</h1>
        <p className="mt-2 text-sm text-gray-500">
          Masuk agar catatan keuanganmu tersimpan dan bisa dibuka dari perangkat lain.
        </p>

        <div className="mt-6 flex rounded-xl bg-cream-50 p-1">
          {[
            { key: 'sign-in', label: 'Masuk' },
            { key: 'sign-up', label: 'Buat Akun' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setMode(tab.key);
                setMessage('');
                setErrorMessage('');
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                mode === tab.key ? 'bg-white text-coral-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl bg-cream-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Kata sandi
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl bg-cream-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
            />
          </label>
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-coral-500 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Memproses...' : mode === 'sign-up' ? 'Buat Akun' : 'Masuk'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Masuk perlu internet. Setelah masuk di perangkat ini, transaksi baru bisa dicatat offline dan disinkronkan saat online.
        </p>
      </div>
    </div>
  );
}
