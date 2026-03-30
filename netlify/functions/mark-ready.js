const twilio = require("twilio");

// Shared in-memory store with save-order.js will not persist across cold starts.
// Good for testing, but later you should move orders to a database.
let orders = [];

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: "Method not allowed" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { orderId } = body;

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing orderId" })
      };
    }

    // This only works reliably if storage is persistent.
    const order = orders.find(o => String(o.id) === String(orderId));

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Order not found. Current order storage is temporary."
        })
      };
    }

    order.status = "READY";

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber && order.customer?.phone) {
      const client = twilio(accountSid, authToken);

      let toPhone = order.customer.phone.replace(/\D/g, "");
      if (!toPhone.startsWith("1")) {
        toPhone = "1" + toPhone;
      }
      toPhone = "+" + toPhone;

      await client.messages.create({
        body: `TK Coffee & Donuts: Your order is READY for pickup!`,
        from: fromNumber,
        to: toPhone
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, order })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
