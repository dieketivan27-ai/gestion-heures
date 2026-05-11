-- Table de liaison entre enseignants et matières (Many-to-Many)
CREATE TABLE IF NOT EXISTS enseignants_matieres (
    enseignant_id INT NOT NULL,
    matiere_id INT NOT NULL,
    PRIMARY KEY (enseignant_id, matiere_id),
    FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
    FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
