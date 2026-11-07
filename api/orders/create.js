const fetch = require('node-fetch');

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
        let totalAmount = items.reduce((sum, i) => sum + (i.priceNum * i.quantity), 0).toFixed(2);

        const accessToken = await generateAccessToken();
        const url = `${PAYPAL_BASE}/v2/checkout/orders`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
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
        return res.status(200).json({ id: orderData.id });
    } catch (error) {
        console.error('Failed to create order:', error);
        return res.status(500).json({ error: 'Failed to create order' });
    }
}