import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 检查环境变量
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ 
        success: false, 
        step: 'env_check',
        error: 'Missing Supabase environment variables.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询数据库
    const { data: products, error } = await supabase
      .from('RuiPalaceProduct')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return res.status(200).json({ 
        success: false, 
        step: 'supabase_query',
        error: error.message 
      });
    }

    return res.status(200).json({ success: true, products: products || [] });
    
  } catch (err) {
    // 捕获所有最底层的崩溃（如模块加载失败、语法错误等）
    return res.status(200).json({ 
      success: false, 
      step: 'fatal_catch',
      error: err.message,
      stack: err.stack 
    });
  }
}
