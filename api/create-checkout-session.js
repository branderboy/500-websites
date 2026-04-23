const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { customerEmail, metadata, items } = req.body;

  const priceMap = {
    base:          process.env.STRIPE_PRICE_BASE,
    priorityBuild: process.env.STRIPE_PRICE_PRIORITY_BUILD,
    upsell1:       process.env.STRIPE_PRICE_UPSELL_1,
    upsell2:       process.env.STRIPE_PRICE_UPSELL_2,
    upsell3:       process.env.STRIPE_PRICE_UPSELL_3,
    upsell4:       process.env.STRIPE_PRICE_UPSELL_4,
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
