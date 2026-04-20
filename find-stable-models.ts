import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA5QqOGhud-GOyCdokpneK3wo3F-e7kP88";

async function findModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        
        console.log("Searching for stable Flash/Pro models...");
        const models = data.models || [];
        
        const flashModels = models.filter((m: any) => m.name.includes("flash") && !m.name.includes("preview"));
        const proModels = models.filter((m: any) => m.name.includes("pro") && !m.name.includes("preview"));
        
        console.log("FLASH MODELS (Stable):", flashModels.map((m: any) => m.name));
        console.log("PRO MODELS (Stable):", proModels.map((m: any) => m.name));
        
        if (flashModels.length === 0 && proModels.length === 0) {
            console.log("No stable models found. Recent PREVIEW models:");
            const previews = models.filter((m: any) => m.name.includes("2.0") || m.name.includes("2.5") || m.name.includes("3.1"));
            console.log(previews.map((m: any) => m.name));
        }
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

findModels();
