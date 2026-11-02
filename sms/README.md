# JAY SMS

A responsive SMS dashboard powered by Twilio.

## Features
- One-to-one outbound SMS with recipient-consent confirmation
- Incoming SMS webhook
- Message history stored on the server
- Contacts saved in the current browser
- Password-protected API, rate-limited send endpoint and validation
- Optional Twilio webhook signature validation

## Run locally
1. Use Node.js 20 or newer.
2. Open this folder in a terminal and run npm install.
3. Copy .env.example to .env.
4. Set a long ADMIN_PASSWORD, Twilio Account SID, Auth Token and an SMS sender.
5. Run npm start and open http://localhost:3000.

Never commit .env. Never put Twilio credentials in browser JavaScript or public GitHub files.

## Deploy
Deploy this sms folder as a Node.js service:
- Build command: npm install
- Start command: npm start
- Runtime: Node.js 20+

Add private environment variables in your host dashboard:
ADMIN_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (or TWILIO_MESSAGING_SERVICE_SID), PUBLIC_BASE_URL.

For incoming SMS, set the Twilio number's webhook to:
https://YOUR-DOMAIN/webhooks/twilio/sms
Use HTTP POST. Set PUBLIC_BASE_URL to the exact HTTPS origin and set TWILIO_VALIDATE_WEBHOOKS=true.

## Important
- Trial accounts can only send to verified destinations and may add a trial prefix.
- Confirm that your sender is permitted to send SMS to the destination country; check country-specific pricing and registration rules.
- Obtain permission before messaging. Respect STOP and other opt-out requests. Never use this app for spam, unsolicited bulk messaging, deception or harassment.
- Message history uses a local JSON file. Use persistent disk or a database before deploying to ephemeral hosting or multiple instances.
- Contacts are stored only in the current browser.
- Add full user accounts, audit logs and a database before offering multi-user production access.
