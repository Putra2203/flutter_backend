const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./Routes/auth');

const app = express();

app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);

// Start server
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
