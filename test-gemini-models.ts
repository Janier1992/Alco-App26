import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

async function testModels() {
    if (!API_KEY) {
        console.error("❌ ERROR: No API Key found. Set VITE_GEMINI_API_KEY environment variable.");
        return;
    }
    console.log("Using API KEY:", API_KEY.substring(0, 5) + "...");
    
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-pro"
    ];

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("hi");
            const response = await result.response;
            console.log(`✅ ${modelName} works! Response: ${response.text().substring(0, 20).replace(/\n/g, ' ')}...`);
        } catch (error: any) {
            console.error(`❌ ${modelName} failed: ${error.message}`);
        }
    }
}

testModels();
