import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA5QqOGhud-GOyCdokpneK3wo3F-e7kP88";
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
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
