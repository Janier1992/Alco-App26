import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with the key from environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_KEY || import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
    } catch (error) {
        console.error("Error al inicializar GoogleGenerativeAI:", error);
    }
}

/**
 * Generates content using the specified model and prompt.
 * @param modelName - The name of the model to use (default: 'gemini-1.5-flash').
 * @param prompt - The prompt to send to the model.
 * @returns The generated text content or null if an error occurs.
 */
export const generateContent = async (modelName: string = "gemini-1.5-flash", prompt: string): Promise<string | null> => {
    if (!genAI) {
        console.error("GoogleGenerativeAI no está inicializado. Verifica tu API Key.");
        return null;
    }

    try {
        // Use gemini-1.5-flash-001 or fallback if needed
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(`Error generando contenido con ${modelName}:`, error);
        return null;
    }
};

/**
 * Generates content from an image and a prompt.
 * @param base64Image - The base64 encoded image string.
 * @param mimeType - The MIME type of the image.
 * @param prompt - The prompt to send to the model.
 * @returns The generated text content or null if an error occurs.
 */
export const generateImageContent = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    if (!genAI) return null;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            }
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generando contenido de imagen:", error);
        return null;
    }
};

/**
 * High-level function to analyze root causes (5 Whys)
 */
export const analyzeRootCause = async (problemDescription: string, context?: string): Promise<any> => {
    const prompt = `
        Actúa como un experto en Calidad ISO 9001. Analiza el siguiente problema de No Conformidad:
        "${problemDescription}"
        ${context ? `Contexto adicional: ${context}` : ''}

        Realiza un análisis de Causa Raíz utilizando la metodología de los 5 Porqués.
        Responde SIEMPRE en Español. Todos los textos dentro del JSON deben estar en español.
        Devuelve el resultado ESTRICTAMENTE en formato JSON con la siguiente estructura (sin bloques de código ni texto adicional):
        {
            "why1": "...",
            "why2": "...",
            "why3": "...",
            "why4": "...",
            "why5": "...",
            "rootCause": "La causa raíz identificada",
            "recommendedAction": "Acción correctiva sugerida"
        }
    `;

    try {
        const text = await generateContent("gemini-1.5-flash", prompt);
        if (!text) return null;

        console.log("Raw AI Response (RCA):", text);

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in response");
            return null;
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Error in analyzeRootCause:", error);
        return null;
    }
};

/**
 * High-level function to classify and respond to customer claims
 */
export const analyzeClaim = async (claimDescription: string): Promise<any> => {
    const prompt = `
        Actúa como un agente de servicio al cliente y experto en calidad. Analiza el siguiente reclamo:
        "${claimDescription}"

        Clasifica la severidad (Baja, Media, Alta, Crítica) y redacta una respuesta empática y profesional.
        Responde SIEMPRE en Español. Asegúrate de que todos los campos de texto en la respuesta JSON estén en español (ej. "category", "severity", etc).
        Devuelve el resultado ESTRICTAMENTE en formato JSON:
        {
            "severity": "Media",
            "category": "Producto/Servicio/Atención",
            "suggestedResponse": "Estimado cliente...",
            "actionItems": ["Paso 1", "Paso 2"]
        }
    `;

    try {
        const text = await generateContent("gemini-1.5-flash", prompt);
        if (!text) return null;

        console.log("Raw AI Response (Claim):", text);

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in response");
            return null;
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Error in analyzeClaim:", error);
        return null;
    }
};
