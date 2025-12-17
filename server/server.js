import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatLog from './models/ChatLogs.js';
import Product from './models/Product.js'; 

dotenv.config();
const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  "https://chatbot-integration-client.vercel.app", 
  "https://chatbot-integration-aircloud.vercel.app",
  "http://localhost:5173" 
];

app.use(cors({
  origin: "https://chatbot-integration-client.vercel.app",
  methods: ["POST", "GET"],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB Error:", err));

const genAI = new GoogleGenerativeAI(API_KEY);

// --- STATIC KNOWLEDGE ---
const STATIC_CONTEXT = `
YOU ARE: The Customer Support AI for "AirCloud Store".
TONE: Professional, polite, UK English.
ROLE: Assist customers with products, shipping, and returns.

[SHIPPING & RETURNS]
- Processing: 1-2 days. Delivery: 3-5 days.
- Returns: 14 days if unused. Customer pays postage.
- Issues: Report damaged items within 48h with photos.
`;

// --- ROUTES ---

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, description } = req.body;
        await Product.create({ name, price, description });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Could not save product" });
    }
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    const currentSession = sessionId || "guest";

    try {
        const products = await Product.find();
        
        let productListText = "CURRENT PRODUCT INVENTORY:\n";
        products.forEach(p => {
            productListText += `- ${p.name} (${p.price}): ${p.description}\n`;
        });

        const fullPrompt = `${STATIC_CONTEXT}\n\n${productListText}\n\nUSER QUESTION: ${message}`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        await ChatLog.create({
            sessionId: currentSession,
            userMessage: message,
            botReply: text
        });

        res.json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Internal Server Error" });
    }
});

app.get('/api/logs', async (req, res) => {
    const { sessionId } = req.query;
    let filter = sessionId ? { sessionId: { $regex: sessionId, $options: 'i' } } : {};
    const logs = await ChatLog.find(filter).sort({ timestamp: -1 });
    res.json(logs);
});

app.get('/', (req, res) => {
    res.send('Server is Ready! API is running at /api/chat');
});

export default app;

if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}