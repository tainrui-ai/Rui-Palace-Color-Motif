import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // 验证 Authorization Bearer Token 是否等于环境变量中的 ADMIN_SECRET_KEY
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const adminKey = process.env.ADMIN_SECRET_KEY;

  if (!adminKey || token !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret Key' });
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, orders: orders || [] });
  } catch (err) {
    console.error('Admin Orders Fetch Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
