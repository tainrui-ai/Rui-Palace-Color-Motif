const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 服务端客户端（使用 Service Role Key 具备写入与操作权限）
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
        const { items, customer } = req.body;
        
        if (!items || !items.length || !customer) {
            return res.status(400).json({ error: 'Missing required items or customer information' });
        }

        // 规范计算总金额（EUR）
        let totalAmount = items.reduce((sum, i) => sum + (i.priceNum * i.quantity), 0).toFixed(2);

        const accessToken = await generateAccessToken();
        const url = `${PAYPAL_BASE}/v2/checkout/orders`;

        // 组合描述信息（写入 PayPal 备注）
        const itemNames = items.map(i => `${i.title || i.name} (x${i.quantity})`).join(', ');
        const orderDescription = `Rui Palace - ${itemNames} | Wrist: ${customer.wrist || 'Default'}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: orderDescription.substring(0, 127),
                    amount: {
                        currency_code: 'EUR',
                        value: totalAmount.toString()
                    },
                    shipping: {
                        name: { full_name: customer.name },
                        address: {
                            address_line_1: customer.address,
                            postal_code: customer.zip,
                            admin_area_2: customer.city,
                            country_code: 'DE'
                        }
                    }
                }]
            })
        });

        const orderData = await response.json();

        if (!orderData.id) {
            console.error('PayPal Order Creation Failed:', orderData);
            return res.status(500).json({ error: 'Failed to create PayPal order', details: orderData });
        }

        // 🌟 核心同步：创建订单成功后，立即预存订单至 Supabase `orders` 云端表
        const { error: dbError } = await supabase
            .from('orders')
            .insert([{
                paypal_order_id: orderData.id,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                shipping_address: `${customer.address}, ${customer.zip} ${customer.city}`,
                wrist_size: customer.wrist || '',
                notes: customer.notes || '',
                ref_id: customer.ref || null, // 👈 推广员 ID (通过 URL 中的 ?ref=xxx 获取)
                total_amount: parseFloat(totalAmount),
                status: 'CREATED',
                items: items,
                created_at: new Date().toISOString()
            }]);

        if (dbError) {
            console.error('Supabase Pre-Save Order Error:', dbError);
        }

        return res.status(200).json({ id: orderData.id });
    } catch (error) {
        console.error('Failed to create order:', error);
        return res.status(500).json({ error: 'Failed to create order', message: error.message });
    }
}
