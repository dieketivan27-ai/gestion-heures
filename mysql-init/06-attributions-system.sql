-- Migration: Système d'Attribution des Matières

-- 1. Ajout du semestre à la table matieres
ALTER TABLE matieres ADD COLUMN semestre ENUM('S1', 'S2', 'S3', 'S4') DEFAULT 'S1' AFTER niveau;

-- 2. Création de la table des attributions
CREATE TABLE IF NOT EXISTS attributions_matieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enseignant_id INT NOT NULL,
    matiere_id INT NOT NULL,
    annee_academique_id INT NOT NULL,
    semestre ENUM('S1', 'S2', 'S3', 'S4') NOT NULL,
    heures_total DECIMAL(10,2) DEFAULT 0,
    statut ENUM('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE') DEFAULT 'EN_ATTENTE',
    observation TEXT,
    date_attribution TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_reponse TIMESTAMP NULL,
    FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
    FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
    FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Migration des données existantes de enseignants_matieres vers attributions_matieres
-- On récupère le semestre et l'année académique de la matière rattachée
INSERT INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, statut, heures_total)
SELECT em.enseignant_id, em.matiere_id, m.annee_academique_id, 'S1', 'ACCEPTEE', (m.volume_horaire_prevu_cm + m.volume_horaire_prevu_td + m.volume_horaire_prevu_tp)
FROM enseignants_matieres em
JOIN matieres m ON em.matiere_id = m.id;

-- 4. On peut supprimer l'ancienne table de liaison simple
-- DROP TABLE enseignants_matieres; 
-- Note: Je la garde pour l'instant pour éviter de casser le code existant avant la mise à jour complète du backend.
