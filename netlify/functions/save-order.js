let twilio;
try {
  twilio = require("twilio");
} catch {
  twilio = null;
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

      if (twilio && accountSid && authToken && fromNumber && order.customer?.phone) {
        const client = twilio(accountSid, authToken);

        let toPhone = order.customer.phone.replace(/\D/g, "");
        if (!toPhone.startsWith("1")) {
          toPhone = "1" + toPhone;
        }
        toPhone = "+" + toPhone;

        const customerName = order.customer?.name || "Customer";
        const pickup = order.customer?.pickup || "ASAP";
        const total = Number(order.total || 0).toFixed(2);

        await client.messages.create({
          body: `TK Coffee & Donuts: Thanks ${customerName}! Your order is confirmed. Pickup: ${pickup}. Total: $${total}`,
          from: fromNumber,
          to: toPhone
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
