# Angelina WhatsApp Webhook Service

Minimal Node.js service for receiving inbound WhatsApp Cloud API webhooks and sending a simulated AI reply through the Meta Graph API.

## What it does

- Verifies the Meta webhook challenge.
- Accepts inbound WhatsApp message events.
- Safely ignores non-text and status events.
- Logs a mocked business workflow:
  - Salesforce contact lookup
  - Angelina AI response generation
- Sends a dynamic text reply back to the sender.

## Stack

- Node.js
- Express
- Axios
- dotenv
- WhatsApp Cloud API

## Prerequisites

You need:

- A Meta developer app with WhatsApp enabled
- A WhatsApp test number or a production WhatsApp sender
- Your own WhatsApp number added as a test recipient if you are using the Meta test number
- These values from Meta:
  - `META_VERIFY_TOKEN`
  - `META_ACCESS_TOKEN`
  - `META_PHONE_NUMBER_ID`

Important:

- `META_PHONE_NUMBER_ID` must be the Phone Number ID, not the WhatsApp Business Account ID.

## Environment

Create a `.env` file:

```env
META_VERIFY_TOKEN=your_verify_token
META_ACCESS_TOKEN=your_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
```

You can copy from:

```bash
cp .env.example .env
```

## Install

```bash
npm install
```

## Run locally

Start the webhook service:

```bash
npm start
```

Expose port `3000` to the internet:

```bash
npx ngrok http 3000
```

Or run both together:

```bash
npm run dev
```

## Configure Meta webhook

In your Meta developer app:

1. Open `WhatsApp > Configuration`
2. Set the callback URL to:

```text
https://your-ngrok-url.ngrok-free.app/webhook
```

3. Set the verify token to your `META_VERIFY_TOKEN`
4. Click `Verify and save`
5. Subscribe the `messages` webhook field

## Send a test message

If you are using the Meta test number:

1. Add your own WhatsApp number as an allowed recipient in Meta
2. Send a WhatsApp message from your personal phone to the Meta test number

Expected result:

- Your server logs the inbound event
- The service sends a dynamic text reply
- You receive the reply in WhatsApp

## Example server output

```text
Angelina AI webhook listening on port 3000...

--- NEW INBOUND MESSAGE ---
[Salesforce] Searching for Contact with phone: 972...
[Salesforce] Contact found! Stage: Pre-Draft.
[Angelina AI] Generating contextual response...
[Meta] Reply sent successfully to 972...
```

Status events like `sent`, `delivered`, and `read` are normal. The service receives them as webhook callbacks and ignores them.

## Project structure

```text
.
├── app.js
├── .env.example
├── package.json
└── README.md
```

## API behavior

### `GET /webhook`

- Reads `hub.mode`, `hub.verify_token`, and `hub.challenge`
- Verifies the token against `META_VERIFY_TOKEN`
- Returns `challenge.toString()` on success

### `POST /webhook`

- Immediately returns HTTP `200`
- Reads `req.body.entry[0].changes[0].value.messages[0]`
- Processes only text messages
- Replies through:

```text
POST https://graph.facebook.com/v22.0/{META_PHONE_NUMBER_ID}/messages
```

## Notes for developers

- Keep the process running while testing
- Keep the ngrok tunnel running while Meta sends webhooks
- If the ngrok URL changes, update the Meta callback URL
- Do not commit `.env`
- Rotate access tokens if they are ever exposed

## Suggested repository description

Production-ready Node.js webhook for Meta WhatsApp Cloud API inbound messages with simulated AI replies and a clean local test flow.
