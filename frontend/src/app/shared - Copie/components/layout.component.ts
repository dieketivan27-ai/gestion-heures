import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/models';
import { AvatarComponent } from './avatar.component';
import { filter } from 'rxjs/operators';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AvatarComponent],
  template: `
    <div class="layout">
      <!-- Mobile overlay -->
      <div class="sidebar-overlay" [class.show]="showMobileMenu" (click)="showMobileMenu = false"></div>

      <!-- SIDEBAR -->
      <aside class="sidebar bg-slate-900 flex flex-col text-slate-300">

        <!-- Logo / Brand -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-graduation-cap text-white text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-white leading-tight">GestionHeures</h1>
            <p class="text-xs text-slate-500 truncate">Enseignement Supérieur</p>
          </div>
          <button class="mobile-only text-slate-400 hover:text-white p-1" (click)="showMobileMenu = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 py-3 overflow-y-auto">

          <!-- Principal -->
          <div class="px-4 pt-2 pb-1">
            <span class="text-xs font-semibold uppercase tracking-widest text-slate-600">Principal</span>
          </div>
          <a routerLink="/dashboard" routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
             (click)="showMobileMenu = false">
            <i class="fas fa-chart-pie w-4 text-center"></i> Tableau de bord
          </a>
          <a routerLink="/enseignants" routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
             (click)="showMobileMenu = false">
            <i class="fas fa-users w-4 text-center"></i> Enseignants
          </a>
          <a routerLink="/heures" routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
             (click)="showMobileMenu = false">
            <i class="fas fa-clock w-4 text-center"></i> 
            <span class="flex-1">Heures effectuées</span>
            <span *ngIf="notificationCount > 0" class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
              {{notificationCount}}
            </span>
          </a>
          <a routerLink="/matieres" routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
             (click)="showMobileMenu = false">
            <i class="fas fa-book w-4 text-center"></i> Matières
          </a>

          <!-- Rapports -->
          <div *ngIf="isRH">
            <div class="px-4 pt-4 pb-1">
              <span class="text-xs font-semibold uppercase tracking-widest text-slate-600">Rapports</span>
            </div>
            <a routerLink="/rapports" routerLinkActive="bg-blue-600 text-white"
               class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
               (click)="showMobileMenu = false">
              <i class="fas fa-file-alt w-4 text-center"></i> États &amp; Exports
            </a>
          </div>

          <!-- Administration -->
          <div *ngIf="isAdmin">
            <div class="px-4 pt-4 pb-1">
              <span class="text-xs font-semibold uppercase tracking-widest text-slate-600">Administration</span>
            </div>
            <a routerLink="/parametres" routerLinkActive="bg-blue-600 text-white"
               class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150"
               (click)="showMobileMenu = false">
              <i class="fas fa-cog w-4 text-center"></i> Paramètres
            </a>
          </div>
        </nav>

        <!-- User footer -->
        <div class="px-4 py-4 border-t border-slate-800">
          <div class="flex items-center gap-3 mb-3 text-slate-300">
             <app-avatar 
               [url]="auth.getAvatarUrl(user?.avatar_url)" 
               [name]="user?.prenom + ' ' + user?.nom" 
               size="sm">
             </app-avatar>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-white truncate">{{user?.prenom}} {{user?.nom}}</div>
              <div class="text-xs text-slate-500">{{roleLabel}}</div>
            </div>
          </div>
          <button (click)="logout()"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white hover:bg-slate-800 transition-colors duration-150">
            <i class="fas fa-sign-out-alt"></i> Déconnexion
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-content">
        <header class="topbar">
          <div class="flex items-center gap-3">
            <button class="mobile-only p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" (click)="showMobileMenu = true">
              <i class="fas fa-bars text-sm"></i>
            </button>
            <div class="topbar-title-wrapper">
              <div class="topbar-icon" *ngIf="!isMobile">
                <i class="fas fa-desktop text-xs"></i>
              </div>
              <span class="topbar-title text-base font-bold uppercase tracking-tight">{{pageTitle}}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Notifications -->
            <div class="notification-bell" *ngIf="!isMobile">
              <i class="fas fa-bell"></i>
              <span class="notification-badge" *ngIf="notificationCount > 0">{{notificationCount}}</span>
            </div>

            <!-- User Profile Top -->
            <div class="relative">
              <div class="user-profile-top" (click)="isUserMenuOpen = !isUserMenuOpen">
                <div class="user-info-text hidden md:flex" *ngIf="!isMobile">
                  <span class="user-display-name">{{user?.prenom}} {{user?.nom}}</span>
                  <span class="user-display-role">{{roleLabel}}</span>
                </div>
                <app-avatar 
                  [url]="auth.getAvatarUrl(user?.avatar_url)" 
                  [name]="user?.prenom + ' ' + user?.nom" 
                  size="sm"
                  class="border-2 border-slate-200 rounded-full">
                </app-avatar>
                <i class="fas fa-chevron-down dropdown-chevron" [class.rotate-180]="isUserMenuOpen"></i>
              </div>

              <!-- Dropdown Menu -->
              <div class="user-dropdown-menu" *ngIf="isUserMenuOpen" (click)="$event.stopPropagation()">
                <div class="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                  <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mon Compte</p>
                  <p class="text-sm font-bold text-slate-700 truncate">{{user?.prenom}} {{user?.nom}}</p>
                </div>
                <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen = false">
                  <i class="fas fa-user-circle"></i> Mon Profil
                </a>
                <div class="border-t border-slate-50 mt-1">
                  <button (click)="logout(); isUserMenuOpen = false" class="dropdown-item w-full text-left text-red-600 hover:bg-red-50">
                    <i class="fas fa-sign-out-alt"></i> Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div class="page-content" (click)="isUserMenuOpen = false">
          <router-outlet />
        </div>
      </div>
    </div>
  `
})
export class LayoutComponent implements OnInit, OnDestroy {
  user: User | null = null;
  pageTitle = 'Tableau de bord';
  showMobileMenu = false;
  isUserMenuOpen = false;
  notificationCount = 0;
  private subs = new Subscription();

