// netlify/functions/process-payment.js
// Square Payment Processing — Sandbox mode
// Deploy this file to your repo at: netlify/functions/process-payment.js
// Add SQUARE_ACCESS_TOKEN to Netlify environment variables (never expose in frontend)

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID  = process.env.SQUARE_LOCATION_ID || ‘LW2TD70EGCADV’;
const SQUARE_API_BASE     = ‘https://connect.squareupsandbox.com’; // switch to squareup.com for production

exports.handler = async (event) => {
// Only allow POST
if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, body: JSON.stringify({ error: ‘Method not allowed’ }) };
}

// CORS headers
const headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’,
};

let body;
try {
body = JSON.parse(event.body);
} catch {
return { statusCode: 400, headers, body: JSON.stringify({ error: ‘Invalid JSON’ }) };
}

const { sourceId, amount, note } = body;

if (!sourceId || !amount || amount <= 0) {
return {
statusCode: 400, headers,
body: JSON.stringify({ error: ‘Missing sourceId or invalid amount’ })
};
}

// Convert dollars to cents (Square uses smallest currency unit)
const amountCents = Math.round(parseFloat(amount) * 100);

// Unique idempotency key to prevent duplicate charges
const idempotencyKey = `tk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

try {
const response = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: `Bearer ${SQUARE_ACCESS_TOKEN}`,
‘Square-Version’: ‘2024-01-18’,
},
body: JSON.stringify({
idempotency_key: idempotencyKey,
source_id: sourceId,
amount_money: {
amount: amountCents,
currency: ‘USD’,
},
location_id: SQUARE_LOCATION_ID,
note: note || ‘TK Coffee & Donuts — Online Order’,
}),
});

```
const data = await response.json();

if (data.payment && data.payment.status === 'COMPLETED') {
  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      success: true,
      paymentId: data.payment.id,
      amount: data.payment.amount_money,
      receiptUrl: data.payment.receipt_url,
    }),
  };
} else {
  const errMsg = data.errors?.[0]?.detail || 'Payment failed';
  return {
    statusCode: 402, headers,
    body: JSON.stringify({ success: false, error: errMsg }),
  };
}
```

} catch (err) {
console.error(‘Square API error:’, err);
return {
statusCode: 500, headers,
body: JSON.stringify({ success: false, error: ‘Server error processing payment’ }),
};
}
};