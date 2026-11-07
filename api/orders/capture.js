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
        const { orderID } = req.body;
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
            return res.status(200).json({ status: 'SUCCESS', details: captureData });
        } else {
            return res.status(400).json({ status: 'FAILED', details: captureData });
        }
    } catch (error) {
        console.error('Failed to capture order:', error);
        return res.status(500).json({ error: 'Failed to capture order' });
    }
}