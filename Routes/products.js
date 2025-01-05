const express = require("express");
const db = require("../db");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const router = express.Router();

const secretClient = new SecretManagerServiceClient();
let storage; // Variabel untuk menyimpan instance Google Cloud Storage
let bucket; // Variabel untuk menyimpan instance bucket

// Fungsi untuk mendapatkan secret dari Secret Manager
async function getSecret(secretName) {
  const projectId = await secretClient.getProjectId(); // Ambil project ID secara dinamis
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
  });

  return version.payload.data.toString("utf8");
}

// Inisialisasi Google Cloud Storage
async function initializeStorage() {
  try {
    const credentialsJson = await getSecret("google-cloud-key");
    const credentials = JSON.parse(credentialsJson);

    // Inisialisasi GCS dengan kredensial
    storage = new Storage({ credentials });
    bucket = storage.bucket(process.env.GCS_BUCKET_NAME || "flutter-storage");
    console.log("Google Cloud Storage initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Google Cloud Storage:", error);
    process.exit(1); // Keluar jika gagal inisialisasi
  }
}
initializeStorage();

// Konfigurasi Multer untuk upload file
const multerStorage = multer.memoryStorage(); // Menyimpan file sementara di memori
const upload = multer({
  storage: multerStorage,
  fileFilter: (req, file, cb) => {
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

// POST /products - Menambahkan produk baru
router.post("/products", upload.single("image"), (req, res) => {
  const { name, price } = req.body;
  const file = req.file;

  if (!name || !price || !file) {
    return res.status(400).json({ message: "Name, price, and image are required" });
  }

  // Upload file ke GCS
  const blob = bucket.file(Date.now() + "-" + file.originalname);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
  });

  blobStream.on("error", (err) => {
    console.error("File upload error:", err);
    return res.status(500).json({ message: "File upload error", error: err.message });
  });

  blobStream.on("finish", () => {
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    // Simpan ke database
    const query = "INSERT INTO products (name, price, image) VALUES (?, ?, ?)";
    db.query(query, [name, price, imageUrl], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          message: "Database error",
          error: err.sqlMessage || err.message,
        });
      }
      res.status(201).json({ message: "Product added successfully", imageUrl });
    });
  });

  blobStream.end(file.buffer);
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

// PUT /products/:id - Mengupdate produk berdasarkan ID dengan opsi upload gambar ke GCS
router.put("/products/:id", upload.single("image"), (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;
  const file = req.file;

  const query =
    "UPDATE products SET name = ?, price = ?, image = COALESCE(?, image) WHERE id = ?";
  const updateValues = [name, price, null, productId];

  if (file) {
    // Jika ada file yang diupload, unggah ke GCS
    const blob = bucket.file(Date.now() + "-" + file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on("error", (err) => {
      return res.status(500).json({ message: "File upload error", error: err.message });
    });

    blobStream.on("finish", () => {
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      updateValues[2] = imageUrl;

      // Update database dengan URL gambar baru
      db.query(query, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err.sqlMessage || err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product updated successfully" });
      });
    });

    blobStream.end(file.buffer);
  } else {
    // Jika tidak ada file, langsung update data produk tanpa mengganti gambar
    db.query(query, updateValues, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.sqlMessage || err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ message: "Product updated successfully" });
    });
  }
});

// DELETE /products/:id - Menghapus produk berdasarkan ID
router.delete("/products/:id", (req, res) => {
  const productId = req.params.id;
  const query = "DELETE FROM products WHERE id = ?";
  db.query(query, [productId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.sqlMessage || err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  });
});

module.exports = router;
