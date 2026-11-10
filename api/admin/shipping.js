import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const adminKey = process.env.ADMIN_SECRET_KEY;

  if (!adminKey || token !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret Key' });
  }

  try {
    const { orderId, shippingStatus, trackingNumber } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shipping_status: shippingStatus || 'Preparing',
        tracking_number: trackingNumber || ''
      })
      .eq('paypal_order_id', orderId);

    if (updateError) throw updateError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Admin Shipping Update Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
