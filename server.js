import express from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(ai), model: ai ? modelName : null });
});

app.post("/api/chat", limiter, async (req, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "सर्वर में GEMINI_API_KEY सेट नहीं है। Hosting की Secrets/Environment Variables में अपनी Gemini API key जोड़ें।" });

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const imageData = typeof req.body?.imageData === "string" ? req.body.imageData : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "image/jpeg";
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message && !imageData) return res.status(400).json({ error: "सवाल लिखें या फोटो अपलोड करें।" });
    if (message.length > 12000) return res.status(413).json({ error: "सवाल बहुत लंबा है। छोटा करके भेजें।" });
    if (imageData && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(imageData)) {
      return res.status(400).json({ error: "कृपया JPG, PNG, WEBP या GIF फोटो अपलोड करें।" });
    }
    if (imageData.length > 12_000_000) return res.status(413).json({ error: "फोटो बहुत बड़ी है। छोटी फोटो अपलोड करें।" });

    const contents = [];
    for (const item of history.filter(x => x && ["user", "model"].includes(x.role) && typeof x.text === "string").slice(-8)) {
      contents.push({ role: item.role, parts: [{ text: item.text.slice(0, 3000) }] });
    }

    const parts = [];
    if (message) parts.push({ text: message });
    else parts.push({ text: "इस फोटो को ध्यान से देखें और उपयोगकर्ता की मदद करें।" });
    if (imageData) {
      const match = imageData.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
      if (!match) return res.status(400).json({ error: "फोटो डेटा पढ़ा नहीं जा सका। दोबारा अपलोड करें।" });
      parts.push({
        inlineData: {
          mimeType: match[1].toLowerCase().replace("image/jpg", "image/jpeg"),
          data: match[2]
        }
      });
    }
    contents.push({ role: "user", parts });

    const result = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: "आप Valmiki AI Master हैं, कंदेरा के AI सहायक। उपयोगकर्ता की भाषा में स्पष्ट और मददगार जवाब दें। फोटो मिलने पर उसका वर्णन या विश्लेषण करें और फोटो संपादन के अनुरोध पर साफ-साफ बताएं कि आप इस API endpoint से सीधे बदली हुई इमेज फाइल बना/लौटा नहीं सकते जब तक इमेज जनरेशन/एडिटिंग मॉडल और endpoint अलग से कॉन्फ़िगर न हों। गलत दावा न करें।"
      }
    });
    const answer = result.text || "माफ़ कीजिए, इस बार जवाब नहीं मिला।";
    res.json({ answer, model: modelName, imageEdited: false });
  } catch (error) {
    console.error("AI request failed:", error);
    const message = String(error?.message || "");
    if (/404|NOT_FOUND|model.*not found|not supported/i.test(message)) {
      return res.status(502).json({ error: `मॉडल "${modelName}" उपलब्ध नहीं है। Google AI Studio में अपने API key के लिए उपलब्ध मॉडल देखें और GEMINI_MODEL बदलें।` });
    }
    if (/API key|API_KEY_INVALID|invalid.*key|unauthorized/i.test(message)) {
      return res.status(502).json({ error: "Gemini API key गलत है या स्वीकार नहीं हुई। Hosting की Secrets सेटिंग में key जाँचें।" });
    }
    res.status(502).json({ error: "AI से जवाब नहीं मिला। API key, मॉडल और इंटरनेट/hosting logs जाँचें।" });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => {
  console.log(`Valmiki AI Master running on port ${PORT}`);
  console.log(`Gemini model: ${modelName}`);
  if (!apiKey) console.warn("GEMINI_API_KEY is missing.");
});
