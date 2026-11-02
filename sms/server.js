require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = Number(process.env.PORT || 3000);
const DIR = path.join(__dirname, "data");
const STORE = path.join(DIR, "messages.json");
fs.mkdirSync(DIR, {recursive:true});
app.set("trust proxy", 1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.urlencoded({extended:false,limit:"20kb"}));
app.use(express.json({limit:"20kb"}));

function readMessages(){try{return JSON.parse(fs.readFileSync(STORE,"utf8"));}catch{return [];}}
function addMessage(item){const a=readMessages();a.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2,8),createdAt:new Date().toISOString(),...item});fs.writeFileSync(STORE,JSON.stringify(a.slice(0,1000),null,2));return a[0];}
function admin(req,res,next){
 const expected=process.env.ADMIN_PASSWORD||"";
 if(!expected||expected==="replace-with-a-long-unique-password")return res.status(503).json({error:"Set a secure ADMIN_PASSWORD in your hosting environment."});
 const h=(req.headers.authorization||"").split(" ");
 if(h[0]!=="Basic"||!h[1])return res.status(401).set("WWW-Authenticate",'Basic realm="JAY SMS"').json({error:"Sign in required."});
 let decoded="";try{decoded=Buffer.from(h[1],"base64").toString("utf8");}catch{}
 const i=decoded.indexOf(":");const supplied=i>=0?decoded.slice(i+1):"";
 if(i<0||supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return res.status(401).set("WWW-Authenticate",'Basic realm="JAY SMS"').json({error:"Incorrect password."});
 next();
}
function ready(){return !!(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&(process.env.TWILIO_PHONE_NUMBER||process.env.TWILIO_MESSAGING_SERVICE_SID));}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"JAY SMS",twilioConfigured:ready()}));
app.use("/api",admin);
app.use("/api/send",rateLimit({windowMs:60000,limit:5,standardHeaders:"draft-7",legacyHeaders:false}));
app.get("/api/messages",(req,res)=>res.json({messages:readMessages().slice(0,100)}));
app.post("/api/send",async(req,res)=>{
 const to=String(req.body.to||"").trim(),body=String(req.body.body||"").trim();
 if(!/^\+[1-9]\d{7,14}$/.test(to))return res.status(400).json({error:"Use an international number, e.g. +2348012345678."});
 if(!body||body.length>1000)return res.status(400).json({error:"Message must contain 1–1000 characters."});
 if(req.body.consent!==true)return res.status(400).json({error:"Confirm that the recipient agreed to receive this message."});
 if(!ready())return res.status(503).json({error:"Twilio is not configured. Add credentials and an SMS sender in your host settings."});
 try{
  const client=twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);
  const opts={to,body};
  if(process.env.TWILIO_MESSAGING_SERVICE_SID)opts.messagingServiceSid=process.env.TWILIO_MESSAGING_SERVICE_SID;else opts.from=process.env.TWILIO_PHONE_NUMBER;
  const sent=await client.messages.create(opts);
  const item=addMessage({direction:"outbound",to,from:sent.from||"",body,status:sent.status||"queued",sid:sent.sid});
  res.status(201).json({message:item});
 }catch(e){console.error("Twilio send error:",e.message);res.status(502).json({error:"Twilio could not send this SMS. Check sender, account permissions and destination."});}
});
app.post("/webhooks/twilio/sms",(req,res)=>{
 if(process.env.TWILIO_VALIDATE_WEBHOOKS==="true"){
  const sig=req.headers["x-twilio-signature"],base=process.env.PUBLIC_BASE_URL;
  const url=base?base.replace(/\/$/,"")+"/webhooks/twilio/sms":"";
  if(!sig||!url||!twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN||"",sig,url,req.body))return res.status(403).send("Invalid Twilio signature");
 }
 const from=String(req.body.From||""),body=String(req.body.Body||"").trim();
 if(!from||!body)return res.status(400).send("Missing message fields");
 const key=body.toUpperCase();
 const stop=["STOP","STOPALL","UNSUBSCRIBE","CANCEL","END","QUIT"];
 const start=["START","UNSTOP"];
 let reply="";
 if(stop.includes(key))reply="You have been opted out. No further messages will be sent.";
 if(start.includes(key))reply="You are opted back in. Reply STOP at any time to opt out.";
 addMessage({direction:"inbound",from,to:String(req.body.To||""),body,status:"received",sid:String(req.body.MessageSid||"")});
 const twiml=new twilio.twiml.MessagingResponse();if(reply)twiml.message(reply);
 res.type("text/xml").send(twiml.toString());
});
app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("JAY SMS running on port "+PORT));
