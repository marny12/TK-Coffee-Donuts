async function sendTwilioSms({ accountSid, authToken, fromNumber, toNumber, body }) {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const payload = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    Body: body
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: payload
  });

  if (!res.ok) {
    let detail = `Twilio request failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err && err.message) detail = err.message;
    } catch (_) {
      // keep fallback message
    }
    throw new Error(detail);
  }
}

let orders = [];

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const order = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        status: "NEW",
        ...body
      };

      orders.unshift(order);

      // SMS confirmation
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && fromNumber && order.customer?.phone) {
        let toPhone = order.customer.phone.replace(/\D/g, "");
        if (!toPhone.startsWith("1")) {
          toPhone = "1" + toPhone;
        }
        toPhone = "+" + toPhone;

        const customerName = order.customer?.name || "Customer";
        const pickup = order.customer?.pickup || "ASAP";
        const total = Number(order.total || 0).toFixed(2);

        await sendTwilioSms({
          accountSid,
          authToken,
          fromNumber,
          toNumber: toPhone,
          body: `TK Coffee & Donuts: Thanks ${customerName}! Your order is confirmed. Pickup: ${pickup}. Total: $${total}`,
        });
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, order })
      };
    }

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        body: JSON.stringify({ orders })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: "Method not allowed" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
