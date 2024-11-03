// In serverImg.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(buffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Error fetching image');
  }
});

const port = 3010;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});