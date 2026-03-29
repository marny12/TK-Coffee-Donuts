const { Client, Environment } = require("square");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: "Method not allowed" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { token, amount, customer, items } = body;

    if (!token || !amount || !customer || !Array.isArray(items)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing required fields" })
      };
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment:
        process.env.SQUARE_ENV === "production"
          ? Environment.Production
          : Environment.Sandbox
    });

    const paymentsApi = client.paymentsApi;

    const response = await paymentsApi.createPayment({
      sourceId: token,
      idempotencyKey: `tk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amountMoney: {
        amount: Math.round(Number(amount) * 100),
        currency: "USD"
      },
      note: `TK Coffee & Donuts order for ${customer.name}`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentId: response.result.payment?.id || null
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};