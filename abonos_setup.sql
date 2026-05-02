-- ============================================================
-- KIDOPOLIS — Agregar sistema de Abonos a Gastos
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================

-- Agregar columna "pagado" a gastos (para rastrear abonos)
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS pagado numeric(12,2) NOT NULL DEFAULT 0;

-- Asegurar que el valor pagado nunca sea negativo
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_pagado_check;
ALTER TABLE public.gastos ADD CONSTRAINT gastos_pagado_check CHECK (pagado >= 0);
