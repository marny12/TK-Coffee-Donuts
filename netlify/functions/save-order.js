let orders = [];

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      const order = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        ...body
      };

      orders.unshift(order);

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

    return { statusCode: 405 };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};