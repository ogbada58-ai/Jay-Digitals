# JAY SMS

A responsive SMS dashboard powered by the Termii REST API.

## Features
- One-to-one outbound SMS with recipient-consent confirmation
- Termii delivery-report webhook updates message status
- Message history stored on the server
- Contacts saved in the current browser
- Password-protected API, rate-limited send endpoint and validation
- Local opt-out suppression list

## Run locally
1. Use Node.js 20 or newer.
2. Open this folder in a terminal and run npm install.
3. Copy .env.example to .env.
4. Set a strong ADMIN_PASSWORD, your Termii API key, the base URL shown in your Termii dashboard, and an approved sender ID.
5. Run npm start and open http://localhost:3000.

Never commit .env. Never put the Termii API key in browser JavaScript or public GitHub files.

## Deploy
Deploy this sms folder as a Node.js service:
- Build command: npm install
- Start command: npm start
- Runtime: Node.js 20+

Add these as private environment variables in your hosting provider:
- ADMIN_PASSWORD
- TERMII_API_KEY
- TERMII_BASE_URL (copy the exact base URL shown in your Termii dashboard)
- TERMII_SENDER_ID (must be approved for your account)
- TERMII_CHANNEL (generic by default; use dnd only for transactional/critical messages when Termii has enabled that route for your account)
- TERMII_VALIDATE_WEBHOOKS
- TERMII_WEBHOOK_SECRET (if signature validation is enabled)

## Termii delivery reports
Configure a delivery-report webhook in the Termii developer console:
https://YOUR-DOMAIN/webhooks/termii/status

Use HTTP POST with JSON. To validate signatures, set TERMII_VALIDATE_WEBHOOKS=true and put the matching Termii webhook signing secret in TERMII_WEBHOOK_SECRET. Verify the signature format against the current Termii console/docs before enabling this in production.

The dashboard supports outgoing SMS and delivery-report status updates. Incoming customer replies are not implemented in this Termii migration.

## Important
- The sender ID must be approved by Termii. An alphanumeric sender ID is generally 3–11 characters.
- Termii expects the destination number in international format without the leading plus sign; the dashboard accepts +234... and normalizes it.
- Termii's generic route is for promotional/non-DND traffic. The dnd route is for transactional/critical messages and may need activation by Termii. Do not select a route contrary to the message purpose or provider rules.
- Confirm that recipients have agreed to receive messages. Respect opt-outs. The app suppresses numbers listed in sms/data/opt-outs.json; add numbers in international format (for example +2348012345678) to that JSON array.
- Do not use this app for spam, unsolicited bulk messaging, deception or harassment.
- Message history uses a local JSON file. Use persistent disk or a database before deploying to ephemeral hosting or multiple instances.
- Contacts are stored only in the current browser.
- Add full user accounts, audit logs and a database before offering multi-user production access.
