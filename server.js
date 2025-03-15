const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Use the correct API base URL for authentication
const MONCASH_API_URL = 'https://sandbox.moncashbutton.digicelgroup.com/Api';

// Route to get access token
app.post('/api/get-token', async (req, res) => {
  try {
    const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${MONCASH_API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json', // Added for consistency with docs
      },
      body: 'grant_type=client_credentials&scope=read,write', // Match working script order
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.log('MonCash Token Error:', errorData, 'Status:', response.status); // Enhanced logging
      return res.status(response.status).json({ 
        error: errorData.message || 'Failed to get access token', 
        status: response.status, 
        details: errorData 
      });
    }
    const data = await response.json();
    res.json({ accessToken: data.access_token });
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Route to create payment (keep GATEWAY_BASE for payment redirection)
app.post('/api/create-payment', async (req, res) => {
  const { accessToken, amount } = req.body;
  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    const response = await fetch(`${MONCASH_API_URL}/v1/CreatePayment`, {
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
    // Construct redirect URL as in your working script
    if (data.payment_token && data.payment_token.token) {
      const paymentUrl = `${MONCASH_API_URL.replace('/Api', '')}/Moncash-middleware/Payment/Redirect?token=${data.payment_token.token}`;
      return res.json({ paymentUrl });
    }
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
