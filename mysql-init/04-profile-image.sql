-- Migration: Add avatar_url to users table
USE gestion_heures;

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL;
