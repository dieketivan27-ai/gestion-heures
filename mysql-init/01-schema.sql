-- ============================================================
-- Gestion des Heures des Enseignants du Supérieur
-- Script d'initialisation de la base de données
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection = utf8mb4;

CREATE DATABASE IF NOT EXISTS gestion_heures CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_heures;

-- Table des utilisateurs (authentification)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'rh', 'enseignant') NOT NULL DEFAULT 'enseignant',
  nom VARCHAR(100),
  prenom VARCHAR(100),
  telephone VARCHAR(20),
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT FALSE,
  reset_token VARCHAR(255),
  reset_token_expiry DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des années académiques
CREATE TABLE annees_academiques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(50) NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des départements
CREATE TABLE departements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des enseignants
CREATE TABLE enseignants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  matricule VARCHAR(50) UNIQUE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telephone VARCHAR(20),
  grade ENUM('Assistant', 'Maitre-Assistant', 'Professeur', 'Autres') NOT NULL,
  statut ENUM('Permanent', 'Vacataire') NOT NULL,
  departement_id INT,
  taux_horaire_cm DECIMAL(10,2) DEFAULT 0,
  taux_horaire_td DECIMAL(10,2) DEFAULT 0,
  taux_horaire_tp DECIMAL(10,2) DEFAULT 0,
  heures_contractuelles INT DEFAULT 192,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL
);

-- Table des filières
CREATE TABLE filieres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  departement_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL
);

-- Table des matières / cours
CREATE TABLE matieres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  intitule VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  filiere_id INT,
  niveau ENUM('L1','L2','L3','M1','M2') NOT NULL,
  volume_horaire_prevu_cm INT DEFAULT 0,
  volume_horaire_prevu_td INT DEFAULT 0,
  volume_horaire_prevu_tp INT DEFAULT 0,
  annee_academique_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE SET NULL,
  FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id) ON DELETE SET NULL
);

-- Table des paramètres (équivalences, taux...)
CREATE TABLE parametres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cle VARCHAR(100) NOT NULL UNIQUE,
  valeur VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des heures effectuées
CREATE TABLE heures_effectuees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enseignant_id INT NOT NULL,
  matiere_id INT,
  annee_academique_id INT NOT NULL,
  date_cours DATE NOT NULL,
  type_heure ENUM('CM','TD','TP') NOT NULL,
  duree DECIMAL(4,2) NOT NULL COMMENT 'En heures',
  duree_equivalente DECIMAL(4,2) COMMENT 'Après conversion selon paramètres',
  salle VARCHAR(50),
  observations TEXT,
  is_complementaire BOOLEAN DEFAULT FALSE,
  valide BOOLEAN DEFAULT FALSE,
  valide_par INT,
  valide_le TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
  FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE SET NULL,
  FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id) ON DELETE CASCADE,
  FOREIGN KEY (valide_par) REFERENCES users(id) ON DELETE SET NULL
);

-- Journal des actions (logs)
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_concernee VARCHAR(100),
  enregistrement_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- Données initiales
-- ============================================================

-- Paramètres par défaut
INSERT INTO parametres (cle, valeur, description) VALUES
('equivalence_cm_td', '1.5', '1h CM = X heures TD équivalent'),
('equivalence_cm_tp', '2', '1h CM = X heures TP équivalent'),
('seuil_heures_complementaires_permanent', '192', 'Seuil heures complémentaires pour permanents'),
('seuil_heures_complementaires_vacataire', '0', 'Seuil heures complémentaires pour vacataires');

-- Année académique courante
INSERT INTO annees_academiques (libelle, date_debut, date_fin, is_active) VALUES
('2024-2025', '2024-09-01', '2025-07-31', TRUE),
('2023-2024', '2023-09-01', '2024-07-31', FALSE);

