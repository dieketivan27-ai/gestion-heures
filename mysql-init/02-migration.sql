-- ============================================================
-- Migration : Ajout du champ must_change_password
-- À exécuter sur les bases de données déjà créées
-- ============================================================
USE gestion_heures;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Les comptes existants n'ont pas besoin de changer leur mot de passe
UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL;
