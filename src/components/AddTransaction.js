'use client';

import { useState, useCallback } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';
import { getTodayString, formatCurrency } from '@/lib/utils';
import { addTransaction } from '@/lib/storage';

const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export default function AddTransaction({ onSave }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [isLoading, setIsLoading] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const display = amount ? formatCurrency(parseFloat(amount) || 0) : 'Rp 0';

  const pressKey = useCallback((key) => {
    if (key === 'del') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (!amount) { setAmount('0.'); return; }
      if (amount.includes('.')) return;
      setAmount(prev => prev + '.');
      return;
    }
    // Digit
    if (amount.length >= 10) return;
    setAmount(prev => {
      const next = (prev === '0' || prev === '') ? key : prev + key;
      // Batasi 2 desimal
      if (next.includes('.')) {
        const parts = next.split('.');
        if (parts[1].length > 2) return prev;
      }
      return next;
    });
  }, [amount]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || !categoryId) return;

    setIsLoading(true);
    const tx = { type, amount: num, categoryId, description: description.trim(), date };
    const newList = await addTransaction(tx);
    onSave(newList, tx);

    // Reset form
    setAmount('');
    setCategoryId(null);
    setDescription('');
    setDate(getTodayString());
    setIsLoading(false);
  };

  const canSave = parseFloat(amount) > 0 && categoryId && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Catat Transaksi</h1>
      </div>

      {/* Toggle tipe */}
      <div className="flex px-4 gap-2 mb-3">
        <button
          onClick={() => { setType('expense'); setCategoryId(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            type === 'expense' ? 'bg-red-50 text-red-600 border-2 border-red-200' : 'bg-white text-gray-500 border-2 border-transparent'
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => { setType('income'); setCategoryId(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            type === 'income' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : 'bg-white text-gray-500 border-2 border-transparent'
          }`}
        >
          Pemasukan
        </button>
      </div>

      {/* Tampilan jumlah */}
      <div className="px-4 mb-3">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Jumlah</p>
          <p className="text-3xl font-semibold text-gray-900 truncate">{display}</p>
        </div>
      </div>

      {/* Numpad */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-3 gap-2">
          {NUMPAD.map(key => (
            <button
              key={key}
              onClick={() => pressKey(key)}
              className={`numpad-btn h-14 rounded-xl text-lg font-medium transition-all active:scale-95 ${
                key === 'del'
                  ? 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  : 'bg-white text-gray-900 shadow-sm active:bg-gray-50'
              }`}
            >
              {key === 'del' ? (
                <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.126 1.126 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
              ) : key}
            </button>
          ))}
        </div>
      </div>

      {/* Grid kategori */}
      <div className="px-4 mb-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Kategori</p>
        <div className={`grid gap-2 ${type === 'expense' ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`flex flex-col items-center p-2.5 rounded-xl transition-all active:scale-95 ${
                categoryId === cat.id ? 'ring-2 ring-offset-1 ring-gray-800 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              style={{ backgroundColor: cat.color }}
            >
              <div
                className="w-8 h-8 rounded-full mb-1 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: cat.textColor, color: cat.color }}
              >
                {cat.name.charAt(0)}
              </div>
              <span className="text-[10px] font-medium leading-tight text-center" style={{ color: cat.textColor }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Keterangan + tanggal + simpan */}
      <div className="px-4 mt-auto pb-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Keterangan (opsional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex-1 bg-white rounded-xl px-4 py-3 text-sm border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-300 placeholder:text-gray-300"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white rounded-xl px-3 py-3 text-sm border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-coral-300 min-w-[130px]"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
            canSave
              ? 'bg-coral-500 text-white shadow-lg shadow-coral-200/50 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>
    </div>
  );
}