import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Matiere, Enseignant, Attribution } from '../models/matiere.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GestionMatiereService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // MATIERES
  getMatieres(): Observable<Matiere[]> {
    return this.http.get<Matiere[]>(`${this.apiUrl}/matieres`);
  }

  addMatiere(matiere: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/matieres`, matiere);
  }

  updateMatiere(id: number, matiere: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/matieres/${id}`, matiere);
  }

  deleteMatiere(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/matieres/${id}`);
  }

  // ENSEIGNANTS
  getEnseignants(): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(`${this.apiUrl}/enseignants`);
  }

  // ATTRIBUTIONS
  getAttributions(): Observable<Attribution[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attributions`).pipe(
      map(atts => atts.map(a => this.mapAttribution(a)))
    );
  }

  getAttributionsByEnseignant(id: number): Observable<Attribution[]> {
    // Note: 'me' route is preferred for the logged-in teacher
    return this.http.get<any[]>(`${this.apiUrl}/attributions/me`).pipe(
      map(atts => atts.map(a => this.mapAttribution(a)))
    );
  }

  accepterAttribution(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/attributions/${id}/respond`, { statut: 'ACCEPTEE' });
  }

  refuserAttribution(id: number, observation: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/attributions/${id}/respond`, { statut: 'REFUSEE', observation });
  }

  attribuerMatiere(attribution: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/attributions`, attribution);
  }

  private mapAttribution(a: any): Attribution {
    return {
      id: a.id,
      enseignantId: a.enseignant_id,
      matiereId: a.matiere_id,
      semestre: a.semestre,
      anneeAcademique: a.annee_libelle || a.annee_academique_id.toString(),
      heuresTotal: a.heures_total,
      statut: a.statut,
      observation: a.observation,
      dateAttribution: new Date(a.date_attribution),
      dateReponse: a.date_reponse ? new Date(a.date_reponse) : undefined,
      matiere_nom: a.matiere_nom,
      matiere_code: a.matiere_code
    };
  }
}
