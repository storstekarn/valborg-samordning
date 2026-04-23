-- Migration 002: lägg till anteckningsfält på uppgifter
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text;
