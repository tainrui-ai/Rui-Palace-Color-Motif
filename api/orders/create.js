const fetch = require('node-fetch');

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_API = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

async function generateAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `including ${auth}`,
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
        const { items } = req.body;
        const totalAmount = items.reduce((sum, i) => sum + (i.priceNum * i.quantity), 0).toFixed(2);

        const accessToken = await generateAccessToken();
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'EUR',
                        value: totalAmount,
                    },
                }],
            }),
        });

        const orderData = await response.json();
        return res.status(200).json(orderData);
    } catch (err) {
        console.error('PayPal create order error:', err);
        return res.status(500).json({ error: err.message });
    }
}