  get isMobile(): boolean {
    return window.innerWidth <= 992;
  }

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.subs.add(this.auth.currentUser$.subscribe(u => {
      this.user = u;
      if (u) this.refreshNotifications();
    }));

    // Refresh on each navigation end to keep it updated
    this.subs.add(this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.refreshNotifications();
      this.updatePageTitle();
    }));

    // Auto-refresh every 2 minutes
    this.subs.add(interval(120000).subscribe(() => this.refreshNotifications()));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  refreshNotifications() {
    if (!this.user) return;
    this.api.getPendingHeuresCount().subscribe({
      next: (res) => this.notificationCount = res.count,
      error: () => {}
    });
  }

  updatePageTitle() {
    const url = this.router.url;
    if (url.includes('dashboard')) this.pageTitle = 'Tableau de bord';
    else if (url.includes('enseignants')) this.pageTitle = 'Gestion des enseignants';
    else if (url.includes('heures')) this.pageTitle = 'Heures effectuées';
    else if (url.includes('matieres')) this.pageTitle = 'Gestion des matières';
    else if (url.includes('rapports')) this.pageTitle = 'États & Rapports';
    else if (url.includes('parametres')) this.pageTitle = 'Paramètres système';
    else if (url.includes('profile')) this.pageTitle = 'Mon Profil';
  }

  get isAdmin(): boolean { return this.auth.isAdmin; }
  get isRH(): boolean { return this.auth.isRH; }
  get roleLabel(): string {
    const roles: any = { admin: 'Administrateur', rh: 'Ressources Humaines', enseignant: 'Enseignant' };
    return roles[this.user?.role || ''] || '';
  }

  logout() { this.auth.logout(); }
}
