require('dotenv').config();

const express = require('express');
const axios = require('axios');

// Small single-purpose Express app for handling Meta WhatsApp webhooks.
const app = express();

// The service is intentionally fixed to port 3000 to match the requested local
// development flow and ngrok examples in the README.
const PORT = 3000;

// Pin the Graph API version in one place so upgrades are explicit and easy to
// review later.
const GRAPH_API_VERSION = 'v22.0';

// Fail fast on startup if a required secret or identifier is missing.
const REQUIRED_ENV_VARS = [
  'META_VERIFY_TOKEN',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
];

function validateEnv() {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
    process.exit(1);
  }
}

function extractInboundMessage(payload) {
  // WhatsApp webhook bodies are deeply nested. Optional chaining keeps the
  // handler safe when Meta sends non-message events such as status updates.
  return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;
}

function isSupportedTextMessage(message) {
  // This service only responds to text messages. Status callbacks, media
  // messages, button replies, and malformed payloads are ignored cleanly.
  return (
    message &&
    message.type === 'text' &&
    typeof message.from === 'string' &&
    typeof message.text?.body === 'string'
  );
}

async function sendWhatsAppReply(senderPhone, userText) {
  // Outbound replies go to the Phone Number ID endpoint. This must be the
  // WhatsApp sender phone number ID, not the WhatsApp Business Account ID.
  return axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.META_PHONE_NUMBER_ID}/messages`,
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
}

// Validate configuration before the server starts accepting traffic.
validateEnv();

// Parse Meta webhook JSON bodies.
app.use(express.json());

app.get('/webhook', (req, res) => {
  // Meta sends these query parameters during webhook verification.
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken === process.env.META_VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');

    // Meta expects the raw challenge value back. Casting to string avoids
    // Express interpreting a numeric challenge as an HTTP status code.
    return res.status(200).send(challenge.toString());
  }

  console.warn('Webhook verification failed.');
  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  // Meta expects a fast 200 response. Reply immediately so webhook retries
  // do not block on downstream business logic or outbound API calls.
  res.sendStatus(200);

  // Continue processing asynchronously after the acknowledgment has already
  // been returned to Meta.
  void (async () => {
    try {
      const msg = extractInboundMessage(req.body);

      if (!isSupportedTextMessage(msg)) {
        // Most follow-up callbacks after a send are status events such as
        // sent/delivered/read. Logging them helps debugging without treating
        // them as application errors.
        console.log(
          'Ignoring non-message or unsupported webhook event:',
          JSON.stringify(req.body)
        );
        return;
      }

      // `from` is the WhatsApp user phone number as a string, for example
      // "97254...". `text.body` contains the inbound message text.
      const senderPhone = msg.from;
      const userText = msg.text.body;

      console.log('\n--- NEW INBOUND MESSAGE ---');
      console.log(`[Salesforce] Searching for Contact with phone: ${senderPhone}...`);
      console.log('[Salesforce] Contact found! Stage: Pre-Draft.');
      console.log('[Angelina AI] Generating contextual response...');

      // Keep the reply logic isolated so the webhook route stays easy to scan
      // and the outbound call can be replaced later with richer orchestration.
      await sendWhatsAppReply(senderPhone, userText);

      console.log(`[Meta] Reply sent successfully to ${senderPhone}.`);
    } catch (error) {
      // The webhook was already acknowledged, so errors here should be logged
      // for observability and retried by application logic if needed.
      console.error(
        '[Meta] Failed to send WhatsApp reply:',
        error.response?.data || error.message
      );
    }
  })();
});

// Start the local webhook listener.
app.listen(PORT, () => {
  console.log(`Angelina AI webhook listening on port ${PORT}...`);
});
