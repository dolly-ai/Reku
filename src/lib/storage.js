import { supabase } from './supabase';

const DEVICE_ID_KEY = 'ujt_device_id';

function getDeviceId() {
  if (typeof window === 'undefined') return null;
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Ensure profile exists for this device
async function getProfile() {
  const deviceId = getDeviceId();
  if (!deviceId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (data) return data;

  // Create profile if doesn't exist
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert([{ device_id: deviceId }])
    .select()
    .single();

  return newProfile;
}

// === Transaksi ===

export async function getTransactions() {
  const profile = await getProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });
    
  return (data || []).map(tx => ({
    ...tx,
    categoryId: tx.category_id,
    amount: Number(tx.amount)
  }));
}

export async function addTransaction(tx) {
  const profile = await getProfile();
  if (!profile) return [];

  const newTx = {
    profile_id: profile.id,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    description: tx.description,
    date: tx.date,
  };

  await supabase.from('transactions').insert([newTx]);
  return await getTransactions();
}

export async function deleteTransaction(id) {
  await supabase.from('transactions').delete().eq('id', id);
  return await getTransactions();
}

// === Budget ===

export async function getBudget() {
  const profile = await getProfile();
  if (!profile || Number(profile.budget_amount) === 0) return null;
  return { amount: Number(profile.budget_amount), period: profile.budget_period };
}

export async function setBudget(budget) {
  const profile = await getProfile();
  if (!profile) return null;

  await supabase
    .from('profiles')
    .update({ 
      budget_amount: budget ? budget.amount : 0, 
      budget_period: budget ? budget.period : 'daily',
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  return budget;
}

// === User ===

export async function getUser() {
  const profile = await getProfile();
  if (!profile) return { name: '' };
  return { name: profile.name || '' };
}

export async function setUser(user) {
  const profile = await getProfile();
  if (!profile) return user;

  await supabase
    .from('profiles')
    .update({ 
      name: user.name,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  return user;
}

// === Reset ===

export async function resetAllData() {
  const profile = await getProfile();
  if (!profile) return;
  
  await supabase.from('transactions').delete().eq('profile_id', profile.id);
  await supabase
    .from('profiles')
    .update({ name: null, budget_amount: 0, budget_period: 'daily' })
    .eq('id', profile.id);
}