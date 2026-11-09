const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 服务端客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

async function generateAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: { Authorization: `Basic ${auth}` },
    });
    const data = await response.json();
    return data.access_token;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderID, customer } = req.body;
        if (!orderID) {
            return res.status(400).json({ error: 'Missing orderID' });
        }

        const accessToken = await generateAccessToken();
        const url = `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const captureData = await response.json();
        
        if (captureData.status === 'COMPLETED') {
            const captureDetails = captureData.purchase_units?.[0]?.payments?.captures?.[0] || {};
            const payer = captureData.payer || {};
            
            // 🌟 核心同步：扣款成功，更新 Supabase `orders` 表状态为 COMPLETED
            const updatePayload = {
                paypal_order_id: orderID,
                paypal_capture_id: captureDetails.id || null,
                payer_email: payer.email_address || null,
                status: 'COMPLETED',
                paid_at: new Date().toISOString()
            };

            if (customer) {
                updatePayload.customer_name = customer.name;
                updatePayload.customer_email = customer.email;
                updatePayload.customer_phone = customer.phone;
                updatePayload.shipping_address = `${customer.address}, ${customer.zip} ${customer.city}`;
                updatePayload.wrist_size = customer.wrist || '';
                updatePayload.notes = customer.notes || '';
                updatePayload.ref_id = customer.ref || null;
            }

            // 使用 upsert 以保证幂等性（存在则更新，不存在则自动插入）
            const { error: dbError } = await supabase
                .from('orders')
                .upsert(updatePayload, { onConflict: 'paypal_order_id' });

            if (dbError) {
                console.error('Supabase Order Capture Update Error:', dbError);
            }

            return res.status(200).json({ status: 'SUCCESS', details: captureData });
        } else {
            // 支付未成功，标记状态为 FAILED
            await supabase
                .from('orders')
                .update({ status: 'FAILED' })
                .eq('paypal_order_id', orderID);

            return res.status(400).json({ status: 'FAILED', details: captureData });
        }
    } catch (error) {
        console.error('Failed to capture order:', error);
        return res.status(500).json({ error: 'Failed to capture order', message: error.message });
    }
}
