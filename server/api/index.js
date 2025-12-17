import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatLog from '../models/ChatLogs.js';
import Product from '../models/Product.js'; 
import Settings from '../models/Settings.js'; // Import the new model

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5000", 
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["POST", "GET", "DELETE", "PUT"], // Added DELETE and PUT
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
        initializeSettings();
    })
    .catch(err => console.error("MongoDB Error:", err));

const genAI = new GoogleGenerativeAI(API_KEY);

// --- DEFAULT SETTINGS INITIALIZER ---
// If no settings exist, create the default one.
const DEFAULT_CONTEXT = `
YOU ARE: The Customer Support AI for "AirCloud Store".
TONE: Professional, polite, UK English.
ROLE: Assist customers with products, shipping, and returns.

[SHIPPING & RETURNS]
- Processing: 1-2 days. Delivery: 3-5 days.
- Returns: 14 days if unused. Customer pays postage.
- Issues: Report damaged items within 48h with photos.
`;

async function initializeSettings() {
    const exists = await Settings.findOne({ key: 'bot_config' });
    if (!exists) {
        await Settings.create({ key: 'bot_config', context: DEFAULT_CONTEXT, isActive: true });
        console.log("Default settings initialized.");
    }
}

// --- ROUTES ---

// 1. GET SETTINGS
app.get('/api/settings', async (req, res) => {
    const config = await Settings.findOne({ key: 'bot_config' });
    res.json(config);
});

// 2. UPDATE SETTINGS
app.put('/api/settings', async (req, res) => {
    const { context, isActive } = req.body;
    await Settings.findOneAndUpdate(
        { key: 'bot_config' }, 
        { context, isActive },
        { new: true }
    );
    res.json({ success: true });
});

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

// 3. DELETE CHAT SESSION (GDPR)
app.delete('/api/logs/:sessionId', async (req, res) => {
    try {
        await ChatLog.deleteMany({ sessionId: req.params.sessionId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
});

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    const currentSession = sessionId || "guest";

    try {
        // Fetch Settings Dynamicallly
        const config = await Settings.findOne({ key: 'bot_config' });
        
        // CHECK IF BOT IS DISABLED
        if (!config || !config.isActive) {
            return res.json({ reply: "Our AI assistant is currently offline. Please contact human support." });
        }

        const products = await Product.find();
        
        let productListText = "CURRENT PRODUCT INVENTORY:\n";
        products.forEach(p => {
            productListText += `- ${p.name} (${p.price}): ${p.description}\n`;
        });

        // Use the context from DB
        const fullPrompt = `${config.context}\n\n${productListText}\n\nUSER QUESTION: ${message}`;

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