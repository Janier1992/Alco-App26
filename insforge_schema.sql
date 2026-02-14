-- ==========================================
-- ALCO APP - DEFINITIVE INSFORGE SCHEMA
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES & AUTH SYNC
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.profile->>'name', new.email), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. MASTER DATA & CONFIG
CREATE TABLE IF NOT EXISTS public.master_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL, 
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(category, value)
);

CREATE TABLE IF NOT EXISTS public.external_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. KANBAN ENGINE (PROJECTS & MAINTENANCE)
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'projects' or 'maintenance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    column_id UUID REFERENCES public.board_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Media',
    due_date TIMESTAMP WITH TIME ZONE,
    asset_id TEXT, 
    maintenance_type TEXT, 
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. QUALITY MODULE (AUDITS & CLAIMS)
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    version TEXT DEFAULT '1',
    audit_date DATE NOT NULL,
    process TEXT NOT NULL,
    auditor TEXT NOT NULL,
    objective TEXT,
    scope TEXT,
    status TEXT DEFAULT 'Planificada',
    executive_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_findings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE,
    clause TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    type TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quality_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_number TEXT UNIQUE,
    customer TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Abierta',
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. NON-CONFORMITIES (NC) & CAPA
CREATE TABLE IF NOT EXISTS public.non_conformities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    serial_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    process TEXT NOT NULL,
    project TEXT,
    severity TEXT DEFAULT 'Mayor',
    description TEXT,
    status TEXT DEFAULT 'Abierta',
    rca JSONB DEFAULT '{"why1": "", "why2": "", "why3": "", "why4": "", "why5": "", "rootCause": ""}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nc_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nc_id UUID REFERENCES public.non_conformities(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    description TEXT NOT NULL,
    responsible TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nc_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nc_id UUID REFERENCES public.non_conformities(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. METROLOGY
CREATE TABLE IF NOT EXISTS public.metrology_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    folio TEXT UNIQUE,
    date DATE NOT NULL,
    operator TEXT NOT NULL,
    area TEXT,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.metrology_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    record_id UUID REFERENCES public.metrology_records(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    brand TEXT,
    measurement TEXT,
    nominal_value TEXT,
    actual_value TEXT,
    status TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. FIELD INSPECTIONS (FORMS)
CREATE TABLE IF NOT EXISTS public.field_inspections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    area_proceso TEXT NOT NULL,
    op TEXT NOT NULL,
    plano_opc TEXT,
    diseno_referencia TEXT,
    cant_total INTEGER DEFAULT 0,
    cant_retenida INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'Aprobado',
    defecto TEXT DEFAULT 'NINGUNO',
    reviso TEXT,
    responsable TEXT,
    accion_correctiva TEXT,
    observacion_sugerida TEXT,
    observacion TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. GLOBAL RLS POLICIES
DO $$ 
DECLARE 
    t record;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Enable authenticated all" ON public.%I', t.tablename);
        EXECUTE format('CREATE POLICY "Enable authenticated all" ON public.%I FOR ALL USING (true)', t.tablename);
    END LOOP;
END $$;

-- 10. INITIAL SEED DATA
INSERT INTO public.boards (name, type) VALUES ('Mantenimiento General', 'maintenance') ON CONFLICT DO NOTHING;
INSERT INTO public.boards (name, type) VALUES ('Proyectos Activos', 'projects') ON CONFLICT DO NOTHING;
