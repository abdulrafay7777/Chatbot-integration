import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatLog from './models/ChatLogs.js';
import Product from './models/Product.js'; 

dotenv.config();
const app = express();

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// --- 2. ROOT ROUTE 
app.get('/', (req, res) => {
    res.send('Server is Online!');
});

const API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is missing in Vercel Environment Variables!");
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB Connection Failed:", err));

const genAI = new GoogleGenerativeAI(API_KEY);

const STATIC_CONTEXT = `
YOU ARE: The Customer Support AI for "AirCloud Store".
TONE: Professional, polite, UK English.
ROLE: Assist customers with products, shipping, and returns.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        let productListText = "";
        try {
            const products = await Product.find();
            if(products.length > 0) {
                productListText = "PRODUCTS:\n" + products.map(p => `- ${p.name}: ${p.description}`).join("\n");
            }
        } catch (e) {
            console.log("Database read error (ignoring for now):", e);
        }

        const fullPrompt = `${STATIC_CONTEXT}\n\n${productListText}\n\nUSER QUESTION: ${message}`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("CHAT API ERROR:", error);
        res.status(500).json({ reply: "Server Error: Check Vercel Logs" });
    }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
    const port = 5000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}