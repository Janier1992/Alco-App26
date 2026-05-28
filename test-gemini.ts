import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

async function test() {
    if (!API_KEY || !genAI) {
        console.error("❌ ERROR: No API Key found. Set VITE_GEMINI_API_KEY environment variable.");
        return;
    }
    console.log("Testing Gemini API connection...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 
        const result = await model.generateContent("Say hello");
        console.log("Gemini Response:", result.response.text());
    } catch (e: any) {
        console.error("Gemini Error:", e.message);
    }
}

test();
