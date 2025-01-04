const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth");
const productsRouter = require("./Routes/products");
require("dotenv").config();
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

// Pengaturan CORS lebih spesifik untuk produk yang lebih aman
app.use(
  cors({
    origin: "*", // Sesuaikan dengan URL frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Menambahkan opsi ini jika kamu mengirimkan cookies atau header Authorization
  })
);

app.options("*", cors()); // Menangani preflight request untuk semua routes

// Middleware untuk parsing JSON
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Error handler untuk Multer file upload
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: "File upload error",
      error: err.message,
    });
  }
  next(err);
});

// Menyajikan file statis
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Menggunakan routes
app.use("/auth", authRoutes);
app.use("/api", productsRouter);

// Menjalankan server pada port yang diinginkan
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
