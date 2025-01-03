const express = require("express");
const multer = require("multer");
const db = require("../db");
const router = express.Router();

// Konfigurasi storage untuk gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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

// POST /products - Menambahkan produk baru dengan upload gambar
router.post("/products", upload.single('image'), (req, res) => {
  const { name, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
  db.query(query, [name, price, imagePath], (err, result) => {
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
router.put("/products/:id", upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  const query = "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?";
  db.query(query, [name, price, imagePath, productId], (err, result) => {
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
