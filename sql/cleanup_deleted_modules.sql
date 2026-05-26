-- =========================================================================================
-- SCRIPT DE AJUSTE Y LIMPIEZA DE BASE DE DATOS - ALCO PROYECTOS V2.0
-- Ejecuta este script en el editor SQL de InsForge/Supabase para eliminar las tablas
-- y dependencias de los módulos removidos de la aplicación:
-- 1. Módulo de Gestión de Proyectos (Tableros, Columnas, Tareas, etc.)
-- 2. Módulo de Auditorías ISO 9001 (Auditorías y Hallazgos)
-- 3. Módulo de Gestión Documental (Documentos SGC)
-- =========================================================================================

BEGIN;

-- 1. ELIMINACIÓN DE TABLAS DE GESTIÓN DE PROYECTOS (KANBAN BOARD)
-- Se eliminan primero las tablas dependientes debido a las restricciones de Foreign Keys.
DROP TABLE IF EXISTS public.task_checklists CASCADE;
DROP TABLE IF EXISTS public.task_labels CASCADE;
DROP TABLE IF EXISTS public.task_assignees CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.board_tasks CASCADE;
DROP TABLE IF EXISTS public.board_columns CASCADE;
DROP TABLE IF EXISTS public.board_projects CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;

-- 2. ELIMINACIÓN DE TABLAS DE AUDITORÍAS ISO 9001
DROP TABLE IF EXISTS public.audit_findings CASCADE;
DROP TABLE IF EXISTS public.audits CASCADE;

-- 3. ELIMINACIÓN DE TABLA DE GESTIÓN DOCUMENTAL (SGC DOCUMENTS)
DROP TABLE IF EXISTS public.sgc_documents CASCADE;

-- =========================================================================================
-- NOTA DE COMPATIBILIDAD CON MENSAJERÍA
-- Si tu base de datos tenía referencias en la tabla public.conversations (como NC, proyectos, etc.)
-- y deseabas purgar los registros asociados a módulos eliminados, se puede ejecutar la siguiente
-- limpieza preventiva para evitar referencias huérfanas en los chats grupales:
-- =========================================================================================
UPDATE public.conversations
SET linked_module = NULL,
    linked_id = NULL
WHERE linked_module IN ('project', 'audit', 'document');

COMMIT;

-- =========================================================================================
-- SCRIPT DE LIMPIEZA FINALIZADO CON ÉXITO
-- =========================================================================================
