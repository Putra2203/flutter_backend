const express = require("express");
const db = require("../db");
const router = express.Router();

// GET /products - Mengambil semua produk
router.get("/products", (req, res) => {
  const query = "SELECT * FROM products";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(results);
  });
});

// POST /products - Menambahkan produk baru
router.post("/products", (req, res) => {
  const { name, price, image } = req.body;
  const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
  db.query(query, [name, price, image], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(201).json({ message: "Product added successfully" });
  });
});

// GET /products/:id - Mengambil detail produk berdasarkan ID
router.get("/products/:id", (req, res) => {
  const productId = req.params.id;
  const query = "SELECT * FROM products WHERE id = ?";
  db.query(query, [productId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(results[0]);
  });
});

// PUT /products/:id - Mengupdate produk berdasarkan ID
router.put("/products/:id", (req, res) => {
  const productId = req.params.id;
  const { name, price, image } = req.body;
  const query =
    "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?";
  db.query(query, [name, price, image, productId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated successfully" });
  });
});

// DELETE /products/:id - Menghapus produk berdasarkan ID
router.delete("/products/:id", (req, res) => {
  const productId = req.params.id;
  const query = "DELETE FROM products WHERE id = ?";
  db.query(query, [productId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  });
});

module.exports = router;
