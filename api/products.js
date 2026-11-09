const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase environment variables on Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🌟 查询 Supabase 中的 RuiPalaceProduct 表
    const { data: products, error } = await supabase
      .from('RuiPalaceProduct')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, products: products || [] });
  } catch (err) {
    console.error('API products fatal error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
