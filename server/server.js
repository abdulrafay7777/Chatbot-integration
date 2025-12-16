import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ChatLog from './models/ChatLogs.js';

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

if (!API_KEY) {
    console.error("CRITICAL ERROR: missing api key");
    process.exit(1);
}
if (!MONGO_URI) {
    console.error("CRITICAL ERROR: missing api key");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDb connected!"))
.catch(err => console.error("MongoDb connection error", err))

// Initialize Stable SDK
const genAI = new GoogleGenerativeAI(API_KEY);

const AIRCLOUD_CONTEXT = `
YOU ARE: The Customer Support AI for "AirCloud Store".
TONE: Polite, UK English.
KNOWLEDGE:
- Shipping: Free over £50. Standard delivery 3-5 days.
- Returns: 30 days policy.
- Products: "CloudPure 200" (£89) and "CloudPro 500" (£249).
`

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body; 

    const currentSession = sessionId || "guest-session";

    if (!message) return res.status(400).json({ reply: "Error: No message." });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fullPrompt = `${AIRCLOUD_CONTEXT}\n\nUSER QUESTION: ${message}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        // 2. Save with Session ID
        try {
            await ChatLog.create({
                sessionId: currentSession, 
                userMessage: message,
                botReply: text
            });
            console.log(`Saved to DB (Session: ${currentSession})`);
        } catch (dbError) {
            console.error("DB Error:", dbError);
        }

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ reply: "Internal Server Error" });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const { sessionId } = req.query;
        let filter = {};

        // If the admin searches for a specific session ID, filter the results
        if (sessionId) {
            filter = { sessionId: { $regex: sessionId, $options: 'i' } };
        }

        // Fetch logs from DB, sorted by newest first
        const logs = await ChatLog.find(filter).sort({ timestamp: -1 });
        
        res.json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: "Could not fetch logs" });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});