import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA5QqOGhud-GOyCdokpneK3wo3F-e7kP88";

async function testQuota() {
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
