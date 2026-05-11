import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Enseignant, HeureEffectuee, Matiere, Departement, Filiere, AnneeAcademique, Parametre, DashboardData } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private buildFilters(filters: any): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '' && value !== 'ALL') {
        params = params.set(key, value);
      }
    });
    return params;
  }

  // ENSEIGNANTS
  getEnseignants(anneeId?: any): Observable<Enseignant[]> {
    const params = this.buildFilters({ annee_id: anneeId });
    return this.http.get<Enseignant[]>(`${this.base}/enseignants`, { params });
  }

  getEnseignant(id: number): Observable<Enseignant> { return this.http.get<Enseignant>(`${this.base}/enseignants/${id}`); }
  getEnseignantHeures(id: number, anneeId?: any): Observable<any> {
    const params = this.buildFilters({ annee_id: anneeId });
    return this.http.get<any>(`${this.base}/enseignants/${id}/heures`, { params });
  }
  createEnseignant(data: Partial<Enseignant>): Observable<any> { return this.http.post(`${this.base}/enseignants`, data); }
  updateEnseignant(id: number, data: Partial<Enseignant>): Observable<any> { return this.http.put(`${this.base}/enseignants/${id}`, data); }
  deleteEnseignant(id: number): Observable<any> { return this.http.delete(`${this.base}/enseignants/${id}`); }

  // HEURES
  getHeures(filters?: any): Observable<HeureEffectuee[]> {
    const params = this.buildFilters(filters);
    return this.http.get<HeureEffectuee[]>(`${this.base}/heures`, { params });
  }
  getPendingHeuresCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/heures/pending-count`);
  }
  createHeure(data: Partial<HeureEffectuee>): Observable<any> { return this.http.post(`${this.base}/heures`, data); }
  updateHeure(id: number, data: Partial<HeureEffectuee>): Observable<any> { return this.http.put(`${this.base}/heures/${id}`, data); }
  deleteHeure(id: number): Observable<any> { return this.http.delete(`${this.base}/heures/${id}`); }
  validerHeure(id: number): Observable<any> { return this.http.patch(`${this.base}/heures/${id}/valider`, {}); }

  // DASHBOARD
  getDashboard(anneeId?: any): Observable<DashboardData> {
    const params = this.buildFilters({ annee_id: anneeId });
    return this.http.get<DashboardData>(`${this.base}/dashboard`, { params });
  }
  getEtatPaiement(anneeId?: any): Observable<any[]> {
    const params = this.buildFilters({ annee_id: anneeId });
    return this.http.get<any[]>(`${this.base}/rapports/paiement`, { params });
  }

  importExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/rapports/import-excel`, formData);
  }
  importJson(data: any[]): Observable<any> {
    return this.http.post(`${this.base}/rapports/import-json`, { data });
  }

  // RÉFÉRENTIELS
  getDepartements(): Observable<Departement[]> { return this.http.get<Departement[]>(`${this.base}/departements`); }
  createDepartement(d: any): Observable<any> { return this.http.post(`${this.base}/departements`, d); }
  updateDepartement(id: number, d: any): Observable<any> { return this.http.put(`${this.base}/departements/${id}`, d); }
  deleteDepartement(id: number): Observable<any> { return this.http.delete(`${this.base}/departements/${id}`); }

  getFilieres(): Observable<Filiere[]> { return this.http.get<Filiere[]>(`${this.base}/filieres`); }
  createFiliere(d: any): Observable<any> { return this.http.post(`${this.base}/filieres`, d); }
  updateFiliere(id: number, d: any): Observable<any> { return this.http.put(`${this.base}/filieres/${id}`, d); }
  deleteFiliere(id: number): Observable<any> { return this.http.delete(`${this.base}/filieres/${id}`); }

  getMatieres(anneeId?: any): Observable<Matiere[]> {
    const params = this.buildFilters({ annee_id: anneeId });
    return this.http.get<Matiere[]>(`${this.base}/matieres`, { params });
  }
  createMatiere(d: any): Observable<any> { return this.http.post(`${this.base}/matieres`, d); }
  updateMatiere(id: number, d: any): Observable<any> { return this.http.put(`${this.base}/matieres/${id}`, d); }
  deleteMatiere(id: number): Observable<any> { return this.http.delete(`${this.base}/matieres/${id}`); }

  getAnnees(): Observable<AnneeAcademique[]> { return this.http.get<AnneeAcademique[]>(`${this.base}/annees`); }
  createAnnee(d: any): Observable<any> { return this.http.post(`${this.base}/annees`, d); }
  activerAnnee(id: number): Observable<any> { return this.http.patch(`${this.base}/annees/${id}/activer`, {}); }
  deleteAnnee(id: number): Observable<any> { return this.http.delete(`${this.base}/annees/${id}`); }

  getParametres(): Observable<Parametre[]> { return this.http.get<Parametre[]>(`${this.base}/parametres`); }
  updateParametre(cle: string, valeur: string): Observable<any> { return this.http.put(`${this.base}/parametres/${cle}`, { valeur }); }

  getUsers(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/users`); }
  createUser(data: any): Observable<any> { return this.http.post(`${this.base}/users`, data); }
  updateUser(id: number, data: any): Observable<any> { return this.http.put(`${this.base}/users/${id}`, data); }
  deleteUser(id: number): Observable<any> { return this.http.delete(`${this.base}/users/${id}`); }
  toggleUser(id: number): Observable<any> { return this.http.patch(`${this.base}/users/${id}/toggle`, {}); }
  getLogs(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/logs`); }

  // ATTRIBUTIONS
  getAttributions(filters?: any): Observable<any[]> {
    const params = this.buildFilters(filters);
    return this.http.get<any[]>(`${this.base}/attributions`, { params });
  }
  createAttribution(data: { enseignant_id: number; matiere_id: number; semestre: string; heures_total?: number }): Observable<any> {
    return this.http.post(`${this.base}/attributions`, data);
  }
}
