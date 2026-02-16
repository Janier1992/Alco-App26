import{G as l}from"./vendor-core-L0lX3Z62.js";const i="AIzaSyAao48NBXbU0Kqwp8vJJl7J3I4vU4sRKO4";let t=null;try{t=new l(i)}catch(n){console.error("Error al inicializar GoogleGenerativeAI:",n)}const s=async(n="gemini-1.5-flash",a)=>{if(!t)return console.error("GoogleGenerativeAI no está inicializado. Verifica tu API Key."),null;try{return(await(await t.getGenerativeModel({model:n}).generateContent(a)).response).text()}catch(e){return console.error(`Error generando contenido con ${n}:`,e),null}},u=async(n,a)=>{const e=`
        Actúa como un experto en Calidad ISO 9001. Analiza el siguiente problema de No Conformidad:
        "${n}"
        ${a?`Contexto adicional: ${a}`:""}

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
    `;try{const o=await s("gemini-1.5-flash",e);if(!o)return null;console.log("Raw AI Response (RCA):",o);const r=o.match(/\{[\s\S]*\}/);return r?JSON.parse(r[0]):(console.error("No JSON found in response"),null)}catch(o){return console.error("Error in analyzeRootCause:",o),null}},d=async n=>{const a=`
        Actúa como un agente de servicio al cliente y experto en calidad. Analiza el siguiente reclamo:
        "${n}"

        Clasifica la severidad (Baja, Media, Alta, Crítica) y redacta una respuesta empática y profesional.
        Responde SIEMPRE en Español. Asegúrate de que todos los campos de texto en la respuesta JSON estén en español (ej. "category", "severity", etc).
        Devuelve el resultado ESTRICTAMENTE en formato JSON:
        {
            "severity": "Media",
            "category": "Producto/Servicio/Atención",
            "suggestedResponse": "Estimado cliente...",
            "actionItems": ["Paso 1", "Paso 2"]
        }
    `;try{const e=await s("gemini-1.5-flash",a);if(!e)return null;console.log("Raw AI Response (Claim):",e);const o=e.match(/\{[\s\S]*\}/);return o?JSON.parse(o[0]):(console.error("No JSON found in response"),null)}catch(e){return console.error("Error in analyzeClaim:",e),null}};export{d as analyzeClaim,u as analyzeRootCause,s as generateContent};
