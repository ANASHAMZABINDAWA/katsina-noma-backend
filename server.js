// server.js - Katsina Noma AI Backend (Fixed CORS + Gemini 2.5 Flash)
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// ====================== FIXED CORS CONFIGURATION ======================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://katsina-noma-assistant-2r8d.vercel.app',
    'https://katsina-noma-assistant.vercel.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Remove the problematic app.options('*', cors()) line

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in .env");
}

// ====================== PLANT IDENTIFICATION ======================
app.post('/plant-identify', async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const isHausa = language === "ha";

    const prompt = `You are a farming expert in Katsina State, Nigeria. Analyze the plant/leaf in the image and identify it.

Respond in ${isHausa ? "simple Hausa" : "simple English"}.

Include:
- Common name (and local Hausa name if known)
- Scientific name
- Whether it's a crop, weed, or wild plant
- Brief farming tips or warnings`;

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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not identify the plant.";

    res.json({ success: true, reply: reply.trim() });

  } catch (error) {
    console.error("Plant Identification Error:", error);
    res.status(500).json({ success: false, error: "Failed to identify the plant." });
  }
});

// ====================== PEST IDENTIFICATION ======================
app.post('/pest-identify', async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "No image provided" });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const isHausa = language === "ha";

    const prompt = `You are an expert agricultural pest identification assistant for farmers in Katsina State.

Analyze the image and identify the pest or disease.

Respond in ${isHausa ? "simple Hausa" : "simple English"}.

Provide:
1. Common name
2. How it damages the crop
3. Recommended control methods (organic first)
4. Prevention tips`;

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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not identify the pest.";

    res.json({ success: true, reply: reply.trim() });

  } catch (error) {
    console.error("Pest Identification Error:", error);
    res.status(500).json({ success: false, error: "Failed to identify the pest." });
  }
});

// ====================== CHAT ASSISTANT ======================
app.post('/chat', async (req, res) => {
  try {
    const { message, language = "en" } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: "Please send a message" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const isHausa = language === "ha";

    const systemPrompt = `You are Katsina Noma Assistant 🌾, a friendly farming assistant for farmers in Katsina State, Nigeria.
Give clear, practical advice on crops, pests, planting, etc.
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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    res.json({ success: true, reply: reply.trim() });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ success: false, error: "The AI is busy right now. Please try again." });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Katsina Noma Backend is running with Gemini 2.5 Flash');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});