-- ==============================================================================
-- INSFORGE HOTFIX: TASK ASSIGNEES SCHEMA REPAIR
-- Este script elimina la tabla con el UUID erróneo y la recrea limpiamente con TEXT
-- ==============================================================================

-- 1. Eliminar la tabla problemática de raíz
DROP TABLE IF EXISTS public.task_assignees CASCADE;

-- 2. Recrear la tabla aceptando Usuarios en formato de Texto Completo
CREATE TABLE public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Aquí guardamos nombres reales (ej. "ALEJANDRO AGUDELO")
    user_initials TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar la seguridad (RLS) para que la App Front-End pueda leer y escribir
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow ALL on task_assignees" ON public.task_assignees;
CREATE POLICY "Allow ALL on task_assignees" ON public.task_assignees FOR ALL USING (true) WITH CHECK (true);

-- 4. CRÍTICO: Recargar la caché de PostgREST para que Insforge reconozca que ahora es TEXT y no devuelva el viejo error UUID.
NOTIFY pgrst, 'reload schema';
