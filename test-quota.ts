import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

async function testQuota() {
    if (!API_KEY) {
        console.error("❌ ERROR: No API Key found. Set VITE_GEMINI_API_KEY environment variable.");
        return;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const modelsToTest = [
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-2.0-flash-lite",
        "gemini-pro"
    ];

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing quota for: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("hi");
            const response = await result.response;
            console.log(`✅ ${modelName} works!`);
        } catch (error: any) {
            console.error(`❌ ${modelName} failed: ${error.message}`);
        }
    }
}

testQuota();
