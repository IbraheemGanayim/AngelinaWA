# Angelina WhatsApp Webhook Service

Node.js webhook service for the Meta WhatsApp Cloud API. It receives inbound WhatsApp messages, acknowledges Meta webhooks correctly, simulates downstream business logic, and sends a dynamic text reply back to the sender.

This repository is intended as a clean developer handoff: minimal code, explicit setup, and a reliable local test flow using a Meta developer account and a WhatsApp test number.

## Quick Start

1. Clone the repository
2. Install dependencies
3. Add your Meta credentials to `.env`
4. Start the app
5. Expose port `3000` with ngrok
6. Configure the Meta webhook
7. Send a WhatsApp message to your Meta test number

## Features

- Verifies the Meta webhook challenge
- Handles inbound WhatsApp webhook events
- Safely ignores unsupported and status-only events
- Simulates CRM and AI workflow logging
- Sends a dynamic reply through the Meta Graph API

## Architecture

The service follows a simple request flow:

1. Meta sends a webhook event to `GET /webhook` or `POST /webhook`
2. `GET /webhook` handles one-time webhook verification
3. `POST /webhook` immediately returns `200` to prevent retries
4. The app extracts the inbound WhatsApp message from the webhook payload
5. The app simulates downstream business logic
6. The app sends a reply through the Meta Graph API using the configured Phone Number ID

In practice, this pattern is the correct baseline for production integrations:

- acknowledge webhooks immediately
- keep parsing defensive
- isolate outbound messaging logic
- log downstream failures without blocking Meta acknowledgments

## Tech Stack

- Node.js
- Express
- Axios
- dotenv
- Meta WhatsApp Cloud API

## Prerequisites

Before running the service, you need:

- A Meta developer app with WhatsApp enabled
- A WhatsApp sender in Meta:
  - a test number, or
  - a production number
- Your own WhatsApp number added as an allowed recipient if you are testing with the Meta test number
- The following Meta values:
  - `META_VERIFY_TOKEN`
  - `META_ACCESS_TOKEN`
  - `META_PHONE_NUMBER_ID`

Important:

- `META_PHONE_NUMBER_ID` must be the Phone Number ID
- Do not use the WhatsApp Business Account ID in its place
- If this integration is intended for client delivery, partner distribution, or production onboarding at scale, consider enrolling as a Meta Tech Provider so your business setup is aligned with longer-term platform usage

## Environment Setup

Create `.env` from the example file:

```bash
cp .env.example .env
```

Then set:

```env
META_VERIFY_TOKEN=your_verify_token
META_ACCESS_TOKEN=your_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
```

## Install

```bash
npm install
```

## Run Locally

Start the webhook server:

```bash
npm start
```

Expose the local service publicly with ngrok:

```bash
npx ngrok http 3000
```

You can also run both together:

```bash
npm run dev
```

## Meta Webhook Setup

In your Meta developer app:

1. Open `WhatsApp > Configuration`
2. Set the callback URL to:

```text
https://your-ngrok-url.ngrok-free.app/webhook
```

3. Set the verify token to the same value as `META_VERIFY_TOKEN`
4. Click `Verify and save`
5. Subscribe the `messages` webhook field

## Testing with Your Own WhatsApp

If you are using the Meta test number:

1. Add your own phone number as an allowed test recipient in Meta
2. Open WhatsApp on your phone
3. Send a message to the Meta test number

Expected outcome:

- Meta sends the inbound webhook to your server
- The server logs the simulated workflow
- The service sends a reply through the Graph API
- You receive the response in WhatsApp

## Example Output

```text
Angelina AI webhook listening on port 3000...

--- NEW INBOUND MESSAGE ---
[Salesforce] Searching for Contact with phone: 15550001111...
[Salesforce] Contact found! Stage: Pre-Draft.
[Angelina AI] Generating contextual response...
[Meta] Reply sent successfully to 15550001111...
```

Webhook events such as `sent`, `delivered`, and `read` are normal status callbacks. The service logs and ignores them.

## Example Payloads

### Example inbound webhook payload

This is the shape the app reads when a user sends a text message:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "15550001111",
                "type": "text",
                "text": {
                  "body": "Hi"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Example outbound reply payload

This is the body sent to the Meta Graph API:

```json
{
  "messaging_product": "whatsapp",
  "to": "15550001111",
  "type": "text",
  "text": {
    "body": "Hi, this is Angelina. I saw you said: 'Hi'. I've checked Salesforce and your file is updated! ✅"
  }
}
```

## API Summary

### `GET /webhook`

Used by Meta for webhook verification.

Behavior:

- Reads `hub.mode`, `hub.verify_token`, and `hub.challenge`
- Verifies the token against `META_VERIFY_TOKEN`
- Returns `challenge.toString()` when valid
- Returns `403` when invalid

### `POST /webhook`

Used by Meta for inbound message delivery.

Behavior:

- Immediately returns HTTP `200`
- Reads the inbound message from:

```text
req.body.entry[0].changes[0].value.messages[0]
```

- Processes supported text messages only
- Sends an outbound reply to:

```text
POST https://graph.facebook.com/v22.0/{META_PHONE_NUMBER_ID}/messages
```

## Project Structure

```text
.
├── app.js
├── .env.example
├── package.json
└── README.md
```

## Developer Notes

- Keep `node app.js` running during testing
- Keep the ngrok tunnel active during testing
- If the ngrok URL changes, update the webhook callback URL in Meta
- Never commit `.env`
- Rotate exposed access tokens immediately

## Repository Description

Production-ready Node.js webhook for Meta WhatsApp Cloud API inbound messages with simulated AI replies and a clean local test flow.
