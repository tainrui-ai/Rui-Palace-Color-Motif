const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

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
    return data.access_token;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderID, customer } = req.body;
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
            await supabase.from('orders').insert([{
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

            return res.status(200).json({ status: 'SUCCESS', details: captureData });
        } else {
            return res.status(400).json({ status: 'FAILED', details: captureData });
        }
    } catch (err) {
        console.error('PayPal capture error:', err);
        return res.status(500).json({ error: err.message });
    }
}
