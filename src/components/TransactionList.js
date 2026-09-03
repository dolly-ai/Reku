'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getCategoryById } from '@/lib/categories';
import { formatCurrency, getTodayString, getWeekStart, getMonthStart, formatDate } from '@/lib/utils';
import { deleteTransaction } from '@/lib/storage';

const FILTERS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week',  label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
];

export default function TransactionList({ transactions, onDelete }) {
  const [filter, setFilter] = useState('today');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const today = getTodayString();
  let filtered = [];
  let periodLabel = '';

  if (filter === 'today') {
    filtered = transactions.filter(tx => tx.date === today);
    periodLabel = 'Hari Ini';
  } else if (filter === 'week') {
    const ws = getWeekStart(today);
    filtered = transactions.filter(tx => tx.date >= ws && tx.date <= today);
    periodLabel = 'Minggu Ini';
  } else {
    const ms = getMonthStart(today);
    filtered = transactions.filter(tx => tx.date >= ms && tx.date <= today);
    periodLabel = 'Bulan Ini';
  }

  // Kelompokkan per tanggal
  const grouped = {};
  filtered.forEach(tx => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);

  const handleDelete = (id) => {
    const newList = deleteTransaction(id);
    onDelete(newList);
    setConfirmDeleteId(null);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 pt-2">Riwayat</h1>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-coral-500 text-white' : 'bg-white text-gray-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ringkasan periode */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3.5 shadow-sm">
          <p className="text-xs text-gray-400">Pengeluaran</p>
          <p className="text-base font-bold text-red-500 mt-0.5">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl p-3.5 shadow-sm">
          <p className="text-xs text-gray-400">Pemasukan</p>
          <p className="text-base font-bold text-emerald-500 mt-0.5">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      {/* Daftar transaksi per tanggal */}
      {sortedDates.length > 0 ? (
        <div className="space-y-5">
          {sortedDates.map(date => {
            const dayTxs = grouped[date];
            const dayExp = dayTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
            return (
              <div key={date}>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-sm font-medium text-gray-600">{formatDate(date)}</p>
                  <p className="text-xs text-gray-400">-{formatCurrency(dayExp)}</p>
                </div>
                <div className="space-y-2">
                  {dayTxs.map((tx, index) => {
                    const cat = getCategoryById(tx.categoryId);
                    const isConfirming = confirmDeleteId === tx.id;
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-sm overflow-hidden"
                      >
                        <div className="p-3.5 flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ backgroundColor: cat?.color || '#D5D5D5', color: cat?.textColor || '#5A5A5A' }}
                          >
                            {cat?.name.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {tx.description || cat?.name || 'Lainnya'}
                            </p>
                            <p className="text-xs text-gray-400">{cat?.name || 'Lainnya'}</p>
                          </div>
                          <p className={`text-sm font-semibold shrink-0 ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </p>
                          <button
                            onClick={() => setConfirmDeleteId(isConfirming ? null : tx.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                        {/* Konfirmasi hapus inline */}
                        {isConfirming && (
                          <div className="px-3.5 pb-3.5 flex gap-2">
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="flex-1 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 active:bg-red-100 transition-colors"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 active:bg-gray-100 transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-sm text-gray-400">Tidak ada transaksi {periodLabel.toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}