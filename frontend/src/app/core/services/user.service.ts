import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(this.base, data);
  }

  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.patch(`${this.base}/${id}/toggle`, {});
  }
}
