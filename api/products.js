const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { data: products, error } = await supabase
            .from('RuiPalaceProduct')
            .select('*');

        if (error) {
            console.error('Supabase fetch error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.status(200).json({ success: true, products: products || [] });
    } catch (err) {
        console.error('API products error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
