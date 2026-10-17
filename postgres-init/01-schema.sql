-- ============================================================
-- Gestion des Heures des Enseignants du Supérieur
-- Script d'initialisation PostgreSQL
-- ============================================================

-- Aucune instruction SET NAMES, CREATE DATABASE ou USE ici.
-- Le conteneur postgres:16 crée la base via POSTGRES_DB.

-- ============================================================
-- Table des universités (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS universities (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(150) NOT NULL UNIQUE,
  sigle       VARCHAR(20) UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table des utilisateurs (authentification)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password              VARCHAR(255) NOT NULL,
  role                  VARCHAR(20) NOT NULL DEFAULT 'enseignant'
                          CHECK (role IN ('super_admin', 'admin', 'rh', 'enseignant')),
  nom                   VARCHAR(100),
  prenom                VARCHAR(100),
  telephone             VARCHAR(20),
  avatar_url            VARCHAR(255),
  is_active             BOOLEAN DEFAULT TRUE,
  must_change_password  BOOLEAN DEFAULT FALSE,
  reset_token           VARCHAR(255),
  reset_token_expiry    TIMESTAMP,
  university_id         INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table des années académiques
-- ============================================================
CREATE TABLE IF NOT EXISTS annees_academiques (
  id            SERIAL PRIMARY KEY,
  libelle       VARCHAR(50) NOT NULL,
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  is_active     BOOLEAN DEFAULT FALSE,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table des départements
-- ============================================================
CREATE TABLE IF NOT EXISTS departements (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  code          VARCHAR(20) NOT NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (code, university_id)
);

-- ============================================================
-- Table des enseignants
-- ============================================================
CREATE TABLE IF NOT EXISTS enseignants (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  matricule             VARCHAR(50),
  nom                   VARCHAR(100) NOT NULL,
  prenom                VARCHAR(100) NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  telephone             VARCHAR(20),
  grade                 VARCHAR(30) NOT NULL
                          CHECK (grade IN ('Assistant', 'Maitre-Assistant', 'Professeur', 'Autres')),
  statut                VARCHAR(20) NOT NULL
                          CHECK (statut IN ('Permanent', 'Vacataire')),
  departement_id        INTEGER REFERENCES departements(id) ON DELETE SET NULL,
  taux_horaire_cm       DECIMAL(10,2) DEFAULT 0,
  taux_horaire_td       DECIMAL(10,2) DEFAULT 0,
  taux_horaire_tp       DECIMAL(10,2) DEFAULT 0,
  heures_contractuelles INTEGER DEFAULT 192,
  university_id         INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (matricule, university_id)
);

-- ============================================================
-- Table des filières
-- ============================================================
CREATE TABLE IF NOT EXISTS filieres (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  code          VARCHAR(20) NOT NULL,
  departement_id INTEGER REFERENCES departements(id) ON DELETE SET NULL,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (code, university_id)
);

-- ============================================================
-- Table des matières / cours
-- ============================================================
CREATE TABLE IF NOT EXISTS matieres (
  id                        SERIAL PRIMARY KEY,
  intitule                  VARCHAR(200) NOT NULL,
  code                      VARCHAR(50),
  filiere_id                INTEGER REFERENCES filieres(id) ON DELETE SET NULL,
  niveau                    VARCHAR(5) NOT NULL
                              CHECK (niveau IN ('L1','L2','L3','M1','M2')),
  semestre                  VARCHAR(3) DEFAULT 'S1'
                              CHECK (semestre IN ('S1','S2','S3','S4')),
  volume_horaire_prevu_cm   INTEGER DEFAULT 0,
  volume_horaire_prevu_td   INTEGER DEFAULT 0,
  volume_horaire_prevu_tp   INTEGER DEFAULT 0,
  annee_academique_id       INTEGER REFERENCES annees_academiques(id) ON DELETE SET NULL,
  university_id             INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table des paramètres (équivalences, taux...)
-- ============================================================
CREATE TABLE IF NOT EXISTS parametres (
  id            SERIAL PRIMARY KEY,
  cle           VARCHAR(100) NOT NULL,
  valeur        VARCHAR(255) NOT NULL,
  description   VARCHAR(255),
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cle, university_id)
);

-- ============================================================
-- Table des heures effectuées
-- ============================================================
CREATE TABLE IF NOT EXISTS heures_effectuees (
  id                    SERIAL PRIMARY KEY,
  enseignant_id         INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  matiere_id            INTEGER REFERENCES matieres(id) ON DELETE SET NULL,
  annee_academique_id   INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
  date_cours            DATE NOT NULL,
  type_heure            VARCHAR(3) NOT NULL CHECK (type_heure IN ('CM','TD','TP')),
  duree                 DECIMAL(10,2) NOT NULL,
  duree_equivalente     DECIMAL(10,2),
  salle                 VARCHAR(50),
  observations          TEXT,
  is_complementaire     BOOLEAN DEFAULT FALSE,
  valide                BOOLEAN DEFAULT FALSE,
  valide_par            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  valide_le             TIMESTAMP,
  university_id         INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table des attributions de matières
-- ============================================================
CREATE TABLE IF NOT EXISTS attributions_matieres (
  id                    SERIAL PRIMARY KEY,
  enseignant_id         INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  matiere_id            INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  annee_academique_id   INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
  semestre              VARCHAR(3) NOT NULL DEFAULT 'S1'
                          CHECK (semestre IN ('S1','S2','S3','S4')),
  heures_total          DECIMAL(10,2) DEFAULT 0,
  statut                VARCHAR(20) DEFAULT 'EN_ATTENTE'
                          CHECK (statut IN ('EN_ATTENTE','ACCEPTEE','REFUSEE')),
  observation           TEXT,
  university_id         INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  date_attribution      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_reponse          TIMESTAMP,
  UNIQUE (enseignant_id, matiere_id, annee_academique_id)
);

-- ============================================================
-- Table de liaison enseignants <-> matières (compatibilité)
-- ============================================================
CREATE TABLE IF NOT EXISTS enseignants_matieres (
  enseignant_id INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  matiere_id    INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  PRIMARY KEY (enseignant_id, matiere_id)
);

-- ============================================================
-- Journal des actions (audit logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action            VARCHAR(100) NOT NULL,
  table_concernee   VARCHAR(100),
  enregistrement_id INTEGER,
  details           TEXT,
  ip_address        VARCHAR(45),
  university_id     INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Trigger pour updated_at automatique (remplace ON UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER enseignants_updated_at
  BEFORE UPDATE ON enseignants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER heures_updated_at
  BEFORE UPDATE ON heures_effectuees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER parametres_updated_at
  BEFORE UPDATE ON parametres
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Données initiales
-- ============================================================

-- Université de démonstration par défaut (id=1)
INSERT INTO universities (id, nom, sigle) VALUES (1, 'Université de Démonstration', 'UDEMO')
  ON CONFLICT DO NOTHING;

-- Réinitialiser la séquence après l'insert avec id explicite
SELECT setval('universities_id_seq', GREATEST((SELECT MAX(id) FROM universities), 1));

-- Paramètres par défaut (pour l'université 1)
INSERT INTO parametres (cle, valeur, description, university_id) VALUES
('equivalence_cm_td', '1.5', '1h CM = X heures TD équivalent', 1),
('equivalence_cm_tp', '2', '1h CM = X heures TP équivalent', 1),
('seuil_heures_complementaires_permanent', '192', 'Seuil heures complémentaires pour permanents', 1),
('seuil_heures_complementaires_vacataire', '0', 'Seuil heures complémentaires pour vacataires', 1)
ON CONFLICT (cle, university_id) DO NOTHING;

-- Année académique courante (université 1)
INSERT INTO annees_academiques (id, libelle, date_debut, date_fin, is_active, university_id) VALUES
(1, '2024-2025', '2024-09-01', '2025-07-31', TRUE, 1),
(2, '2023-2024', '2023-09-01', '2024-07-31', FALSE, 1)
ON CONFLICT DO NOTHING;
SELECT setval('annees_academiques_id_seq', GREATEST((SELECT MAX(id) FROM annees_academiques), 1));

-- Départements
INSERT INTO departements (id, nom, code, university_id) VALUES
(1, 'Informatique', 'INFO', 1),
(2, 'Mathématiques', 'MATH', 1),
(3, 'Physique', 'PHYS', 1),
(4, 'Gestion', 'GEST', 1),
(5, 'Lettres et Sciences Humaines', 'LSH', 1)
ON CONFLICT DO NOTHING;
SELECT setval('departements_id_seq', GREATEST((SELECT MAX(id) FROM departements), 1));

-- Filières
INSERT INTO filieres (id, nom, code, departement_id, university_id) VALUES
(1, 'Licence Informatique', 'LIC-INFO', 1, 1),
(2, 'Master Informatique', 'MAS-INFO', 1, 1),
(3, 'Licence Mathématiques', 'LIC-MATH', 2, 1),
(4, 'Licence Gestion', 'LIC-GEST', 4, 1)
ON CONFLICT DO NOTHING;
SELECT setval('filieres_id_seq', GREATEST((SELECT MAX(id) FROM filieres), 1));

-- Utilisateurs par défaut (password: Admin@1234)
INSERT INTO users (email, password, role, nom, prenom, is_active, must_change_password, university_id) VALUES
('superadmin@gestion.univ', '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 'super_admin', 'SYSTEM', 'SuperAdmin', TRUE, FALSE, NULL),
('admin@univ.ci', '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 'admin', NULL, NULL, TRUE, FALSE, 1),
('rh@univ.ci', '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 'rh', NULL, NULL, TRUE, FALSE, 1)
ON CONFLICT (email) DO NOTHING;

-- Enseignants de démonstration
INSERT INTO enseignants (id, user_id, matricule, nom, prenom, email, grade, statut, departement_id, taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles, university_id) VALUES
(1, NULL, 'ENS001', 'KOUAME', 'Kofi', 'k.kouame@univ.ci', 'Professeur', 'Permanent', 1, 15000, 10000, 8000, 192, 1),
(2, NULL, 'ENS002', 'YAPI', 'Adjoua', 'a.yapi@univ.ci', 'Maitre-Assistant', 'Permanent', 1, 12000, 8000, 6000, 192, 1),
(3, NULL, 'ENS003', 'BAMBA', 'Seydou', 's.bamba@univ.ci', 'Assistant', 'Vacataire', 2, 10000, 7000, 5000, 0, 1),
(4, NULL, 'ENS004', 'TRAORE', 'Mariam', 'm.traore@univ.ci', 'Maitre-Assistant', 'Permanent', 4, 12000, 8000, 6000, 192, 1)
ON CONFLICT DO NOTHING;
SELECT setval('enseignants_id_seq', GREATEST((SELECT MAX(id) FROM enseignants), 1));

-- Matières de démonstration
INSERT INTO matieres (id, intitule, code, filiere_id, niveau, volume_horaire_prevu_cm, volume_horaire_prevu_td, volume_horaire_prevu_tp, annee_academique_id, university_id) VALUES
(1, 'Algorithmique et Structures de Données', 'ASD-L1', 1, 'L1', 30, 20, 15, 1, 1),
(2, 'Base de Données', 'BDD-L2', 1, 'L2', 25, 20, 20, 1, 1),
(3, 'Programmation Web', 'WEB-L3', 1, 'L3', 20, 15, 25, 1, 1),
(4, 'Analyse et Conception des SI', 'ACSI-M1', 2, 'M1', 30, 20, 10, 1, 1),
(5, 'Mathématiques Discrètes', 'MATD-L1', 3, 'L1', 40, 30, 0, 1, 1),
(6, 'Comptabilité Générale', 'CPT-L1', 4, 'L1', 35, 25, 0, 1, 1)
ON CONFLICT DO NOTHING;
SELECT setval('matieres_id_seq', GREATEST((SELECT MAX(id) FROM matieres), 1));

-- Heures effectuées de démonstration
INSERT INTO heures_effectuees (enseignant_id, matiere_id, annee_academique_id, date_cours, type_heure, duree, duree_equivalente, salle, valide, is_complementaire, university_id) VALUES
(1, 1, 1, '2024-10-05', 'CM', 2, 2, 'Amphi A', TRUE, FALSE, 1),
(1, 1, 1, '2024-10-12', 'CM', 2, 2, 'Amphi A', TRUE, FALSE, 1),
(1, 1, 1, '2024-10-19', 'TD', 2, 1.33, 'Salle 101', TRUE, FALSE, 1),
(1, 2, 1, '2024-11-02', 'CM', 3, 3, 'Amphi B', TRUE, FALSE, 1),
(2, 2, 1, '2024-10-08', 'TD', 2, 1.33, 'Salle 102', TRUE, FALSE, 1),
(2, 3, 1, '2024-10-15', 'TP', 3, 1.5, 'Labo Info', TRUE, FALSE, 1),
(3, 5, 1, '2024-10-10', 'CM', 2, 2, 'Amphi C', TRUE, FALSE, 1),
(3, 5, 1, '2024-10-17', 'TD', 2, 1.33, 'Salle 201', FALSE, FALSE, 1),
(4, 6, 1, '2024-10-09', 'CM', 2, 2, 'Amphi D', TRUE, FALSE, 1),
(4, 6, 1, '2024-11-06', 'CM', 3, 3, 'Amphi D', TRUE, FALSE, 1);
