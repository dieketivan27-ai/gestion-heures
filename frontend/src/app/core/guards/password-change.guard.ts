import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const passwordChangeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }
  
  if (!auth.mustChangePassword) {
    router.navigate(['/dashboard']);
    return false;
  }
  
  return true;
};
