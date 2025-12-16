// FILE: server/list_models.js
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("No API Key found in .env");
    process.exit(1);
}

console.log("Querying Google API for available models...");

// We use standard fetch to hit the API directly
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("❌ API ERROR:", data.error.message);
        } else if (data.models) {
            console.log("✅ SUCCESS! Here are your available models:");
            console.log("-----------------------------------------");
            data.models.forEach(m => {
                // We only care about models that support 'generateContent'
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`MODEL NAME: ${m.name.replace('models/', '')}`);
                }
            });
            console.log("-----------------------------------------");
            console.log("Use one of the names above in your server.js file.");
        } else {
            console.log("⚠️ No models found. This usually means the API is not enabled in Google Cloud.");
        }
    })
    .catch(err => console.error("Network Error:", err));