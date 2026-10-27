import { supabase } from './supabase';

const DEVICE_ID_KEY = 'ujt_device_id';
const ACCOUNT_STORAGE_PREFIX = 'reku:account:';
const PROFILE_CACHE = new Map();

function accountKey(userId, key) {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}:${key}`;
}

function readLocal(userId, key, fallback) {
  const value = localStorage.getItem(accountKey(userId, key));
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`Gagal membaca data lokal (${key}):`, error);
    throw new Error('Data offline lokal rusak dan tidak dapat dibaca.');
  }
}

function writeLocal(userId, key, value) {
  localStorage.setItem(accountKey(userId, key), JSON.stringify(value));
}

function throwStorageError(action, error) {
  if (error) {
    console.error(`${action}:`, error);
    const code = error.code ? ` (${error.code})` : '';
    throw new Error(`${action}${code}: ${error.message || 'Kesalahan Supabase tidak diketahui'}`);
  }
}

function isNetworkError(error) {
  return !navigator.onLine || /failed to fetch|network|timeout|load failed/i.test(error?.message || '');
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

async function loadOrCreateProfile(userId) {
  const deviceId = getDeviceId();
  const { data: claimedProfileId, error: claimError } = await supabase
    .rpc('claim_legacy_profile', { p_device_id: deviceId });

  throwStorageError('Gagal menghubungkan profil perangkat dengan akun', claimError);
  if (claimedProfileId) {
    return loadProfileById(claimedProfileId);
  }

  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  throwStorageError('Gagal memuat profil akun', selectError);
  if (profile) return profile;

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert([{ user_id: userId, device_id: deviceId }])
    .select()
    .single();

  if (insertError) {
    const { data: existingProfile, error: retryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    throwStorageError('Gagal memuat profil akun', retryError);
    if (existingProfile) return existingProfile;
    throwStorageError('Gagal membuat profil akun', insertError);
  }

  if (!newProfile) throw new Error('Profil akun tidak berhasil dibuat');
  return newProfile;
}

async function loadProfileById(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  throwStorageError('Gagal memuat profil akun', error);
  return data;
}

async function getProfile(userId) {
  let profilePromise = PROFILE_CACHE.get(userId);
  if (!profilePromise) {
    profilePromise = loadOrCreateProfile(userId);
    PROFILE_CACHE.set(userId, profilePromise);
  }

  try {
    return await profilePromise;
  } finally {
    if (PROFILE_CACHE.get(userId) === profilePromise) PROFILE_CACHE.delete(userId);
  }
}

function mapTransaction(tx) {
  return {
    ...tx,
    categoryId: tx.category_id ?? tx.categoryId,
    amount: Number(tx.amount)
  };
}

function getPendingTransactions(userId) {
  return readLocal(userId, 'pending-transactions', []);
}

function savePendingTransactions(userId, pending) {
  writeLocal(userId, 'pending-transactions', pending);
}

function getCachedTransactions(userId) {
  return readLocal(userId, 'transactions', []);
}

function getOfflineTransactions(userId) {
  const cached = getCachedTransactions(userId);
  const cachedClientIds = new Set(cached.map(transaction => transaction.client_id));
  const pending = getPendingTransactions(userId)
    .filter(transaction => !cachedClientIds.has(transaction.client_id));
  return [...pending, ...cached];
}

function saveCachedTransactions(userId, transactions) {
  writeLocal(userId, 'transactions', transactions);
}

async function syncPendingWithProfile(userId, profile) {
  if (!navigator.onLine) return getPendingTransactions(userId);

  let pending = getPendingTransactions(userId);
  for (const transaction of pending) {
    const { data, error } = await supabase
      .from('transactions')
      .upsert({
        profile_id: profile.id,
        client_id: transaction.client_id,
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.categoryId,
        description: transaction.description,
        date: transaction.date,
      }, { onConflict: 'client_id' })
      .select()
      .single();

    throwStorageError('Gagal menyinkronkan transaksi offline', error);
    if (!data) throw new Error('Transaksi offline tidak berhasil disinkronkan');

    pending = getPendingTransactions(userId)
      .filter(item => item.client_id !== transaction.client_id);
    savePendingTransactions(userId, pending);
  }

  return getPendingTransactions(userId);
}

export async function getAccountData(userId) {
  if (!navigator.onLine) {
    return {
      transactions: getOfflineTransactions(userId),
      budget: readLocal(userId, 'settings', {}).budget || null,
      user: readLocal(userId, 'settings', {}).user || { name: '' },
      pendingCount: getPendingTransactions(userId).length,
      offline: true,
    };
  }

  try {
    const profile = await getProfile(userId);
    await syncPendingWithProfile(userId, profile);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    throwStorageError('Gagal memuat transaksi', error);
    const transactions = data.map(mapTransaction);
    const settings = {
      budget: Number(profile.budget_amount) > 0
        ? { amount: Number(profile.budget_amount), period: profile.budget_period }
        : null,
      user: { name: profile.name || '' },
    };
    saveCachedTransactions(userId, transactions);
    writeLocal(userId, 'settings', settings);

    return { ...settings, transactions, pendingCount: 0, offline: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const settings = readLocal(userId, 'settings', {});
    return {
      transactions: getOfflineTransactions(userId),
      budget: settings.budget || null,
      user: settings.user || { name: '' },
      pendingCount: getPendingTransactions(userId).length,
      offline: true,
    };
  }
}

export async function addTransaction(userId, tx) {
  const clientId = crypto.randomUUID();
  const pendingTransaction = {
    ...tx,
    id: `pending-${clientId}`,
    client_id: clientId,
    syncStatus: 'pending',
  };

  if (!navigator.onLine) {
    const pending = [...getPendingTransactions(userId), pendingTransaction];
    savePendingTransactions(userId, pending);
    const transactions = [pendingTransaction, ...getCachedTransactions(userId)];
    saveCachedTransactions(userId, transactions);
    return pendingTransaction;
  }

  try {
    const profile = await getProfile(userId);
    const { data, error } = await supabase
      .from('transactions')
      .upsert({
        profile_id: profile.id,
        client_id: clientId,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.categoryId,
        description: tx.description,
        date: tx.date,
      }, { onConflict: 'client_id' })
      .select()
      .single();

    throwStorageError('Gagal menyimpan transaksi', error);
    if (!data) throw new Error('Transaksi tidak berhasil disimpan');
    const savedTransaction = mapTransaction(data);
    saveCachedTransactions(userId, [savedTransaction, ...getCachedTransactions(userId)]);
    return savedTransaction;
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const pending = [...getPendingTransactions(userId), pendingTransaction];
    savePendingTransactions(userId, pending);
    saveCachedTransactions(userId, [pendingTransaction, ...getCachedTransactions(userId)]);
    return pendingTransaction;
  }
}

export async function syncPendingTransactions(userId) {
  if (!navigator.onLine) return { transactions: getOfflineTransactions(userId), pendingCount: getPendingTransactions(userId).length };

  const profile = await getProfile(userId);
  const pending = await syncPendingWithProfile(userId, profile);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  throwStorageError('Gagal memuat transaksi setelah sinkronisasi', error);
  const transactions = data.map(mapTransaction);
  saveCachedTransactions(userId, transactions);
  return { transactions, pendingCount: pending.length };
}

export async function deleteTransaction(userId, id) {
  if (String(id).startsWith('pending-')) {
    const clientId = String(id).slice('pending-'.length);
    savePendingTransactions(userId, getPendingTransactions(userId).filter(tx => tx.client_id !== clientId));
    saveCachedTransactions(userId, getCachedTransactions(userId).filter(tx => tx.id !== id));
    return id;
  }

  const profile = await getProfile(userId);
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)
    .select('id')
    .single();

  throwStorageError('Gagal menghapus transaksi', error);
  if (!data) throw new Error('Transaksi tidak berhasil dihapus');
  saveCachedTransactions(userId, getCachedTransactions(userId).filter(tx => tx.id !== id));
  return data.id;
}

export async function setBudget(userId, budget) {
  const profile = await getProfile(userId);
  const { error } = await supabase
    .from('profiles')
    .update({
      budget_amount: budget ? budget.amount : 0,
      budget_period: budget ? budget.period : 'daily',
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id)
    .select('id')
    .single();

  throwStorageError('Gagal menyimpan budget', error);
  const settings = readLocal(userId, 'settings', {});
  writeLocal(userId, 'settings', { ...settings, budget });
  return budget;
}

export async function setUser(userId, user) {
  const profile = await getProfile(userId);
  const { error } = await supabase
    .from('profiles')
    .update({ name: user.name, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('id')
    .single();

  throwStorageError('Gagal menyimpan nama pengguna', error);
  const settings = readLocal(userId, 'settings', {});
  writeLocal(userId, 'settings', { ...settings, user });
  return user;
}

export async function resetAllData(userId) {
  const profile = await getProfile(userId);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('profile_id', profile.id);
  throwStorageError('Gagal menghapus transaksi', deleteError);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ name: null, budget_amount: 0, budget_period: 'daily' })
    .eq('id', profile.id)
    .select('id')
    .single();
  throwStorageError('Gagal mereset profil', updateError);

  saveCachedTransactions(userId, []);
  savePendingTransactions(userId, []);
  writeLocal(userId, 'settings', { budget: null, user: { name: '' } });
}
