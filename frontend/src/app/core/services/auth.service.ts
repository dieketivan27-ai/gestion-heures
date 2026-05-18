import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private selectedUniversityIdSubject = new BehaviorSubject<number | null>(this.loadSelectedUniversityId());
  selectedUniversityId$ = this.selectedUniversityIdSubject.asObservable();

  private selectedUniversityNameSubject = new BehaviorSubject<string | null>(this.loadSelectedUniversityName());
  selectedUniversityName$ = this.selectedUniversityNameSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): User | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  private loadSelectedUniversityId(): number | null {
    const id = localStorage.getItem('selected_university_id');
    return id ? parseInt(id, 10) : null;
  }

  private loadSelectedUniversityName(): string | null {
    return localStorage.getItem('selected_university_nom');
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get token(): string | null { return localStorage.getItem('token'); }
  get isLoggedIn(): boolean { return !!this.token; }
  get isSuperAdmin(): boolean { return this.currentUser?.role === 'super_admin'; }
  get isAdmin(): boolean { return ['admin', 'super_admin'].includes(this.currentUser?.role || ''); }
  get isRH(): boolean { return ['admin','rh', 'super_admin'].includes(this.currentUser?.role || ''); }
  get mustChangePassword(): boolean { return !!this.currentUser?.must_change_password; }

  get selectedUniversityId(): number | null {
    return this.selectedUniversityIdSubject.value;
  }

  get selectedUniversityName(): string | null {
    return this.selectedUniversityNameSubject.value;
  }

  setSelectedUniversity(id: number | null, nom: string | null): void {
    if (id === null) {
      localStorage.removeItem('selected_university_id');
      localStorage.removeItem('selected_university_nom');
    } else {
      localStorage.setItem('selected_university_id', id.toString());
      localStorage.setItem('selected_university_nom', nom || '');
    }
    this.selectedUniversityIdSubject.next(id);
    this.selectedUniversityNameSubject.next(nom);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => {
        const user = { ...res.user, must_change_password: !!res.user.must_change_password };
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        // Clear any leftover selected university on new login
        this.setSelectedUniversity(null, null);
      }));
  }

  firstLogin(newPassword: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/first-password`, { newPassword })
      .pipe(tap(() => {
        if (this.currentUser) {
          const updatedUser = { ...this.currentUser, must_change_password: false };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      }));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.setSelectedUniversity(null, null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  updateProfile(data: { nom: string; prenom: string; email: string; telephone: string }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/profile`, data).pipe(
      tap(() => {
        if (this.currentUser) {
          const updatedUser = { ...this.currentUser, ...data };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }

  updateAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<any>(`${environment.apiUrl}/auth/avatar`, formData).pipe(
      tap(res => {
        if (this.currentUser) {
          const updatedUser = { ...this.currentUser, avatar_url: res.avatarUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }
  
  deleteAvatar(): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/auth/avatar`).pipe(
      tap(() => {
        if (this.currentUser) {
          const updatedUser = { ...this.currentUser, avatar_url: null };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/password`, { oldPassword, newPassword });
  }

  getAvatarUrl(path: string | null | undefined): string {
    if (!path) return '';

    // If it's already a root-relative path like /uploads/..., use as-is
    if (path.startsWith('/uploads/')) return path;

    // If it's an absolute URL (from old localStorage), extract just the path
    try {
      const url = new URL(path);
      return url.pathname;
    } catch {
      // Not a valid URL, return as-is
      return path;
    }
  }
}
