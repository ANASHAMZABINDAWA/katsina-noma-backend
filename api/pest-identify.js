import express from "express";
import serverless from "serverless-http";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const getReply = (data) => {
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || "Failed to identify the pest.";
};

app.post("/", async (req, res) => {
  try {
    const { imageBase64, language = "en" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "No image provided" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: "Gemini API key not configured" });
    }

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
    res.status(500).json({ success: false, error: "Failed to identify the pest. Please try again." });
  }
});

export default serverless(app);