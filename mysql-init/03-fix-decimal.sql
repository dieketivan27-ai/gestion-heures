USE gestion_heures;
ALTER TABLE heures_effectuees 
  MODIFY COLUMN duree DECIMAL(10,2) NOT NULL,
  MODIFY COLUMN duree_equivalente DECIMAL(10,2);
