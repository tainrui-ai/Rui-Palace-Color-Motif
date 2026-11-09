import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.rui-palace.de');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 👈 完美对接您在 Supabase 中新建的表名
    const { data: products, error } = await supabase
      .from('RuiPalaceProduct')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}