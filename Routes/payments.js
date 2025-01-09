const midtransClient = require("midtrans-client");
const express = require("express");
const router = express.Router();
const db = require("../db");
// Midtrans Configuration
const midtrans = new midtransClient.Snap({
  isProduction: true, // Ubah ke `true` untuk production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

router.post("/orders", async (req, res) => {
  const { userId, items, city } = req.body; // items = [{ productId, quantity, price }]
  try {
    // Hitung total harga barang
    const totalItemsAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Tetapkan ongkir jika lokasi adalah Semarang
    let shippingCost = 0;
    if (city.toLowerCase() === "semarang") {
      shippingCost = 15.0; // Flat rate untuk Semarang
    }

    // Total harga termasuk ongkir
    const totalAmount = totalItemsAmount + shippingCost;

    // Simpan pesanan ke database
    const queryOrder =
      "INSERT INTO orders (user_id, total_amount, city, shipping_cost) VALUES (?, ?, ?, ?)";
    const [orderResult] = await db
      .promise()
      .query(queryOrder, [userId, totalAmount, city, shippingCost]);

    const orderId = orderResult.insertId;

    // Simpan item pesanan
    const queryOrderItems =
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?";
    const orderItems = items.map((item) => [
      orderId,
      item.productId,
      item.quantity,
      item.price,
    ]);
    await db.promise().query(queryOrderItems, [orderItems]);

    res.status(201).json({ message: "Order created", orderId, shippingCost, totalAmount, userId });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating order", error: err.message });
  }
});

router.post("/payments/midtrans", async (req, res) => {
  const { orderId, userId } = req.body;
  try {
    // Ambil informasi pesanan
    const queryOrder =
      "SELECT total_amount, shipping_cost FROM orders WHERE id = ?";
    const [orderResult] = await db.promise().query(queryOrder, [orderId]);

    if (orderResult.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { total_amount, shipping_cost } = orderResult[0];
    const grandTotal = parseFloat(total_amount) + parseFloat(shipping_cost);

    // Buat payload untuk Midtrans
    const transactionDetails = {
      order_id: `order-${orderId}-${Date.now()}`,
      gross_amount: grandTotal,
    };

    const customerDetails = {
      user_id: userId,
      email: req.body.email,
      first_name: req.body.name,
    };

    const parameter = {
      transaction_details: transactionDetails,
      customer_details: customerDetails,
      item_details: [
        {
          id: "shipping_cost",
          price: shipping_cost,
          quantity: 1,
          name: "Shipping Cost",
        },
        {
          id: "order_total",
          price: total_amount,
          quantity: 1,
          name: "Order Items Total",
        },
      ],
    };

    // Request Snap Token dari Midtrans
    const transaction = await midtrans.createTransaction(parameter);

    // Simpan ID transaksi dari Midtrans ke database
    const queryPayment =
      "INSERT INTO payments (order_id, payment_id, amount) VALUES (?, ?, ?)";
    await db
      .promise()
      .query(queryPayment, [orderId, transaction.token, grandTotal]);

    res.status(200).json({
      message: "Payment created",
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error creating payment", error: err.message });
  }
});

router.post("/webhook/midtrans", async (req, res) => {
  const notification = req.body;

  try {
    const { order_id, transaction_status } = notification;
    let midtransStatus = "pending";

    if (transaction_status === "settlement") {
      midtransStatus = "success";
    } else if (
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      midtransStatus = "failure";
    }

    // Update status pembayaran di database
    const queryUpdatePayment = `
        UPDATE payments 
        SET midtrans_status = ? 
        WHERE payment_id = ?
      `;
    await db.promise().query(queryUpdatePayment, [midtransStatus, order_id]);

    // Update status pesanan jika pembayaran berhasil
    if (midtransStatus === "success") {
      const queryUpdateOrder = `
          UPDATE orders 
          SET status = 'paid' 
          WHERE id = (SELECT order_id FROM payments WHERE payment_id = ?)
        `;
      await db.promise().query(queryUpdateOrder, [order_id]);
    }

    res.status(200).json({ message: "Notification received" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error processing webhook", error: err.message });
  }
});

module.exports = router;