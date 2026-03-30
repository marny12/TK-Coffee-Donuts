// netlify/functions/process-payment.js
const https = require(‘https’);

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_HOST = ‘connect.squareupsandbox.com’;

exports.handler = async function(event) {
const headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’
};

if (event.httpMethod === ‘OPTIONS’) {
return { statusCode: 200, headers: headers, body: ‘’ };
}

if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, headers: headers, body: JSON.stringify({ error: ‘Method not allowed’ }) };
}

var body;
try {
body = JSON.parse(event.body);
} catch(e) {
return { statusCode: 400, headers: headers, body: JSON.stringify({ error: ‘Invalid JSON’ }) };
}

var sourceId = body.sourceId;
var amount = body.amount;
var note = body.note || ‘TK Coffee and Donuts Order’;

if (!sourceId || !amount || parseFloat(amount) <= 0) {
return { statusCode: 400, headers: headers, body: JSON.stringify({ error: ‘Missing sourceId or invalid amount’ }) };
}

var amountCents = Math.round(parseFloat(amount) * 100);
var idempotencyKey = ‘tk-’ + Date.now() + ‘-’ + Math.random().toString(36).slice(2);

var payload = JSON.stringify({
idempotency_key: idempotencyKey,
source_id: sourceId,
amount_money: { amount: amountCents, currency: ‘USD’ },
location_id: SQUARE_LOCATION_ID,
note: note
});

return new Promise(function(resolve) {
var options = {
hostname: SQUARE_HOST,
path: ‘/v2/payments’,
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: ’Bearer ’ + SQUARE_ACCESS_TOKEN,
‘Square-Version’: ‘2024-01-18’,
‘Content-Length’: Buffer.byteLength(payload)
}
};

```
var req = https.request(options, function(res) {
  var data = '';
  res.on('data', function(chunk) { data += chunk; });
  res.on('end', function() {
    try {
      var parsed = JSON.parse(data);
      console.log('Square response:', JSON.stringify(parsed));
      if (parsed.payment && parsed.payment.status === 'COMPLETED') {
        resolve({
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({ success: true, paymentId: parsed.payment.id })
        });
      } else {
        var errMsg = (parsed.errors && parsed.errors[0]) ? parsed.errors[0].detail : 'Payment not completed';
        resolve({
          statusCode: 402,
          headers: headers,
          body: JSON.stringify({ success: false, error: errMsg })
        });
      }
    } catch(e) {
      resolve({ statusCode: 500, headers: headers, body: JSON.stringify({ success: false, error: 'Parse error' }) });
    }
  });
});

req.on('error', function(e) {
  console.error('Request error:', e.message);
  resolve({ statusCode: 500, headers: headers, body: JSON.stringify({ success: false, error: e.message }) });
});

req.write(payload);
req.end();
```

});
};
