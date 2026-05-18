import { Router, Routes } from '@angular/router';
import { authGuard, adminGuard, adminOrRhGuard, superAdminGuard } from './core/guards/auth.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'change-password', 
    loadComponent: () => import('./features/auth/change-password.component').then(m => m.ChangePasswordComponent),
    canActivate: [passwordChangeGuard] 
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'enseignants', loadComponent: () => import('./features/enseignants/enseignants.component').then(m => m.EnseignantsComponent) },
      { path: 'enseignants/:id', loadComponent: () => import('./features/enseignants/enseignant-detail.component').then(m => m.EnseignantDetailComponent) },
      { path: 'heures', loadComponent: () => import('./features/heures/heures.component').then(m => m.HeuresComponent) },
      { path: 'matieres', loadComponent: () => import('./features/matieres/matieres.component').then(m => m.MatieresComponent) },
      { path: 'rapports', loadComponent: () => import('./features/rapports/rapports.component').then(m => m.RapportsComponent) },
      { path: 'parametres', loadComponent: () => import('./features/parametres/parametres.component').then(m => m.ParametresComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'utilisateurs', 
        loadComponent: () => import('./features/utilisateurs/utilisateurs.component').then(m => m.UtilisateursComponent),
        canActivate: [adminGuard]
      },
      { path: 'import', 
        loadComponent: () => import('./features/import/import.component').then(m => m.ImportComponent),
        canActivate: [adminOrRhGuard]
      },
      { path: 'logs',
        loadComponent: () => import('./features/logs/logs.component').then(m => m.LogsComponent),
        canActivate: [adminGuard]
      },
      { path: 'universities',
        loadComponent: () => import('./features/universities/universities.component').then(m => m.UniversitiesComponent),
        canActivate: [superAdminGuard]
      },
      { path: 'admin/matieres', loadComponent: () => import('./features/matieres/admin-matieres.component').then(m => m.AdminMatieresComponent) },
      { path: 'admin/attributions', loadComponent: () => import('./features/matieres/admin-attributions.component').then(m => m.AdminAttributionsComponent) },
      { path: 'enseignant/mes-matieres', loadComponent: () => import('./features/matieres/enseignant-attributions.component').then(m => m.EnseignantAttributionsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
