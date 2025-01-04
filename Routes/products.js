const express = require("express");
const db = require("../db");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Folder tempat menyimpan file
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Nama file unik
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Validasi tipe file: hanya menerima file gambar
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// Middleware untuk menangani error Multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: "Multer error", error: err.message });
  } else if (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
  next();
};

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
router.post("/products", upload.single("image"), (req, res) => {
  const { name, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  if (!name || !price || !imagePath) {
    return res.status(400).json({ message: "Name, price, and image are required" });
  }

  const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
  db.query(query, [name, price, imagePath], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(201).json({ message: "Product added successfully", imagePath });
  });
}, multerErrorHandler);

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

// PUT /products/:id - Mengupdate produk berdasarkan ID dengan opsi upload gambar
router.put("/products/:id", upload.single("image"), (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  const query =
    "UPDATE products SET name = ?, price = ?, image = COALESCE(?, image) WHERE id = ?";
  db.query(query, [name, price, imagePath, productId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated successfully" });
  });
}, multerErrorHandler);

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
