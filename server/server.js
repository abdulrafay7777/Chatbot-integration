import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatLog from './models/ChatLogs.js';
import Product from './models/Product.js'; 

dotenv.config();
const app = express();

// --- 1. FIXED CORS SECTION ---
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow your Vercel domains (Client & Preview)
    // We use .includes to match both the main site and the random preview links
    if (origin.includes("chatbot-integration-client") || origin.includes("localhost")) {
      return callback(null, true);
    }

    // Default: Allow it (safest for debugging)
    return callback(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("Connected to MongoDB"))
        .catch(err => console.error("MongoDB Error:", err));
} else {
    console.error("MONGO_URI is missing in Environment Variables!");
}

const genAI = new GoogleGenerativeAI(API_KEY);

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
app.get('/', (req, res) => {
    res.send('Backend is running! API is at /api/chat');
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
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.json([]);
    }
});

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    const currentSession = sessionId || "guest";

    try {
        // Safe fetch of products
        let productListText = "CURRENT PRODUCT INVENTORY:\n";
        try {
            const products = await Product.find();
            products.forEach(p => {
                productListText += `- ${p.name} (${p.price}): ${p.description}\n`;
            });
        } catch (e) {
            console.log("Could not fetch products for context");
        }

        const fullPrompt = `${STATIC_CONTEXT}\n\n${productListText}\n\nUSER QUESTION: ${message}`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        // Safe save log
        try {
            await ChatLog.create({
                sessionId: currentSession,
                userMessage: message,
                botReply: text
            });
        } catch (e) {
            console.log("Could not save log");
        }

        res.json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Internal Server Error" });
    }
});

// --- 2. VERCEL EXPORT ---
// This is critical for Vercel to run the app
export default app;

// --- 3. LOCAL START (Fixed Crash) ---
// This ONLY runs on your computer, never on Vercel
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}