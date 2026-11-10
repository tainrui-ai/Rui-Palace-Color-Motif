import { createClient } from '@supabase/supabase-js';

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_API = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    const data = await response.json();
    if (!data.access_token) {
        throw new Error('Failed to generate PayPal Access Token: ' + JSON.stringify(data));
    }
    return data.access_token;
}

export default async function handler(req, res) {
    // 设置 CORS 跨域头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderID, customer } = req.body;
        if (!orderID || !customer) {
            return res.status(400).json({ error: 'Missing orderID or customer information.' });
        }

        const accessToken = await generateAccessToken();

        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const captureData = await response.json();

        if (captureData.status === 'COMPLETED') {
            // 写入 Supabase orders 表，包含推广员 ref 字段
            const { error: dbError } = await supabase.from('orders').insert([{
                paypal_order_id: orderID,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                shipping_address: `${customer.address}, ${customer.zip} ${customer.city}`,
                wrist_size: customer.wrist,
                notes: customer.notes,
                ref_id: customer.ref || null,
                status: 'COMPLETED'
            }]);

            if (dbError) {
                console.error('Supabase insert error during capture:', dbError);
                // 即使数据库写入出现异常，支付本身已完成，仍可返回 SUCCESS 或记录日志
            }

            return res.status(200).json({ status: 'SUCCESS', details: captureData });
        } else {
            return res.status(400).json({ status: 'FAILED', details: captureData });
        }
    } catch (err) {
        console.error('PayPal capture error:', err);
        return res.status(500).json({ error: err.message });
    }
}
