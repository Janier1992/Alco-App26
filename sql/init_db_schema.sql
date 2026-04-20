-- =====================================================================================
-- SCRIPT DE CREACIÓN DE ESQUEMA LIMPIO PARA INSFORGE (SUPABASE)
-- Este script crea todas las tablas del esquema 'public', sus relaciones (Foreign Keys)
-- y políticas de seguridad, omitiendo esquemas internos de InsForge (auth, storage, etc.)
-- para no causar conflictos en el nuevo proyecto.
-- =====================================================================================

-- 1. EXTENSIONES BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- 2. FUNCIONES
CREATE OR REPLACE FUNCTION public.get_unread_count(p_conversation_id text, p_user_id text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_last_read TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    SELECT last_read_at INTO v_last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    IF v_last_read IS NULL THEN v_last_read := '1970-01-01'::TIMESTAMP WITH TIME ZONE; END IF;
    
    SELECT COUNT(*) INTO v_count FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND created_at > v_last_read
      AND deleted_at IS NULL;
    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.profile->>'name', new.email), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

-- 3. CREACIÓN DE TABLAS (ESQUEMA PUBLIC)

CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role text DEFAULT 'user'::text,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Auditorías
CREATE TABLE public.audits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    report_number text NOT NULL UNIQUE,
    version text DEFAULT '1'::text,
    audit_date date NOT NULL,
    process text NOT NULL,
    auditor text NOT NULL,
    objective text,
    scope text,
    status text DEFAULT 'Planificada'::text,
    executive_summary text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.audit_findings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    audit_id uuid REFERENCES public.audits(id) ON DELETE CASCADE,
    clause text NOT NULL,
    description text NOT NULL,
    evidence text,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Tableros y Proyectos (Boards)
CREATE TABLE public.boards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.board_columns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE,
    title text NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.board_projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone
);

CREATE TABLE public.board_tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    column_id uuid REFERENCES public.board_columns(id) ON DELETE SET NULL,
    board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'Media'::text,
    due_date timestamp with time zone,
    asset_id text,
    maintenance_type text,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_archived boolean DEFAULT false,
    is_template boolean DEFAULT false,
    cover_color text
);

-- Tareas: Detalles y Relaciones
CREATE TABLE public.task_assignees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    task_id uuid REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    user_initials text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.task_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    task_id uuid REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    type text,
    created_at timestamp with time zone DEFAULT now(),
    size bigint
);

CREATE TABLE public.task_checklists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    task_id uuid REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    text text NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    "position" integer DEFAULT 0
);

CREATE TABLE public.task_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    task_id uuid REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    author_id uuid,
    author_name text
);

CREATE TABLE public.task_labels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    task_id uuid REFERENCES public.board_tasks(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Chat y Mensajería
CREATE TABLE public.conversations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL PRIMARY KEY,
    type text NOT NULL CHECK (type = ANY (ARRAY['direct'::text, 'group'::text])),
    organization_id text DEFAULT 'default_org'::text NOT NULL,
    created_by text NOT NULL,
    title text,
    avatar text,
    linked_module text CHECK (linked_module = ANY (ARRAY['nc'::text, 'audit'::text, 'document'::text, 'project'::text, NULL::text])),
    linked_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.conversation_participants (
    id text DEFAULT (gen_random_uuid())::text NOT NULL PRIMARY KEY,
    conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    last_read_at timestamp with time zone DEFAULT now(),
    role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.messages (
    id text DEFAULT (gen_random_uuid())::text NOT NULL PRIMARY KEY,
    conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL CHECK (message_type = ANY (ARRAY['text'::text, 'file'::text, 'image'::text, 'system'::text])),
    read_status text DEFAULT 'sent'::text NOT NULL CHECK (read_status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])),
    reply_to_id text REFERENCES public.messages(id),
    file_url text,
    file_name text,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now(),
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE public.user_sessions (
    user_id text NOT NULL PRIMARY KEY,
    socket_id text,
    is_online boolean DEFAULT false,
    last_activity timestamp with time zone DEFAULT now(),
    device_info text
);

-- Quality y Operaciones
CREATE TABLE public.quality_claims (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    claim_number text UNIQUE,
    customer text,
    date date,
    description text,
    status text DEFAULT 'Abierta'::text,
    ai_analysis text,
    created_at timestamp with time zone DEFAULT now(),
    claim_type text DEFAULT 'Informe Técnico'::text,
    client_name text,
    project_name text,
    subject text,
    priority text DEFAULT 'Media'::text,
    assigned_to text
);

CREATE TABLE public.non_conformities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    serial_id text NOT NULL UNIQUE,
    title text NOT NULL,
    process text NOT NULL,
    project text,
    severity text DEFAULT 'Mayor'::text,
    description text,
    status text DEFAULT 'Abierta'::text,
    rca jsonb DEFAULT '{"why1": "", "why2": "", "why3": "", "why4": "", "why5": "", "rootCause": ""}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone
);

