const Stripe = require('stripe');

const PRICE_MAP = {
  base:          'price_0TPUJqrvOp8o8GzAdsHVBQeh',
  priorityBuild: 'price_0TPULyrvOp8o8GzAe78rEJXr',
  upsell1:       'price_0TPUNirvOp8o8GzA5RqJPhRu',
  upsell2:       'price_0TPUOgrvOp8o8GzACP9iN1y8',
  upsell3:       'price_0TPUQGrvOp8o8GzAeGc6zEXT',
  upsell4:       'price_0TPURfrvOp8o8GzAhwli4Bdx',
};

// Validate env vars once at module load so misconfiguration fails fast
const SECRET_KEY     = process.env.STRIPE_SECRET_KEY;
const PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const stripe = SECRET_KEY ? new Stripe(SECRET_KEY) : null;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !PUBLISHABLE_KEY) {
    console.error('Stripe env vars are not configured');
    return res.status(500).json({ error: 'Payment system is not configured' });
  }

  try {
    const { customerEmail, metadata, items } = req.body || {};

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    // Deduplicate, validate against known keys, and always include base
    const rawKeys = Array.isArray(items) && items.length > 0 ? items : ['base'];
    const selectedKeys = [...new Set(rawKeys)].filter(key => PRICE_MAP[key]);
    if (!selectedKeys.includes('base')) selectedKeys.unshift('base');

    const line_items = selectedKeys.map(key => ({ price: PRICE_MAP[key], quantity: 1 }));

    // Derive origin safely — Origin header is absent on same-origin fetches in some envs
    const origin = req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://tagglefish.com');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      invoice_creation: { enabled: true },
      line_items,
      metadata: {
        name:  metadata?.name  || '',
        phone: metadata?.phone || '',
        trade: metadata?.trade || '',
        items: selectedKeys.join(','),
      },
      success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/checkout.html`,
    });

    return res.status(200).json({ id: session.id, url: session.url, publishableKey: PUBLISHABLE_KEY });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Payment session could not be created. Please try again.' });
  }
};
