'use client';

import { useState } from 'react';
import { setBudget, setUser, resetAllData } from '@/lib/storage';

const QUICK_AMOUNTS = [25000, 50000, 75000, 100000, 150000, 200000];

export default function SettingsScreen({ onBudgetChange, onUserNameChange, onError, userId, email, onSignOut, budget, userName, pendingCount }) {
  const [budgetAmount, setBudgetAmount] = useState(budget?.amount?.toString() || '');
  const [budgetPeriod, setBudgetPeriod] = useState(budget?.period || 'daily');
  const [name, setName] = useState(userName || '');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } catch (err) {
      console.error('Gagal keluar dari akun:', err);
      onError('Gagal keluar dari akun. Coba lagi.');
      setIsSigningOut(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const amount = parseFloat(budgetAmount);
      const nextBudget = amount > 0 ? { amount, period: budgetPeriod } : null;
      const b = await setBudget(userId, nextBudget);
      onBudgetChange(b);
      await setUser(userId, { name: name.trim() });
      onUserNameChange(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Gagal menyimpan pengaturan:', err);
      onError('Pengaturan gagal disimpan. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetAllData(userId);
      setBudgetAmount('');
      setBudgetPeriod('daily');
      setName('');
      onBudgetChange(null);
      onUserNameChange('');
      setShowReset(false);
    } catch (err) {
      console.error('Gagal reset data:', err);
      onError('Data gagal direset. Coba lagi.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 pt-2">Pengaturan</h1>

      {/* Nama */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Nama Panggilan</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Masukkan nama kamu"
          className="w-full bg-cream-50 rounded-xl px-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-coral-300 placeholder:text-gray-300"
        />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Akun</p>
        <p className="mt-1 text-sm font-medium text-gray-800">{email}</p>
        {pendingCount > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            {pendingCount} transaksi belum tersinkron. Tetap tersimpan di browser ini; masuk kembali dengan akun yang sama saat online untuk menyinkronkannya.
          </p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-3 text-sm font-medium text-red-500 disabled:opacity-50"
        >
          {isSigningOut ? 'Keluar...' : 'Keluar dari akun'}
        </button>
      </div>

      {/* Budget */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Budget</h2>

        {/* Toggle periode */}
        <div className="flex gap-2">
          {['daily', 'weekly'].map(p => (
            <button
              key={p}
              onClick={() => setBudgetPeriod(p)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                budgetPeriod === p ? 'bg-coral-500 text-white' : 'bg-cream-50 text-gray-500'
              }`}
            >
              {p === 'daily' ? 'Harian' : 'Mingguan'}
            </button>
          ))}
        </div>

        {/* Input jumlah */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
            Jumlah {budgetPeriod === 'daily' ? 'per Hari' : 'per Minggu'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
            <input
              type="number"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              placeholder="50000"
              className="w-full bg-cream-50 rounded-xl pl-10 pr-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-coral-300 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Quick pick */}
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => setBudgetAmount(a.toString())}
              className="px-3 py-1.5 bg-cream-50 rounded-lg text-xs text-gray-600 hover:bg-coral-50 hover:text-coral-600 active:scale-95 transition-all"
            >
              {a >= 1000 ? `${a / 1000}rb` : a}
            </button>
          ))}
        </div>
      </div>

      {/* Simpan */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3.5 rounded-xl text-sm font-semibold bg-coral-500 text-white shadow-lg shadow-coral-200/50 active:scale-[0.98] transition-transform disabled:opacity-70"
      >
        {isSaving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
      </button>

      {/* Reset data */}
      <div className="pt-2">
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="w-full py-3 rounded-xl text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            Reset Semua Data
          </button>
        ) : (
          <div className="bg-red-50 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-600">Semua data transaksi dan pengaturan akan dihapus permanen.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 active:scale-95 transition-transform"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white active:scale-95 transition-transform"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center pt-2 pb-8">
        <p className="text-xs text-gray-300">Uang Jajan Tracker v1.0</p>
        <p className="text-xs text-gray-300">MVP — validasi konsistensi pencatatan</p>
      </div>
    </div>
  );
}