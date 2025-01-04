const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth");
const productsRouter = require("./Routes/products");
require("dotenv").config();
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: "File upload error",
      error: err.message,
    });
  }
  next(err);
});

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/auth", authRoutes);
app.use("/api", productsRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
