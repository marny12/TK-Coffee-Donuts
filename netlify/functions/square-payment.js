exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Square is not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.' })
    };
  }

  try {
    const { sourceId, amount, currency } = JSON.parse(event.body);

    if (!sourceId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing sourceId or amount' })
      };
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (amountInCents < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Minimum payment is $1.00' })
      };
    }

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-11-20',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        amount_money: {
          amount: amountInCents,
          currency: currency || 'USD'
        },
        location_id: locationId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorDetail = data.errors && data.errors.length > 0
        ? data.errors.map(e => e.detail).join(', ')
        : 'Payment failed';
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errorDetail })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: data.payment.id,
        status: data.payment.status,
        receiptUrl: data.payment.receipt_url
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
