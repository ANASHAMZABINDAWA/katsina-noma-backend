// server.js - Katsina Noma AI with Google GenAI + Language Support
require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://katsina-noma-assistant-2r8d.vercel.app/'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Base system prompt (common part)
const BASE_PROMPT = `
You are Katsina Noma AI 🌾, a practical and friendly farming assistant for farmers in Katsina State, Nigeria.
Focus ONLY on farming topics relevant to Katsina State: masara (maize), gero (millet), dawa (sorghum), gyada (groundnut), wake (cowpea), etc.
Give clear, step-by-step advice on:
- Best planting time, spacing, depth, and techniques
- Soil fertility and use of organic manure/compost
- Water harvesting, irrigation, and drought management
- Common pests and diseases (striga, armyworm, downy mildew, rust, etc.) and safe/organic control methods
- Harvesting and basic marketing tips

Be polite, encouraging, and easy to understand. Use simple language.
If you are not very sure about something specific to the current season or location, say: "I recommend you also ask your local extension officer (ADP) for the latest advice."
`;

// Language-specific instructions
function getSystemPrompt(language) {
  if (language === "ha") {
    return BASE_PROMPT + `
Answer in **simple Hausa**, mixing with English only when necessary for farming terms (e.g. "masara", "striga", "manure").
Use everyday language that a farmer in Katsina will easily understand.
`;
  } else {
    // English (default)
    return BASE_PROMPT + `
Answer in **simple English**, mixing with Hausa terms when helpful (e.g. "masara (maize)", "gero (millet)").
Keep responses clear and practical.
`;
  }
}

let chatHistory = []; // Simple conversation memory

app.get('/', (req, res) => {
  res.send('✅ Katsina Noma AI Server is running with Language Support! 🌾');
});

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || req.body.text;
    const language = req.body.language || "en";   // Default to English

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: "Please send a message" 
      });
    }

    console.log(`Received message in ${language}:`, userMessage);

    const systemPrompt = getSystemPrompt(language);

    // Build contents array with system prompt first, then history
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...chatHistory,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const responseText = result.text || "Sorry, I couldn't generate a response.";

    // Save to history for next messages (keeps conversation context)
    chatHistory.push(
      { role: "user", parts: [{ text: userMessage }] },
      { role: "model", parts: [{ text: responseText }] }
    );

    // Optional: Keep only last 10 exchanges to save tokens
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    res.json({
      success: true,
      reply: responseText.trim(),
    });

  } catch (error) {
    console.error("Gemini API Error:", error.message || error);
    res.status(500).json({
      success: false,
      error: "Sorry, the AI is busy right now. Please try again in a moment.",
      details: error.message
    });
  }
});

// ====================== PEST IDENTIFICATION ENDPOINT ======================
app.post('/pest-identify', async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Add this to your .env

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const isHausa = language === "ha";

    const prompt = `You are an expert agricultural pest identification assistant for farmers in Katsina State, Nigeria.

Analyze the image and identify the pest or disease affecting the crop.

Respond in ${isHausa ? "Hausa language" : "English language"}.

Provide:
1. The common name of the pest or disease
2. Scientific name (if known)
3. How it damages the crop
4. Recommended control methods (prefer organic/local methods first, then chemical if necessary)
5. Prevention tips suitable for smallholder farmers in Katsina

Be practical and easy to understand.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64.split(',')[1]   // remove "data:image/jpeg;base64,"
                }
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API error");
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) throw new Error("No response from Gemini");

    res.json({ 
      reply: reply,
      success: true 
    });

  } catch (error) {
    console.error("Pest Identification Error:", error);
    res.status(500).json({ 
      error: "Failed to identify pest. Please try again." 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Katsina Noma AI Server running on http://localhost:${port}`);
  console.log(`🌾 Language support enabled (en/ha)`);
});