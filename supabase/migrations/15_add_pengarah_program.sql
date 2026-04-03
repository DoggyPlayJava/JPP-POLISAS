-- Migrasi untuk menambah kolum pengarah_program pada jadual programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pengarah_program TEXT;
