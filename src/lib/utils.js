// Utilitas formatting tanggal, mata uang, dan perhitungan streak

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`;
  return String(amount);
}

export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

// Senin sebagai awal minggu (standar ISO)
export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function getMonthStart(dateStr) {
  return dateStr.substring(0, 8) + '01';
}

// Hitung streak: jumlah hari berturut-turut user mencatat transaksi TANPA melewati budget
export function calculateStreak(transactions, budget) {
  if (!budget) return 0;

  const today = getTodayString();
  let streak = 0;
  let cur = new Date(today + 'T00:00:00');

  while (streak < 365) {
    const ds = toDateStr(cur);
    const dayTxs = transactions.filter(tx => tx.date === ds);
    if (dayTxs.length === 0) break;

    if (budget.period === 'daily') {
      const dayExpense = dayTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      if (dayExpense > budget.amount) break;
    } else {
      // Budget mingguan: cek akumulasi dari awal minggu sampai tanggal ini
      const ws = getWeekStart(ds);
      const weekExpense = transactions
        .filter(tx => tx.type === 'expense' && tx.date >= ws && tx.date <= ds)
        .reduce((s, tx) => s + tx.amount, 0);
      if (weekExpense > budget.amount) break;
    }

    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}