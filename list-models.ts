import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("No API Key found");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    // Note: listModels is actually on the genAI instance or requires a different client
    // In @google/generative-ai, listing models is not directly on the main client in older versions.
    // I'll try a different approach if this fails.
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("ListModels failed:", err.message);
  }
}

listModels();
