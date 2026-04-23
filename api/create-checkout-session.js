const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { customerEmail, metadata, items } = req.body;

  const priceMap = {
    base:          'price_0TPUJqrvOp8o8GzAdsHVBQeh',
    priorityBuild: 'price_0TPULyrvOp8o8GzAe78rEJXr',
    upsell1:       'price_0TPUNirvOp8o8GzA5RqJPhRu',
    upsell2:       'price_0TPUOgrvOp8o8GzACP9iN1y8',
    upsell3:       'price_0TPUQGrvOp8o8GzAeGc6zEXT',
    upsell4:       'price_0TPURfrvOp8o8GzAhwli4Bdx',
  };

  const selectedKeys = Array.isArray(items) && items.length > 0 ? items : ['base'];
  const line_items = selectedKeys
    .filter(key => priceMap[key])
    .map(key => ({ price: priceMap[key], quantity: 1 }));

  if (line_items.length === 0) {
    return res.status(400).json({ error: 'No valid items selected' });
  }

  try {
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
      success_url: `${req.headers.origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${req.headers.origin}/checkout.html`,
    });

    return res.status(200).json({
      id: session.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
