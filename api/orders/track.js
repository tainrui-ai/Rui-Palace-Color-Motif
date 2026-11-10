import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 支持 POST 或 GET 传参
  const email = (req.method === 'POST' ? req.body.email : req.query.email) || '';
  const orderId = (req.method === 'POST' ? req.body.orderId : req.query.orderId) || '';

  if (!email || !orderId) {
    return res.status(400).json({ success: false, error: '请输入邮箱和订单号' });
  }

  try {
    // 在 Supabase 的 orders 表中查询匹配的订单
    // 支持匹配 paypal_order_id 或 order_id，并且验证 customer_email
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', email.trim().toLowerCase())
      .or(`paypal_order_id.eq.${orderId.trim()},order_id.eq.${orderId.trim()}`);

    if (error) throw error;

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, error: '未找到匹配的订单，请检查邮箱和订单号是否正确。' });
    }

    // 返回第一条匹配的订单
    return res.status(200).json({ success: true, order: orders[0] });
  } catch (err) {
    console.error('Order Track Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}