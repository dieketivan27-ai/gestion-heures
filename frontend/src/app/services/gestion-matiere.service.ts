import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Matiere, Enseignant, Attribution } from '../models/matiere.model';

@Injectable({
  providedIn: 'root'
})
export class GestionMatiereService {
  private matieres = new BehaviorSubject<Matiere[]>([
    { id: 1, nom: 'Algorithmique', code: 'ALGO1', heuresParSemaine: 4, semestre: 'S1', niveau: 'Licence 1' },
    { id: 2, nom: 'Bases de données', code: 'BDD1', heuresParSemaine: 3, semestre: 'S2', niveau: 'Licence 2' },
    { id: 3, nom: 'Dev Web', code: 'WEB1', heuresParSemaine: 4, semestre: 'S1', niveau: 'Licence 3' },
    { id: 4, nom: 'Maths Discrètes', code: 'MATHD', heuresParSemaine: 2, semestre: 'S2', niveau: 'Licence 1' },
    { id: 5, nom: 'Réseaux', code: 'RES1', heuresParSemaine: 3, semestre: 'S3', niveau: 'Licence 2' }
  ]);

  private enseignants = new BehaviorSubject<Enseignant[]>([
    { id: 1, nom: 'Kouassi', prenom: 'Jean', email: 'jean.kouassi@univ.ci', grade: 'Maître-Assistant', specialite: 'Développement' },
    { id: 2, nom: 'Bamba', prenom: 'Fatoumata', email: 'f.bamba@univ.ci', grade: 'Professeur', specialite: 'Mathématiques' },
    { id: 3, nom: 'Traoré', prenom: 'Moussa', email: 'm.traore@univ.ci', grade: 'Assistant', specialite: 'Réseaux' }
  ]);

  private attributions = new BehaviorSubject<Attribution[]>([
    { 
      id: 1, enseignantId: 1, matiereId: 1, semestre: 'S1', anneeAcademique: '2023-2024', 
      heuresTotal: 64, statut: 'ACCEPTEE', dateAttribution: new Date('2023-09-01') 
    },
    { 
      id: 2, enseignantId: 2, matiereId: 2, semestre: 'S2', anneeAcademique: '2023-2024', 
      heuresTotal: 48, statut: 'EN_ATTENTE', dateAttribution: new Date('2024-01-15') 
    },
    { 
      id: 3, enseignantId: 3, matiereId: 5, semestre: 'S3', anneeAcademique: '2023-2024', 
      heuresTotal: 48, statut: 'EN_ATTENTE', dateAttribution: new Date('2024-01-20') 
    }
  ]);

  constructor() {}

  // MATIERES
  getMatieres(): Observable<Matiere[]> {
    return this.matieres.asObservable();
  }

  addMatiere(matiere: Omit<Matiere, 'id'>): void {
    const current = this.matieres.value;
    const newId = current.length > 0 ? Math.max(...current.map(m => m.id)) + 1 : 1;
    this.matieres.next([...current, { ...matiere, id: newId }]);
  }

  updateMatiere(id: number, updatedMatiere: Partial<Matiere>): void {
    const current = this.matieres.value;
    this.matieres.next(current.map(m => m.id === id ? { ...m, ...updatedMatiere } : m));
  }

  deleteMatiere(id: number): void {
    const current = this.matieres.value;
    this.matieres.next(current.filter(m => m.id !== id));
  }

  // ENSEIGNANTS
  getEnseignants(): Observable<Enseignant[]> {
    return this.enseignants.asObservable();
  }

  // ATTRIBUTIONS
  getAttributions(): Observable<Attribution[]> {
    return this.attributions.asObservable();
  }

  getAttributionsByEnseignant(id: number): Observable<Attribution[]> {
    return this.attributions.pipe(
      map(atts => atts.filter(a => a.enseignantId === id))
    );
  }

  getAttributionsBySemestre(s: 'S1' | 'S2' | 'S3' | 'S4'): Observable<Attribution[]> {
    return this.attributions.pipe(
      map(atts => atts.filter(a => a.semestre === s))
    );
  }

  attribuerMatiere(attribution: Omit<Attribution, 'id' | 'statut' | 'dateAttribution'>): void {
    const current = this.attributions.value;
    const newId = current.length > 0 ? Math.max(...current.map(a => a.id)) + 1 : 1;
    this.attributions.next([...current, { 
      ...attribution, 
      id: newId, 
      statut: 'EN_ATTENTE', 
      dateAttribution: new Date() 
    }]);
  }

  accepterAttribution(id: number): void {
    const current = this.attributions.value;
    this.attributions.next(current.map(a => a.id === id ? { 
      ...a, 
      statut: 'ACCEPTEE', 
      dateReponse: new Date() 
    } : a));
  }

  refuserAttribution(id: number, observation: string): void {
    const current = this.attributions.value;
    this.attributions.next(current.map(a => a.id === id ? { 
      ...a, 
      statut: 'REFUSEE', 
      observation, 
      dateReponse: new Date() 
    } : a));
  }
}
