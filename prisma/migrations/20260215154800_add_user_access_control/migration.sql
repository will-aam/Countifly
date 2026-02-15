-- Migration: Add User Access Control System
-- Description: Adds user type (ADMIN/USUARIO) and module permissions to Usuario table
-- Date: 2026-02-15

-- Create enum type for UsuarioTipo
CREATE TYPE "UsuarioTipo" AS ENUM ('ADMIN', 'USUARIO');

-- Add new columns to usuarios table
ALTER TABLE usuarios 
ADD COLUMN tipo "UsuarioTipo" DEFAULT 'USUARIO',
ADD COLUMN modulo_importacao BOOLEAN DEFAULT true,
ADD COLUMN modulo_livre BOOLEAN DEFAULT false,
ADD COLUMN modulo_sala BOOLEAN DEFAULT false,
ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Transform first user (ID 1) to ADMIN with all modules enabled
UPDATE usuarios 
SET tipo = 'ADMIN',
    modulo_importacao = true,
    modulo_livre = true,
    modulo_sala = true
WHERE id = 1;

-- Note: If ID 1 doesn't exist, the admin user can be set manually later
-- using: UPDATE usuarios SET tipo = 'ADMIN', modulo_importacao = true, 
--        modulo_livre = true, modulo_sala = true WHERE email = 'admin@example.com';
