var https = require('https');

var SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
var SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
var SQUARE_HOST = 'connect.squareupsandbox.com';
var REQUEST_TIMEOUT_MS = 10000;
var MAX_NOTE_LENGTH = 500;

var squareAgent = new https.Agent({ keepAlive: true });

function response(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function sanitizeCustomer(customer) {
  if (!customer || typeof customer !== 'object') return null;

  var name = typeof customer.name === 'string' ? customer.name.trim() : '';
  var phone = typeof customer.phone === 'string' ? customer.phone.trim() : '';
  var pickupTime = typeof customer.pickupTime === 'string' ? customer.pickupTime.trim() : '';

  if (!name && !phone && !pickupTime) return null;
  return { name: name, phone: phone, pickupTime: pickupTime };
}

function buildPaymentNote(baseNote, customer) {
  var note = typeof baseNote === 'string' && baseNote.trim()
    ? baseNote.trim()
    : 'TK Coffee and Donuts Order';

  if (customer) {
    note += ' | Name: ' + (customer.name || 'N/A');
    note += ' | Phone: ' + (customer.phone || 'N/A');
    note += ' | Pickup: ' + (customer.pickupTime || 'N/A');
  }

  return note.slice(0, MAX_NOTE_LENGTH);
}

exports.handler = function(event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return callback(null, response(405, { success: false, error: 'Method not allowed' }));
  }

  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return callback(null, response(500, { success: false, error: 'Payment service is not configured' }));
  }

  var body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return callback(null, response(400, { success: false, error: 'Invalid request body' }));
  }

  var amountNumber = Number(body.amount);
  var amountCents = Math.round(amountNumber * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return callback(null, response(400, { success: false, error: 'Invalid amount' }));
  }

  if (!body.sourceId || typeof body.sourceId !== 'string') {
    return callback(null, response(400, { success: false, error: 'Missing payment source' }));
  }

  var customer = sanitizeCustomer(body.customer);
  var payload = JSON.stringify({
    idempotency_key: 'tk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    source_id: body.sourceId,
    amount_money: { amount: amountCents, currency: 'USD' },
    location_id: SQUARE_LOCATION_ID,
    note: buildPaymentNote(body.note, customer)
  });

  var options = {
    agent: squareAgent,
    hostname: SQUARE_HOST,
    path: '/v2/payments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SQUARE_ACCESS_TOKEN,
      'Square-Version': '2024-01-18',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: REQUEST_TIMEOUT_MS
  };

  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() {
      var parsed;
      try {
        parsed = data ? JSON.parse(data) : {};
      } catch (error) {
        return callback(null, response(502, { success: false, error: 'Payment provider returned invalid data' }));
      }

      if (parsed.payment && parsed.payment.status === 'COMPLETED') {
        return callback(null, response(200, { success: true }));
      }

      var err = (parsed.errors && parsed.errors[0] && parsed.errors[0].detail) || 'Payment failed';
      return callback(null, response(400, { success: false, error: err }));
    });
  });

  req.on('timeout', function() {
    req.destroy(new Error('Payment request timed out'));
  });

  req.on('error', function(error) {
    callback(null, response(502, { success: false, error: error.message || 'Payment request failed' }));
  });

  req.write(payload);
  req.end();
};
