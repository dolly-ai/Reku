'use client';

import { useState } from 'react';
import { getCategoryById } from '@/lib/categories';
import { formatCurrency, formatCompact, getTodayString, getWeekStart, getMonthStart } from '@/lib/utils';

export default function SummaryScreen({ transactions }) {
  const [period, setPeriod] = useState('week');

  const today = getTodayString();
  let startDate = '';
  let periodLabel = '';

  if (period === 'week') {
    startDate = getWeekStart(today);
    periodLabel = 'Minggu Ini';
  } else {
    startDate = getMonthStart(today);
    periodLabel = 'Bulan Ini';
  }

  const filtered = transactions.filter(tx => tx.type === 'expense' && tx.date >= startDate && tx.date <= today);
  const totalExpense = filtered.reduce((s, tx) => s + tx.amount, 0);

  // Kelompokkan per kategori
  const catMap = {};
  filtered.forEach(tx => {
    catMap[tx.categoryId] = (catMap[tx.categoryId] || 0) + tx.amount;
  });

  const catData = Object.entries(catMap)
    .map(([id, total]) => {
      const cat = getCategoryById(id);
      return {
        id,
        name: cat?.name || 'Lainnya',
        color: cat?.color || '#D5D5D5',
        textColor: cat?.textColor || '#5A5A5A',
        total,
        pct: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const maxCatTotal = catData.length > 0 ? catData[0].total : 1;

  // Pengeluaran harian untuk bar chart
  const dailyMap = {};
  filtered.forEach(tx => {
    dailyMap[tx.date] = (dailyMap[tx.date] || 0) + tx.amount;
  });

  const dailyData = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({
      date,
      total,
      label: new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short' }),
    }));

  const maxDaily = dailyData.length > 0 ? Math.max(...dailyData.map(d => d.total)) : 1;
  const showEveryN = dailyData.length > 14 ? Math.ceil(dailyData.length / 8) : 1;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 pt-2">Ringkasan</h1>

      {/* Pilih periode */}
      <div className="flex gap-2">
        {[
          { key: 'week', label: 'Minggu Ini' },
          { key: 'month', label: 'Bulan Ini' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.key ? 'bg-coral-500 text-white' : 'bg-white text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Total pengeluaran */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Total Pengeluaran {periodLabel}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpense)}</p>
        <p className="text-xs text-gray-400 mt-1">{filtered.length} transaksi</p>
      </div>

      {/* Bar chart harian */}
      {dailyData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-4">Pengeluaran Harian</p>
          <div className="flex items-end gap-1.5 h-32">
            {dailyData.map((d, i) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <p className="text-[9px] text-gray-400 font-medium truncate w-full text-center">
                  {formatCompact(d.total)}
                </p>
                <div className="w-full bg-gray-50 rounded-t-md relative" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-500 bg-coral-300"
                    style={{ height: `${maxDaily > 0 ? (d.total / maxDaily) * 100 : 0}%` }}
                  />
                </div>
                {i % showEveryN === 0 && (
                  <p className="text-[9px] text-gray-400">{d.label}</p>
                )}
                {i % showEveryN !== 0 && <div className="h-[13px]" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown per kategori */}
      {catData.length > 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-4">Per Kategori</p>
          <div className="space-y-4">
            {catData.map(cat => (
              <div key={cat.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.total)}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{cat.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${maxCatTotal > 0 ? (cat.total / maxCatTotal) * 100 : 0}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-sm text-gray-400">Belum ada data pengeluaran {periodLabel.toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}