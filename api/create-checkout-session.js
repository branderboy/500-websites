const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { customerEmail, metadata } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      invoice_creation: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 50000,
            product_data: {
              name: '19-Page SEO Contractor Website',
              description: 'Up to 19 SEO-optimized pages, GMB mirroring, structured data, PR 82 hosting, and rapid URL indexing.',
            },
          },
        },
      ],
      metadata: {
        name: metadata?.name || '',
        phone: metadata?.phone || '',
        trade: metadata?.trade || '',
      },
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
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
