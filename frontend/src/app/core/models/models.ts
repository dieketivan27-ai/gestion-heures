export interface User {
  id: number;
  email: string;
  role: 'admin' | 'rh' | 'enseignant';
  nom?: string;
  prenom?: string;
  telephone?: string;
  avatar_url?: string | null;
  enseignant_id?: number;
  is_active: boolean;
  created_at?: string;
  must_change_password?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Enseignant {
  id: number;
  matricule?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  grade: 'Assistant' | 'Maitre-Assistant' | 'Professeur' | 'Autres';
  statut: 'Permanent' | 'Vacataire';
  departement_id?: number;
  departement_nom?: string;
  taux_horaire_cm: number;
  taux_horaire_td: number;
  taux_horaire_tp: number;
  heures_contractuelles: number;
  avatar_url?: string;
  total_cm?: number;
  total_td?: number;
  total_tp?: number;
  total_heures?: number;
  matieres?: Matiere[];
}

export interface HeureEffectuee {
  id: number;
  enseignant_id: number;
  nom?: string;
  prenom?: string;
  matiere_id?: number;
  matiere_nom?: string;
  annee_academique_id: number;
  annee_libelle?: string;
  date_cours: string;
  type_heure: 'CM' | 'TD' | 'TP';
  duree: number;
  duree_equivalente?: number;
  salle?: string;
  observations?: string;
  is_complementaire: boolean;
  valide: boolean;
  valide_par?: number;
  valide_le?: string;
}

export interface Matiere {
  id: number;
  intitule: string;
  code?: string;
  filiere_id?: number;
  filiere_nom?: string;
  departement_nom?: string;
  niveau: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  volume_horaire_prevu_cm: number;
  volume_horaire_prevu_td: number;
  volume_horaire_prevu_tp: number;
  annee_academique_id?: number;
  annee_libelle?: string;
  volume_total?: number;
}

export interface Departement {
  id: number;
  nom: string;
  code: string;
}

export interface Filiere {
  id: number;
  nom: string;
  code: string;
  departement_id?: number;
  departement_nom?: string;
}

export interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
}

export interface Parametre {
  id: number;
  cle: string;
  valeur: string;
  description?: string;
}

export interface DashboardData {
  totalEnseignants: number;
  totalHeures: { total: number; complementaires: number };
  parType: Array<{ type_heure: string; total: number }>;
  parDepartement: Array<{ departement: string; departement_nom: string; total_heures: number; nb_enseignants: number }>;
  enDepassement: Array<{ nom: string; prenom: string; grade: string; avatar_url?: string; total_effectuees: number; heures_contractuelles: number; depassement: number }>;
  mensuel: Array<{ mois: string; total_heures: number; nb_seances: number }>;
  topEnseignants: Array<{ nom: string; prenom: string; grade: string; avatar_url?: string; total: number }>;
  teacherAvatars?: Array<{ avatar_url?: string; name: string }>;
}
