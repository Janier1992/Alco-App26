# Alco Proyectos v2.0 - Ecosistema Cognitivo de Gestión de Calidad

Bienvenido al repositorio de **Alco Proyectos**, una plataforma integral diseñada para transformar la gestión de calidad y proyectos en obra. Esta aplicación evoluciona los procesos tradicionales hacia un ecosistema digital inteligente, impulsado por IA para asistir en la toma de decisiones, automatización de reportes y gestión en tiempo real.

## 🚀 Visión del Proyecto

El objetivo principal es convertir la gestión operativa en una ventaja estratégica, pasando de la simple recolección de datos a la **Inteligencia Activa**. La plataforma actúa como la "Fuente Única de Verdad" para inspectores, instaladores y gerentes.

## ✨ Funcionalidades Principales

### 🧠 Inteligencia Artificial (Agent Hub)
- **Asistentes Especializados:**
  - **Quality Copilot:** Asistencia en normativas y diagnósticos.
  - **Data Scientist:** Análisis de tendencias y predicciones.
  - **Verificación Técnica:** Validación de instalaciones contra planos.
- **RAG (Retrieval-Augmented Generation):** Consultas sobre manuales técnicos y normativas internas.

### 🛠️ Módulos Operativos
- **Dashboard Ejecutivo:** Vista general de indicadores clave (KPIs) y estado de proyectos.
- **Gestión de Calidad:**
  - **Formularios Dinámicos:** Inspecciones en campo configurables.
  - **No Conformidades (NC):** Registro, seguimiento y cierre de hallazgos.
  - **Auditorías:** Planificación y ejecución de auditorías de calidad.
- **Metrología:** Control de equipos, calibraciones y reemplazos.
- **Instalaciones:** Seguimiento al avance de instalaciones en obra.
- **Biblioteca Técnica:** Repositorio centralizado de documentos y normativas.

### 📱 Experiencia Móvil & PWA
- **100% Responsivo:** Diseño adaptativo optimizado para dispositivos móviles (smartphones y tablets) y escritorio.
- **PWA (Progressive Web App):** 
  - Instalable en Android, iOS y Escritorio (Chrome/Edge).
  - Funciona como una aplicación nativa (sin barra de navegación del navegador).
  - Actualizaciones automáticas.

## 💻 Stack Tecnológico

Este proyecto utiliza una arquitectura moderna y escalable (MACH):

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **PWA:** Soporte offline con `vite-plugin-pwa`.

### Backend & Servicios
- **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Gotrue)
- **IA Generativa:** [Google GenAI SDK](https://ai.google.dev/) (Gemini Models)
- **Iconos:** Heroicons

## 📦 Instalación y Despliegue

### Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn

### Pasos para Ejecutar Localmente

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/Janier1992/Alco-App26.git
    cd Alco-App26
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env` en la raíz basado en `.env.local` y añade tus credenciales de Supabase y Google GenAI.

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

5.  **Construir para producción:**
    ```bash
    npm run build
    ```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, asegúrate de seguir los estándares de código y actualizar las pruebas según sea necesario.

---
*Desarrollado por el equipo de Calidad Posventas - Alco*
