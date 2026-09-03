'use client';

import { getTodayString, getGreeting, formatCurrency, getWeekStart } from '@/lib/utils';
import { getCategoryById } from '@/lib/categories';

export default function HomeScreen({ onNavigate, transactions, budget, streak, userName }) {
  const today = getTodayString();
  const todayTxs = transactions.filter(tx => tx.date === today);
  const todayExpenses = todayTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const todayIncome = todayTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);

  // Hitung pengeluaran sesuai periode budget
  let displayExpense = todayExpenses;
  let remaining = 0;
  let percentage = 0;
  let isOver = false;

  if (budget) {
    if (budget.period === 'weekly') {
      const ws = getWeekStart(today);
      displayExpense = transactions
        .filter(tx => tx.type === 'expense' && tx.date >= ws && tx.date <= today)
        .reduce((s, tx) => s + tx.amount, 0);
    }
    remaining = budget.amount - displayExpense;
    percentage = budget.amount > 0 ? Math.min((displayExpense / budget.amount) * 100, 100) : 0;
    isOver = remaining < 0;
  }

  const recentTxs = todayTxs.slice(0, 5);
  const greeting = getGreeting();

  return (
    <div className="p-4 space-y-4">
      {/* Salam */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {budget
            ? `Budget ${budget.period === 'daily' ? 'hari ini' : 'minggu ini'}: ${formatCurrency(budget.amount)}`
            : 'Atur budget untuk mulai tracking'}
        </p>
      </div>

      {/* Kartu Budget */}
      {budget ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                {budget.period === 'daily' ? 'Hari Ini' : 'Minggu Ini'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${isOver ? 'text-red-500' : 'text-gray-900'}`}>
                {formatCurrency(Math.abs(remaining))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isOver ? 'Sudah melebihi budget' : 'Sisa budget'}
              </p>
            </div>
            {streak > 0 && (
              <div className="bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0112 23z" />
                </svg>
                <span className="text-sm font-bold text-amber-700">{streak}</span>
                <span className="text-xs text-amber-600">hari</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isOver ? 'bg-red-400' : percentage > 80 ? 'bg-amber-400' : 'bg-coral-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Terpakai {formatCurrency(displayExpense)}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onNavigate('settings')}
          className="w-full bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-coral-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Set Budget Dulu</p>
              <p className="text-xs text-gray-500">Tap untuk mengatur budget harian/mingguan</p>
            </div>
          </div>
        </button>
      )}

      {/* Statistik cepat */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Pengeluaran</p>
          <p className="text-lg font-bold text-red-500 mt-1">{formatCurrency(todayExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400">Pemasukan</p>
          <p className="text-lg font-bold text-emerald-500 mt-1">{formatCurrency(todayIncome)}</p>
        </div>
      </div>

      {/* Transaksi hari ini */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Transaksi Hari Ini</h2>
          {todayTxs.length > 0 && (
            <button onClick={() => onNavigate('history')} className="text-xs text-coral-500 font-medium">
              Lihat Semua
            </button>
          )}
        </div>

        {recentTxs.length > 0 ? (
          <div className="space-y-2">
            {recentTxs.map(tx => {
              const cat = getCategoryById(tx.categoryId);
              return (
                <div key={tx.id} className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3">
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-cream-200 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Belum ada transaksi hari ini</p>
            <button onClick={() => onNavigate('add')} className="mt-3 text-sm text-coral-500 font-medium">
              Catat Sekarang
            </button>
          </div>
        )}
      </div>
    </div>
  );
}