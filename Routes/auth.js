const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");
require("dotenv").config();

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key" ;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

// Register - Pendaftaran User dengan Email dan Password
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validasi jika email atau username sudah digunakan
    const checkQuery = "SELECT * FROM users WHERE email = ? OR username = ?";
    db.query(checkQuery, [email, username], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      if (results.length > 0) {
        return res
          .status(400)
          .json({ message: "Email or username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Simpan user di database
      const query =
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
      db.query(query, [username, email, hashedPassword], (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        res.status(201).json({ message: "User registered successfully" });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Error during registration", error });
  }
});

// Login - Login dengan Email dan Password
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login successful", token });
  });
});

// Login with Google - Login menggunakan akun Google
router.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    // Verifikasi token Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub } = payload; // sub adalah ID unik Google

    // Cek apakah user sudah ada di database berdasarkan google_id
    const query = "SELECT * FROM users WHERE google_id = ?";
    db.query(query, [sub], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (results.length > 0) {
        // User sudah ada, buat token JWT dan kirimkan data
        const user = results[0];
        const jwtToken = jwt.sign(
          { id: user.id, email: user.email },
          SECRET_KEY,
          { expiresIn: "1h" }
        );
        return res.status(200).json({
          message: "Login successful",
          token: jwtToken,
          user: { id: user.id, username: user.username, email: user.email },
        });
      } else {
        // User belum ada, buat user baru di database
        const insertQuery =
          "INSERT INTO users (google_id, email, username) VALUES (?, ?, ?)";
        db.query(insertQuery, [sub, email, name], (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }

          // Buat token untuk pengguna baru
          const newUser = {
            id: result.insertId,
            google_id: sub,
            email,
            username: name,
          };
          const jwtToken = jwt.sign(
            { id: newUser.id, email: newUser.email },
            SECRET_KEY,
            { expiresIn: "1h" }
          );
          return res.status(201).json({
            message: "User created and logged in successfully",
            token: jwtToken,
            user: newUser,
          });
        });
      }
    });
  } catch (error) {
    return res.status(400).json({ message: "Invalid Google token", error });
  }
});

module.exports = router;
