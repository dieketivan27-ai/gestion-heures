export interface Matiere {
  id: number;
  nom: string;
  code: string;
  heuresParSemaine: number;
  semestre: 'S1' | 'S2' | 'S3' | 'S4';
  niveau: string;
  description?: string;
}

export interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  grade: string;
  specialite: string;
}

export interface Attribution {
  id: number;
  enseignantId: number;
  matiereId: number;
  semestre: 'S1' | 'S2' | 'S3' | 'S4';
  anneeAcademique: string;
  heuresTotal: number;
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';
  observation?: string;
  dateAttribution: Date;
  dateReponse?: Date;
  matiere_nom?: string;
  matiere_code?: string;
}
