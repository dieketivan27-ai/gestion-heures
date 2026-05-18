-- Migration: Architecture Multi-Tenant (Multi-Universités)
-- Auteur: Antigravity

-- 1. Création de la table des universités
CREATE TABLE IF NOT EXISTS universities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL UNIQUE,
  sigle VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertion de l'université par défaut (Démonstration)
INSERT IGNORE INTO universities (id, nom, sigle) VALUES (1, 'Université de Démonstration', 'UDEMO');

-- 3. Mise à jour de la table users pour supporter le rôle 'super_admin' et l'associer à une université
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'rh', 'enseignant') NOT NULL DEFAULT 'enseignant';

-- Ajout de la clé étrangère university_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_id INT NULL;
-- Note: les clés étrangères seront ajoutées via Node.js pour éviter des erreurs de duplication de contraintes.

-- 4. Ajout de university_id aux autres tables si elles n'existent pas
-- Ces requêtes seront exécutées de manière sécurisée et idempotente dans le runner de migration Node.js.
