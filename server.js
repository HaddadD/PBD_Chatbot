// 📦 Import dependencies
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// 🔐 Secure tokens from .env
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Facebook webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 🔮 Gemini AI handler
async function getGeminiReply(userMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-pro" });
    const result = await model.generateContent(userMessage);
    const response = result.response;
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I had trouble generating a reply.";
  }
}

// 📬 Facebook message handler (POST)
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message && webhookEvent.message.text) {
        const userMessage = webhookEvent.message.text;

        const aiReply = await getGeminiReply(userMessage);
        await sendMessage(senderId, aiReply);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// 📤 Send a message via Facebook Messenger
async function sendMessage(senderId, message) {
  try {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      recipient: { id: senderId },
      message: { text: message },
    });
  } catch (error) {
    console.error("❌ Failed to send message:", error.response?.data || error.message);
  }
}

// 🚀 Start server
app.listen(3000, () => {
  console.log('✅ Webhook server is running on port 3000');
});