-- Départements
INSERT INTO departements (nom, code) VALUES
('Informatique', 'INFO'),
('Mathématiques', 'MATH'),
('Physique', 'PHYS'),
('Gestion', 'GEST'),
('Lettres et Sciences Humaines', 'LSH');

-- Filières
INSERT INTO filieres (nom, code, departement_id) VALUES
('Licence Informatique', 'LIC-INFO', 1),
('Master Informatique', 'MAS-INFO', 1),
('Licence Mathématiques', 'LIC-MATH', 2),
('Licence Gestion', 'LIC-GEST', 4);

-- Utilisateur admin par défaut (password: Admin@1234)
INSERT INTO users (email, password, role) VALUES
('admin@univ.ci', '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 'admin'),
('rh@univ.ci', '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 'rh');

-- Enseignants de démonstration
INSERT INTO enseignants (user_id, matricule, nom, prenom, email, grade, statut, departement_id, taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles) VALUES
(NULL, 'ENS001', 'KOUAME', 'Kofi', 'k.kouame@univ.ci', 'Professeur', 'Permanent', 1, 15000, 10000, 8000, 192),
(NULL, 'ENS002', 'YAPI', 'Adjoua', 'a.yapi@univ.ci', 'Maitre-Assistant', 'Permanent', 1, 12000, 8000, 6000, 192),
(NULL, 'ENS003', 'BAMBA', 'Seydou', 's.bamba@univ.ci', 'Assistant', 'Vacataire', 2, 10000, 7000, 5000, 0),
(NULL, 'ENS004', 'TRAORE', 'Mariam', 'm.traore@univ.ci', 'Maitre-Assistant', 'Permanent', 4, 12000, 8000, 6000, 192);

-- Matières de démonstration
INSERT INTO matieres (intitule, code, filiere_id, niveau, volume_horaire_prevu_cm, volume_horaire_prevu_td, volume_horaire_prevu_tp, annee_academique_id) VALUES
('Algorithmique et Structures de Données', 'ASD-L1', 1, 'L1', 30, 20, 15, 1),
('Base de Données', 'BDD-L2', 1, 'L2', 25, 20, 20, 1),
('Programmation Web', 'WEB-L3', 1, 'L3', 20, 15, 25, 1),
('Analyse et Conception des SI', 'ACSI-M1', 2, 'M1', 30, 20, 10, 1),
('Mathématiques Discrètes', 'MATD-L1', 3, 'L1', 40, 30, 0, 1),
('Comptabilité Générale', 'CPT-L1', 4, 'L1', 35, 25, 0, 1);

-- Heures effectuées de démonstration
INSERT INTO heures_effectuees (enseignant_id, matiere_id, annee_academique_id, date_cours, type_heure, duree, duree_equivalente, salle, valide, is_complementaire) VALUES
(1, 1, 1, '2024-10-05', 'CM', 2, 2, 'Amphi A', TRUE, FALSE),
(1, 1, 1, '2024-10-12', 'CM', 2, 2, 'Amphi A', TRUE, FALSE),
(1, 1, 1, '2024-10-19', 'TD', 2, 1.33, 'Salle 101', TRUE, FALSE),
(1, 2, 1, '2024-11-02', 'CM', 3, 3, 'Amphi B', TRUE, FALSE),
(2, 2, 1, '2024-10-08', 'TD', 2, 1.33, 'Salle 102', TRUE, FALSE),
(2, 3, 1, '2024-10-15', 'TP', 3, 1.5, 'Labo Info', TRUE, FALSE),
(3, 5, 1, '2024-10-10', 'CM', 2, 2, 'Amphi C', TRUE, FALSE),
(3, 5, 1, '2024-10-17', 'TD', 2, 1.33, 'Salle 201', FALSE, FALSE),
(4, 6, 1, '2024-10-09', 'CM', 2, 2, 'Amphi D', TRUE, FALSE),
(4, 6, 1, '2024-11-06', 'CM', 3, 3, 'Amphi D', TRUE, FALSE);
