require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DIR = path.join(__dirname, "data");
const STORE = path.join(DIR, "messages.json");
const OPTOUT_STORE = path.join(DIR, "opt-outs.json");
fs.mkdirSync(DIR, { recursive: true });
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.json({ limit: "20kb", verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); } }));

function readMessages() { try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch { return []; } }
function addMessage(item) {
  const messages = readMessages();
  const saved = { id: Date.now() + "-" + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), ...item };
  messages.unshift(saved);
  fs.writeFileSync(STORE, JSON.stringify(messages.slice(0, 1000), null, 2));
  return saved;
}
function readOptOuts() { try { return JSON.parse(fs.readFileSync(OPTOUT_STORE, "utf8")); } catch { return []; } }
function normalizeNumber(value) {
  const raw = String(value || "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(raw)) return null;
  return raw.slice(1);
}
function admin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || expected === "replace-with-a-long-unique-password") return res.status(503).json({ error: "Set a secure ADMIN_PASSWORD in your hosting environment." });
  const parts = (req.headers.authorization || "").split(" ");
  if (parts[0] !== "Basic" || !parts[1]) return res.status(401).set("WWW-Authenticate", 'Basic realm="JAY SMS"').json({ error: "Sign in required." });
  let decoded = "";
  try { decoded = Buffer.from(parts[1], "base64").toString("utf8"); } catch {}
  const separator = decoded.indexOf(":");
  const supplied = separator >= 0 ? decoded.slice(separator + 1) : "";
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (separator < 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).set("WWW-Authenticate", 'Basic realm="JAY SMS"').json({ error: "Incorrect password." });
  next();
}
function termiiConfig() { return Boolean(process.env.TERMII_API_KEY && process.env.TERMII_SENDER_ID && process.env.TERMII_BASE_URL); }
function verifyTermiiWebhook(req) {
  if (process.env.TERMII_VALIDATE_WEBHOOKS !== "true") return true;
  const secret = process.env.TERMII_WEBHOOK_SECRET || "";
  const signature = String(req.headers["x-termii-signature"] || "").replace(/^sha512=/i, "").trim().toLowerCase();
  if (!secret || !signature || !req.rawBody) return false;
  const expected = crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex");
  const receivedBuffer = Buffer.from(signature, "hex"), expectedBuffer = Buffer.from(expected, "hex");
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

app.get("/api/health", (req, res) => res.json({ ok: true, service: "JAY SMS", termiiConfigured: termiiConfig() }));
app.use("/api", admin);
app.use("/api/send", rateLimit({ windowMs: 60000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/api/messages", (req, res) => res.json({ messages: readMessages().slice(0, 100) }));

app.post("/api/send", async (req, res) => {
  const to = normalizeNumber(req.body.to), body = String(req.body.body || "").trim();
  if (!to) return res.status(400).json({ error: "Use an international number, e.g. +2348012345678." });
  if (!body || body.length > 1000) return res.status(400).json({ error: "Message must contain 1–1000 characters." });
  if (req.body.consent !== true) return res.status(400).json({ error: "Confirm that the recipient agreed to receive this message." });
  if (readOptOuts().includes("+" + to)) return res.status(403).json({ error: "This number is on the opt-out list. Do not message them." });
  if (!termiiConfig()) return res.status(503).json({ error: "Termii is not configured. Add the API key, base URL and approved sender ID in your hosting settings." });
  const baseUrl = String(process.env.TERMII_BASE_URL).replace(/\/+$/, "");
  if (!/^https:\/\//i.test(baseUrl)) return res.status(503).json({ error: "TERMII_BASE_URL must be an HTTPS URL copied from your Termii dashboard." });
  const sender = String(process.env.TERMII_SENDER_ID).trim();
  if (sender.length < 3 || sender.length > 11) return res.status(503).json({ error: "TERMII_SENDER_ID must be an approved sender ID between 3 and 11 characters." });
  const channel = process.env.TERMII_CHANNEL === "dnd" ? "dnd" : "generic";
  try {
    const response = await fetch(baseUrl + "/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, to, from: sender, sms: body, type: "plain", channel }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || (result.code && result.code !== "ok")) {
      console.error("Termii send rejected:", response.status, result.code || "unknown");
      return res.status(502).json({ error: "Termii did not accept this SMS. Check your sender ID, account balance, route and destination." });
    }
    const item = addMessage({ direction: "outbound", to: "+" + to, from: sender, body, status: result.message || "Message Sent", sid: String(result.message_id || result.message_id_str || ""), provider: "termii" });
    return res.status(201).json({ message: item });
  } catch (error) {
    console.error("Termii request error:", error.name || "Error");
    return res.status(502).json({ error: "Could not reach Termii. Check the base URL and try again." });
  }
});

app.post("/webhooks/termii/status", (req, res) => {
  if (!verifyTermiiWebhook(req)) return res.status(403).send("Invalid Termii signature");
  const event = req.body || {};
  const messageId = String(event.message_id || event.message_id_str || event.id || "");
  const status = String(event.status || "").trim();
  if (!messageId || !status) return res.status(400).json({ error: "Missing delivery report fields." });
  const messages = readMessages();
  const index = messages.findIndex(message => message.sid === messageId);
  if (index >= 0) {
    messages[index].status = status;
    messages[index].updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE, JSON.stringify(messages.slice(0, 1000), null, 2));
  }
  return res.status(200).json({ received: true, matched: index >= 0 });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log("JAY SMS running on port " + PORT));
