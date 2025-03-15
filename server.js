const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for frontend requests

const GATEWAY_BASE = 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';

// Route to get access token
app.post('/api/get-token', async (req, res) => {
  try {
    const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${GATEWAY_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'scope=read,write&grant_type=client_credentials',
    });
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to get access token' });
    }
    const data = await response.json();
    res.json({ accessToken: data.access_token });
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to create payment
app.post('/api/create-payment', async (req, res) => {
  const { accessToken, amount } = req.body;
  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    const response = await fetch(`${GATEWAY_BASE}/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: parseFloat(amount), orderId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Payment creation failed' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check route for Render
app.get('/', (req, res) => {
  res.send('MonCash Backend is running');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));