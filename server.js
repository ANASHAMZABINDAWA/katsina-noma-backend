// server.js - Katsina Noma Backend (Final Clean Version)
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in .env file");
}

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://katsina-noma-assistant-2r8d.vercel.app',
    'https://katsina-noma-assistant.vercel.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Helper function
const getReply = (data) => {
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() 
    || "Sorry, I couldn't generate a response. Please try again later.";
};

// ====================== CHAT ENDPOINT ======================
app.post('/chat', async (req, res) => {
  try {
    const { message, language = "en" } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: "Please send a message" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: "Gemini API key not configured" });
    }

    const isHausa = language === "ha";

    const systemPrompt = `You are Katsina Noma Assistant 🌾, a friendly farming assistant for farmers in Katsina State, Nigeria.
Focus on local crops: gero, dawa, gyada, wake, masara, cotton etc.
Give clear, practical advice.
Respond in ${isHausa ? "simple Hausa" : "simple English"}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }]
        })
      }
    );

    const data = await response.json();
    const reply = getReply(data);

    res.json({ success: true, reply });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(503).json({ 
      success: false, 
      error: "The AI is taking too long. Please try again in a few seconds." 
    });
  }
});

// ====================== PLANT IDENTIFICATION ======================
app.post('/plant-identify', async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "No image provided" });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const isHausa = language === "ha";

    const prompt = `Identify this plant or leaf. Give common name, scientific name, and short farming advice for Katsina farmers. Respond in ${isHausa ? "simple Hausa" : "simple English"}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const reply = getReply(data);

    res.json({ success: true, reply });

  } catch (error) {
    console.error("Plant Identification Error:", error);
    res.status(503).json({ 
      success: false, 
      error: "The service is slow right now. Please wait 30 seconds and try again." 
    });
  }
});

// ====================== PEST IDENTIFICATION ======================
app.post('/pest-identify', async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "No image provided" });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const isHausa = language === "ha";

    const prompt = `Identify this pest or crop damage. Give name and practical control methods for farmers in Katsina. Respond in ${isHausa ? "simple Hausa" : "simple English"}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const reply = getReply(data);

    res.json({ success: true, reply });

  } catch (error) {
    console.error("Pest Identification Error:", error);
    res.status(503).json({ 
      success: false, 
      error: "The service is slow right now. Please wait 30 seconds and try again." 
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Katsina Noma Backend is running');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});