CREATE TABLE public.nc_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    nc_id uuid REFERENCES public.non_conformities(id) ON DELETE CASCADE,
    action text NOT NULL,
    details text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.nc_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    nc_id uuid REFERENCES public.non_conformities(id) ON DELETE CASCADE,
    type text NOT NULL,
    description text NOT NULL,
    responsible text,
    due_date date,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.field_inspections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    fecha date DEFAULT CURRENT_DATE,
    area_proceso text NOT NULL,
    op text NOT NULL,
    plano_opc text,
    diseno_referencia text,
    cant_total integer DEFAULT 0,
    cant_retenida integer DEFAULT 0,
    estado text DEFAULT 'Aprobado'::text,
    defecto text DEFAULT 'NINGUNO'::text,
    reviso text,
    responsable text,
    accion_correctiva text,
    observacion_sugerida text,
    observacion text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Master Data y Documentos
CREATE TABLE public.master_data (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    category text NOT NULL,
    label text NOT NULL,
    value text NOT NULL UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sgc_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    category text NOT NULL,
    date date DEFAULT CURRENT_DATE,
    valid_until date,
    size text,
    version text DEFAULT 'V1.0'::text,
    status text DEFAULT 'Aprobado'::text,
    author text,
    file_url text,
    mime_type text DEFAULT 'application/pdf'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.external_links (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    url text NOT NULL,
    description text,
    color text,
    created_at timestamp with time zone DEFAULT now()
);

-- Metrología
CREATE TABLE public.metrology_calibration (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    tool text NOT NULL,
    code text NOT NULL UNIQUE,
    last_date date,
    due_date date,
    status text DEFAULT 'Vigente'::text,
    certificate_number text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.metrology_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    folio text UNIQUE,
    date date NOT NULL,
    operator text NOT NULL,
    area text,
    signature_url text,
    created_at timestamp with time zone DEFAULT now(),
    sede text,
    receptor_nombre text,
    receptor_cedula text,
    receptor_cargo text,
    firma_entrega_url text,
    firma_recibe_url text,
    items jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE public.metrology_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    record_id uuid REFERENCES public.metrology_records(id) ON DELETE CASCADE,
    instrument text NOT NULL,
    brand text,
    measurement text,
    nominal_value text,
    actual_value text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.metrology_replacements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    fecha_registro date NOT NULL,
    nombre_equipo text NOT NULL,
    marca text,
    codigo text NOT NULL,
    area_uso text,
    nombre_responsable text,
    motivo_reposicion text,
    devuelve_equipo_anterior text,
    descripcion_baja text,
    se_cobra_equipo text,
    nombre_responsable_calidad text,
    firma_responsable_area_url text,
    firma_responsable_calidad_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Stetic y Módulo Comercial
CREATE TABLE public.stetic_businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    owner_id text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    image text,
    location text,
    created_at timestamp with time zone DEFAULT now(),
    phone text,
    logo_url text,
    schedule jsonb DEFAULT '{"days": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"], "open": "09:00", "close": "18:00"}'::jsonb
);

CREATE TABLE public.stetic_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id text NOT NULL UNIQUE,
    business_id uuid REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    full_name text,
    email text,
    avatar text,
    role text DEFAULT 'CLIENT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stetic_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    user_id text,
    name text NOT NULL,
    email text,
    phone text,
    avatar text,
    skin_type text,
    hair_type text,
    allergies text[],
    loyalty_points integer DEFAULT 0,
    additional_notes text,
    is_vip boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stetic_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    duration integer NOT NULL,
    category text,
    image text,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    image_url text
);

CREATE TABLE public.stetic_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    client_id text NOT NULL,
    client_name text NOT NULL,
    client_email text,
    service_id uuid REFERENCES public.stetic_services(id) ON DELETE SET NULL,
    service_name text,
    staff_id text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status text DEFAULT 'PENDIENTE'::text,
    notes text,
    technical_notes text,
    risk_of_no_show numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    deposit_amount numeric DEFAULT 0
);

CREATE TABLE public.stetic_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    label text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    category text DEFAULT 'Otros'::text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stetic_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0,
    category text,
    image text,
    is_for_internal_use boolean DEFAULT false,
    usage_per_service numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    is_internal boolean DEFAULT false,
    is_active boolean DEFAULT true
);

CREATE TABLE public.stetic_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    service_id uuid REFERENCES public.stetic_services(id) ON DELETE CASCADE,
    name text NOT NULL,
    discount_pct numeric DEFAULT 10 NOT NULL,
    active boolean DEFAULT true,
    expiry_date date,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stetic_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.stetic_businesses(id) ON DELETE CASCADE,
    user_id text,
    name text NOT NULL,
    role text DEFAULT 'Estilista'::text NOT NULL,
    specialty text,
    avatar text,
    phone text,
    email text,
    commission_pct numeric DEFAULT 30,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================================================
-- 4. TRIGGERS ADICIONALES Y LOGICA RELACIONADA A LA DATA DE USUARIOS
-- =====================================================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_update_conv_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- =====================================================================================
-- SCRIPT FINALIZADO
-- Nota: Puedes crear tus políticas RLS usando el editor visual en InsForge.
-- Si necesitas las políticas RLS vía SQL, se pueden añadir también bajo este bloque.
-- =====================================================================================
