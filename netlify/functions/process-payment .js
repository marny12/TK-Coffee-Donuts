// netlify/functions/process-payment.js
const https = require(‘https’);

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID  = process.env.SQUARE_LOCATION_ID || ‘LW2TD70EGCADV’;
const SQUARE_HOST         = ‘connect.squareupsandbox.com’; // sandbox

exports.handler = async (event) => {
const headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’,
};

if (event.httpMethod === ‘OPTIONS’) return { statusCode: 200, headers, body: ‘’ };
if (event.httpMethod !== ‘POST’) return { statusCode: 405, headers, body: JSON.stringify({ error: ‘Method not allowed’ }) };

let body;
try { body = JSON.parse(event.body); }
catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: ‘Invalid JSON’ }) }; }

const { sourceId, amount, note } = body;
if (!sourceId || !amount || parseFloat(amount) <= 0) {
return { statusCode: 400, headers, body: JSON.stringify({ error: ‘Missing sourceId or invalid amount’ }) };
}

const amountCents = Math.round(parseFloat(amount) * 100);
const idempotencyKey = `tk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const payload = JSON.stringify({
idempotency_key: idempotencyKey,
source_id: sourceId,
amount_money: { amount: amountCents, currency: ‘USD’ },
location_id: SQUARE_LOCATION_ID,
note: note || ‘TK Coffee & Donuts — Online Order’,
});

return new Promise((resolve) => {
const options = {
hostname: SQUARE_HOST,
path: ‘/v2/payments’,
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: `Bearer ${SQUARE_ACCESS_TOKEN}`,
‘Square-Version’: ‘2024-01-18’,
‘Content-Length’: Buffer.byteLength(payload),
},
};

```
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Square response:', JSON.stringify(parsed));
      if (parsed.payment && parsed.payment.status === 'COMPLETED') {
        resolve({ statusCode: 200, headers, body: JSON.stringify({ success: true, paymentId: parsed.payment.id }) });
      } else {
        const errMsg = parsed.errors?.[0]?.detail || 'Payment not completed';
        resolve({ statusCode: 402, headers, body: JSON.stringify({ success: false, error: errMsg }) });
      }
    } catch (e) {
      resolve({ statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Parse error' }) });
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  resolve({ statusCode: 500, headers, body: JSON.stringify({ success: false, error: e.message }) });
});

req.write(payload);
req.end();
```

});
};