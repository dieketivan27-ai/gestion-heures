import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }
  if (auth.mustChangePassword) {
    router.navigate(['/change-password']);
    return false;
  }
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin) return true;
  router.navigate(['/dashboard']);
  return false;
};

export const adminOrRhGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin || auth.isRH) return true;
  router.navigate(['/dashboard']);
  return false;
};
