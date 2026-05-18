import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  let headers: { [key: string]: string } = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (auth.isSuperAdmin && auth.selectedUniversityId !== null) {
    headers['X-University-Id'] = auth.selectedUniversityId.toString();
  }

  const authReq = Object.keys(headers).length > 0
    ? req.clone({ setHeaders: headers })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) { auth.logout(); }
      return throwError(() => err);
    })
  );
};
