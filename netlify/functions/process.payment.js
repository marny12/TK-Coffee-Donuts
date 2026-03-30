var https = require('https');
var SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
var SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
var SQUARE_HOST = 'connect.squareupsandbox.com';
exports.handler = function(event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return callback(null, { statusCode: 405, body: 'Method not allowed' });
  }
  var body = JSON.parse(event.body);
  var amountCents = Math.round(parseFloat(body.amount) * 100);
  var idempotencyKey = 'tk-' + Date.now();
  var payload = JSON.stringify({
    idempotency_key: idempotencyKey,
    source_id: body.sourceId,
    amount_money: { amount: amountCents, currency: 'USD' },
    location_id: SQUARE_LOCATION_ID,
    note: 'TK Coffee and Donuts Order'
  });
  var options = {
    hostname: SQUARE_HOST,
    path: '/v2/payments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SQUARE_ACCESS_TOKEN,
      'Square-Version': '2024-01-18',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() {
      var parsed = JSON.parse(data);
      console.log('Square:', JSON.stringify(parsed));
      if (parsed.payment && parsed.payment.status === 'COMPLETED') {
        callback(null, { statusCode: 200, body: JSON.stringify({ success: true }) });
      } else {
        var err = parsed.errors ? parsed.errors[0].detail : 'Failed';
        callback(null, { statusCode: 400, body: JSON.stringify({ success: false, error: err }) });
      }
    });
  });
  req.on('error', function(e) {
    callback(null, { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) });
  });
  req.write(payload);
  req.end();
};
