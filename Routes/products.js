const express = require("express");
const db = require("../db");
const multer = require("multer");
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const storage = require('../config/firebase-config');

const router = express.Router();

// Konfigurasi Multer untuk upload file
const upload = multer({
  storage: multer.memoryStorage(),
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

// POST /products - Menambahkan produk baru dengan upload gambar ke Firebase Storage
router.post("/products", upload.single("image"), async (req, res) => {
  try {
    const { name, price } = req.body;
    const imageFile = req.file;

    if (!name || !price || !imageFile) {
      return res.status(400).json({ message: "Name, price, and image are required" });
    }

    const imageRef = ref(storage, `product-images/${imageFile.originalname}`);
    await uploadBytes(imageRef, imageFile.buffer, {
      contentType: imageFile.mimetype,
    });

    const imageUrl = await getDownloadURL(imageRef);

    const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
    db.query(query, [name, price, imageUrl], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      res.status(201).json({ message: "Product added successfully", imageUrl });
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Error uploading image", error: error.message });
  }
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

// PUT /products/:id - Mengupdate produk berdasarkan ID dengan opsi upload gambar ke Firebase Storage
router.put("/products/:id", upload.single("image"), async (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;
  const imageFile = req.file;

  try {
    let imageUrl = null;

    if (imageFile) {
      const imageRef = ref(storage, `product-images/${imageFile.originalname}`);
      await uploadBytes(imageRef, imageFile.buffer, {
        contentType: imageFile.mimetype,
      });

      imageUrl = await getDownloadURL(imageRef);
    }

    const query =
      "UPDATE products SET name = ?, price = ?, image = COALESCE(?, image) WHERE id = ?";
    db.query(query, [name, price, imageUrl, productId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ message: "Product updated successfully" });
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Error uploading image", error: error.message });
  }
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