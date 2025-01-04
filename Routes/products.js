const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../db");
const authenticateToken = require("../middlewares/auth");
const router = express.Router();

// Konfigurasi Multer untuk upload gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// GET /products - Mengambil semua produk
router.get("/products", authenticateToken, (req, res) => {
  const query = "SELECT * FROM products";
  db.query(query, (err, results) => { 
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(results);
  });
});

// GET /products/:id - Mengambil detail produk
router.get("/products/:id", authenticateToken, (req, res) => {
  const productId = req.params.id;
  const query = "SELECT * FROM products WHERE id = ?";
  db.query(query, [productId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(results[0]);
  });
});

// POST /products - Menambah produk baru
router.post("/products", authenticateToken, upload.single('image'), (req, res) => {
  const { name, price } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
  db.query(query, [name, price, image], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(201).json({ 
      message: "Product added successfully",
      productId: result.insertId,
      image: image
    });
  });
});

// PUT /products/:id - Update produk
router.put("/products/:id", authenticateToken, upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : req.body.oldImage;

  const query = "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?";
  db.query(query, [name, price, image, productId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ 
      message: "Product updated successfully",
      image: image
    });
  });
});

// DELETE /products/:id - Hapus produk
router.delete("/products/:id", authenticateToken, (req, res) => {
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