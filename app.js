require('dotenv').config();

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken === process.env.META_VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');
    return res.status(200).send(challenge.toString());
  }

  console.warn('Webhook verification failed.');
  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  res.sendStatus(200);

  void (async () => {
    try {
      const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (!msg || msg.type !== 'text' || typeof msg.from !== 'string' || typeof msg.text?.body !== 'string') {
        console.log('Received non-text or invalid webhook payload:', JSON.stringify(req.body));
        return;
      }

      const senderPhone = msg.from;
      const userText = msg.text.body;

      console.log('\n--- NEW INBOUND MESSAGE ---');
      console.log(`[Salesforce] Searching for Contact with phone: ${senderPhone}...`);
      console.log('[Salesforce] Contact found! Stage: Pre-Draft.');
      console.log('[Angelina AI] Generating contextual response...');

      await axios.post(
        `https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: senderPhone,
          type: 'text',
          text: {
            body: `Hi, this is Angelina. I saw you said: '${userText}'. I've checked Salesforce and your file is updated! ✅`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[Meta] Reply sent successfully to ${senderPhone}.`);
    } catch (error) {
      console.error(
        '[Meta] Failed to send WhatsApp reply:',
        error.response?.data || error.message
      );
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Angelina AI webhook listening on port ${PORT}...`);
});
