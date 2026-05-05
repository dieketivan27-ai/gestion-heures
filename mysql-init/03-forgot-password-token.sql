-- ============================================================
-- Migration : Ajout des champs pour la réinitialisation du mot de passe
-- À exécuter sur les bases de données déjà créées
-- ============================================================
USE gestion_heures;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255),
  ADD COLUMN reset_token_expiry DATETIME;
