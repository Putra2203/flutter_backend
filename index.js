const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth");
const productsRouter = require("./Routes/products");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();
const corsOrigin = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOrigin));

app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/auth", authRoutes);
app.use("/api", productsRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
