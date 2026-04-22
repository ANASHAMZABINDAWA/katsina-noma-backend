// server.js — Improved Groq Backend for Katsina Noma Assistant

require('dotenv').config();

const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

console.log('=== Katsina Noma Assistant - Groq Backend Starting ===');

if (!process.env.GROQ_API_KEY) {
  console.error('❌ ERROR: GROQ_API_KEY is missing in .env file');
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Use a faster and more reliable model
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

console.log('✅ Groq client initialized | Using model: llama-3.1-8b-instant');

// ==================== MAIN CHAT ENDPOINT ====================
app.post('/chat', async (req, res) => {
  console.log('>>> POST /chat received');

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const { messages, language = "en" } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      const isHausa = language === "ha";

      const systemPrompt = `You are Katsina Noma Assistant — a friendly, expert farming advisor for farmers in Katsina State, Nigeria.

Respond ONLY in ${isHausa ? "Hausa language" : "English language"} using simple, clear words.

Use local terms: gero (millet), dawa (sorghum), gyada (groundnut), wake (cowpea), masara (maize), striga, armyworm, etc.

Give practical, actionable advice. Be encouraging and respectful.`;

      const fullMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];

      console.log(`Attempt ${attempt + 1}: Calling Groq...`);

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",     // Fast & reliable model
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const reply = completion.choices[0]?.message?.content?.trim();

      if (!reply) throw new Error("No reply from Groq");

      console.log('✅ Groq responded successfully');
      return res.json({ reply });

    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt >= maxRetries) {
        let message = "Sorry, the AI is currently busy. Please try again in a moment.";
        
        if (error.message.includes('429')) {
          message = "Rate limit reached. Please wait 10-20 seconds and try again.";
        } else if (error.message.includes('timeout')) {
          message = "Request timed out. Please try again.";
        }

        return res.status(503).json({ error: message });
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: 'llama-3.1-8b-instant' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Groq backend running on http://localhost:${PORT}`);
});