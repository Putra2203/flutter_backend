const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./Routes/auth');

const app = express();

app.use(bodyParser.json());

app.use('/auth', authRoutes);

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
