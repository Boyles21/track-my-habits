-- =====================================================
-- PHASE 3 PART 1: Add admin to enum
-- =====================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';