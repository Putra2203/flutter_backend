const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./Routes/auth');
require('dotenv').config();
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], 
}));

// Middleware untuk body parsing JSON
app.use(bodyParser.json());

app.options('*', cors());

// Menambahkan route untuk auth
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
