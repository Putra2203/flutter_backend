const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth"); // Rute untuk login/register
const productsRouter = require("./Routes/products"); // Rute produk
const authenticateToken = require("./middlewares/auth"); // Middleware autentikasi
require("dotenv").config();
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

// Konfigurasi CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

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

// Rute Public: Login dan Register (tidak memerlukan autentikasi)
app.use("/auth", authRoutes);

// Rute Proteksi: Produk (memerlukan autentikasi)
app.use("/api", authenticateToken, productsRouter); // Middleware diterapkan pada semua rute di /api

// Menjalankan server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
