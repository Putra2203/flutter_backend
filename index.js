const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./Routes/auth');
const productsRouter = require("./Routes/products");
require('dotenv').config();
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], 
}));

app.use(bodyParser.json());

app.options('*', cors());

app.use('/auth', authRoutes);
app.use("/api", productsRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});