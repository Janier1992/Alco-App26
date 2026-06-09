import{G as s}from"./vendor-core-CXPJgYbw.js";import"./vendor-react-Bfy4BUku.js";const l="AIzaSyAao48NBXbU0Kqwp8vJJl7J3I4vU4sRKO4";let t=null;try{t=new s(l)}catch(e){console.error("Error al inicializar GoogleGenerativeAI:",e)}const i=async(e="gemini-1.5-flash",n)=>{if(!t)return console.error("GoogleGenerativeAI no está inicializado. Verifica tu API Key."),null;try{return(await(await t.getGenerativeModel({model:e}).generateContent(n)).response).text()}catch(r){return console.error(`Error generando contenido con ${e}:`,r),null}},d=async(e,n)=>{const r=`
        Actúa como un experto en Calidad ISO 9001. Analiza el siguiente problema de No Conformidad:
        "${e}"
        ${n?`Contexto adicional: ${n}`:""}

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
    `;try{const o=await i("gemini-1.5-flash",r);if(!o)return null;console.log("Raw AI Response (RCA):",o);const a=o.match(/\{[\s\S]*\}/);return a?JSON.parse(a[0]):(console.error("No JSON found in response"),null)}catch(o){return console.error("Error in analyzeRootCause:",o),null}};export{d as analyzeRootCause,i as generateContent};
