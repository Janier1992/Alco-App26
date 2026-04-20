import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@insforge/sdk";
import fs from "fs";
import path from "path";

// Configuración desde .env (hardcoded para el script de ejecución directa)
const API_KEY = "AIzaSyA5QqOGhud-GOyCdokpneK3wo3F-e7kP88";
const INSFORGE_URL = "https://5czjn84m.us-east.insforge.app";
const INSFORGE_KEY = "ik_1993a732585fd3d931ef489e85fa4591";

const genAI = new GoogleGenerativeAI(API_KEY);
const insforge = createClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });

const DOCUMENTS_DIR = "c:\\Users\\calidad.posventas\\Desktop\\App_Alco\\DOCUMENT.md";

async function indexPDFs() {
    console.log("🚀 Iniciando indexación de Base de Conocimiento...");

    const files = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
    
    for (const file of files) {
        const filePath = path.join(DOCUMENTS_DIR, file);
        const stats = fs.statSync(filePath);
        
        // Saltar archivos gigantes (> 10MB) por ahora para evitar bloqueos
        if (stats.size > 10 * 1024 * 1024) {
            console.log(`⚠️ Saltando ${file} por tamaño excesivo (${(stats.size/1024/1024).toFixed(1)}MB)`);
            continue;
        }

        console.log(`\n📄 Procesando: ${file}...`);

        try {
            // 1. Leer PDF y extraer texto usando Gemini (como OCR avanzado)
            const pdfData = fs.readFileSync(filePath);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            
            const prompt = "Extrae TODO el texto de este documento técnico de forma estructurada. Mantén tablas y especificaciones intactas. Responde solo con el texto extraído.";
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: pdfData.toString("base64"), mimeType: "application/pdf" } }
            ]);
            
            const text = result.response.text();
            console.log(`✅ Texto extraído (${text.length} caracteres).`);

            // 2. Fragmentar texto (Chunks de ~1000 chars con solapamiento)
            const chunks = chunkText(text, 1000, 200);
            console.log(`✂️ Generados ${chunks.length} fragmentos.`);

            // 3. Generar Embeddings e Insertar
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`Vectorizando fragmento ${i+1}/${chunks.length}...`);
                
                try {
                    const embResult = await embeddingModel.embedContent(chunk);
                    const vector = embResult.embedding.values;

                    // 4. Guardar en Insforge
                    const { error } = await insforge.database.from("kb_fragments").insert([{
                        document_id: file,
                        content: chunk,
                        embedding: vector,
                        metadata: { source: file, chunk_index: i }
                    }]);

                    if (error) {
                        console.error(`\n❌ Error insertando fragmento ${i}:`, error.message);
                    }
                    
                    // Pausa para evitar 429 en cuota gratuita
                    await new Promise(r => setTimeout(r, 1000));
                } catch (embErr: any) {
                    console.error(`\n❌ Error en embedding ${i}:`, embErr.message);
                    if (embErr.message.includes('429')) {
                        console.log("Esperando 10s por límite de cuota...");
                        await new Promise(r => setTimeout(r, 10000));
                        i--; // Reintentar este mismo
                    }
                }
            }
            console.log(`\n✨ Finalizado: ${file}`);
        } catch (error: any) {
            console.error(`❌ Error procesando ${file}:`, error.message);
        }
    }
    console.log("\n🏁 ¡Indexación completada con éxito!");
}

function chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = start + size;
        chunks.push(text.substring(start, end));
        start += size - overlap;
    }
    return chunks;
}

indexPDFs();
