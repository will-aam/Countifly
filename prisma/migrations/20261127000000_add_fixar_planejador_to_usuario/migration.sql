-- AlterTable
ALTER TABLE "public"."usuarios" ADD COLUMN IF NOT EXISTS "fixar_planejador" BOOLEAN NOT NULL DEFAULT true;
