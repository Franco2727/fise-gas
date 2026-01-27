-- Enable UUID extension if needed (good practice)
create extension if not exists "uuid-ossp";

-- 1. Create Enums
-- 'estado_fise' variants based on context: Pendiente, Aprobado. 
-- Adding 'Rechazado' and 'Observado' as common variations for robustness.
create type estado_fise_enum as enum ('Pendiente', 'Aprobado', 'Rechazado', 'Observado');

-- 'estado_operativo' variants: Por instalar, Instalado, Habilitado.
-- Adding 'Inactivo' for initial state before approval? 
-- Context says: "Al aprobarlo... estado operativo a Por Instalar".
-- So initial state could be null or strictly these 3. Let's make it nullable or default to null until approved.
create type estado_operativo_enum as enum ('Por instalar', 'Instalado', 'Habilitado');

-- 2. Create Master Table
create table public.operaciones_maestra (
    id_dni text primary key, -- PK as requested
    
    -- Client Data (from context)
    cliente_nombre text,
    cliente_telefono text,
    cliente_direccion text,
    vendedor_nombre text,
    
    -- States
    estado_fise estado_fise_enum not null default 'Pendiente',
    estado_operativo estado_operativo_enum, -- Null until approved
    
    -- Dates (Timestamps)
    fecha_creacion timestamptz not null default now(),
    fecha_aprobacion timestamptz,
    fecha_instalacion timestamptz,
    fecha_habilitacion timestamptz,
    
    -- Financials & Evidence
    foto_fachada text, -- From context "Captacion... foto de fachada"
    foto_instalacion text,
    foto_acta_habilitacion text,
    
    costo_materiales decimal(10,2) default 0,
    ingreso_total decimal(10,2) default 0,
    
    -- Metadata
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Triggers & Functions

-- Function: Handle 'estado_fise' changes
create or replace function handle_estado_fise_change()
returns trigger as $$
begin
    -- When changing to 'Aprobado' (or variants if any, here just 'Aprobado')
    if new.estado_fise = 'Aprobado' and (old.estado_fise is distinct from 'Aprobado') then
        new.estado_operativo := 'Por instalar';
        new.fecha_aprobacion := now();
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_estado_fise_change
before update on public.operaciones_maestra
for each row
execute function handle_estado_fise_change();

-- Function: Handle 'estado_operativo' changes
create or replace function handle_estado_operativo_change()
returns trigger as $$
begin
    -- When changing to 'Instalado'
    if new.estado_operativo = 'Instalado' and (old.estado_operativo is distinct from 'Instalado') then
        new.fecha_instalacion := now();
    end if;

    -- When changing to 'Habilitado'
    if new.estado_operativo = 'Habilitado' and (old.estado_operativo is distinct from 'Habilitado') then
        new.fecha_habilitacion := now();
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_estado_operativo_change
before update on public.operaciones_maestra
for each row
execute function handle_estado_operativo_change();

-- 4. Storage & RLS

-- Note: Actual bucket creation is usually done via API or UI in Supabase, 
-- but we can verify RLS policies here under the assumption the bucket exists.
-- Requirement: "Bucket llamado evidencias-fise con políticas... que vinculen las rutas... al id_dni"

-- Enable RLS on the table (standard security practice)
alter table public.operaciones_maestra enable row level security;

-- Policies for 'operaciones_maestra'
-- (Implicitly needed for HITO 2 roles, defining placeholders for now)

-- Policy: Admin can do everything
-- Policy: Technician can read/update assigned rows (need a way to assign technician? 
-- The prompt doesn't specify a 'tecnico_id' column yet, but it's implied for "Vista Tecnico". 
-- I will add a 'tecnico_id' column to be safe, or just stick to the prompt's explicit list.)
-- Update: I will stick to the prompt's explicit list for now to avoid over-engineering, 
-- but will note that 'tecnico_id' might be needed later.

-- Storage Policies (SQL representation for storage.objects)
-- Assuming 'evidencias-fise' bucket exists.
-- Policy to allow uploads if file path contains the user's DNI (id_dni).
-- Note: 'storage.objects' policies are complex to write in raw SQL without knowing the exact Auth setup.
-- Below is a conceptual policy for the prompt requirement.

/*
create policy "Allow Upload based on DNI folder"
on storage.objects for insert
with check (
    bucket_id = 'evidencias-fise' 
    and (storage.foldername(name))[1] = (select id_dni from public.operaciones_maestra where id_dni = cast(auth.uid() as text)) 
    -- ^ This logic varies heavily on how users are authenticated vs the DNI column.
    -- If the DNI IS the auth user ID, then:
    -- and (storage.foldername(name))[1] = auth.uid()
);
*/

-- For Hito 1, the prompt asks to "Configura un Bucket... con políticas... que vinculen las rutas... al id_dni".
-- I will leave the strict RLS for storage commented out or generic, as we haven't set up Auth yet.
