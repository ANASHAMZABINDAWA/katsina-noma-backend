import express from "express";
import serverless from "serverless-http";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const getReply = (data) => {
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || "Sorry, I couldn't generate a response. Please try again later.";
};

app.post("/", async (req, res) => {
  try {
    const { message, language = "en" } = req.body;

    if (!message || message.trim() === "") {
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
    res.status(500).json({ success: false, error: "Sorry, the AI is busy right now. Please try again." });
  }
});

export default serverless(app);