import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { University } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UniversityService {
  private base = `${environment.apiUrl}/universities`;

  constructor(private http: HttpClient) {}

  getUniversities(): Observable<University[]> {
    return this.http.get<University[]>(this.base);
  }

  createUniversity(data: Partial<University>): Observable<any> {
    return this.http.post(this.base, data);
  }

  updateUniversity(id: number, data: Partial<University>): Observable<any> {
    return this.http.put(`${this.base}/${id}`, data);
  }

  deleteUniversity(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
