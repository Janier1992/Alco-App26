import{G as s}from"./vendor-core-C3XopWI3.js";import"./vendor-react-UlIMTZ8g.js";const l="AIzaSyDummyKeyPlaceholderToSatisfyViteBuild";let a=null;try{a=new s(l)}catch(e){console.error("Error al inicializar GoogleGenerativeAI:",e)}const i=async(e="gemini-1.5-flash",r)=>{if(!a)return console.error("GoogleGenerativeAI no está inicializado. Verifica tu API Key."),null;try{return(await(await a.getGenerativeModel({model:e}).generateContent(r)).response).text()}catch(n){return console.error(`Error generando contenido con ${e}:`,n),null}},d=async(e,r)=>{const n=`
        Actúa como un experto en Calidad ISO 9001. Analiza el siguiente problema de No Conformidad:
        "${e}"
        ${r?`Contexto adicional: ${r}`:""}

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
    `;try{const o=await i("gemini-1.5-flash",n);if(!o)return null;console.log("Raw AI Response (RCA):",o);const t=o.match(/\{[\s\S]*\}/);return t?JSON.parse(t[0]):(console.error("No JSON found in response"),null)}catch(o){return console.error("Error in analyzeRootCause:",o),null}};export{d as analyzeRootCause,i as generateContent};
