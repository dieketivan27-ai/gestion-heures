import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { UniversityService } from '../../core/services/university.service';
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
      <aside class="sidebar bg-slate-900 flex flex-col text-slate-300"
             [class.show]="showMobileMenu"
             [class.collapsed]="sidebarCollapsed">

        <!-- Logo / Brand -->
        <div class="sidebar-brand">
          <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-graduation-cap text-white text-sm"></i>
          </div>
          <div class="sidebar-brand-text">
            <h1 class="text-sm font-bold text-white leading-tight">GestionHeures</h1>
            <p class="text-xs text-slate-500 truncate">Enseignement Supérieur</p>
          </div>
          
          <!-- Hamburger in Sidebar: Visible on Desktop (always) and Mobile (when open) -->
          <button class="hamburger-btn sidebar-hamburger ml-auto" 
            [class.sidebar-hamburger-collapsed]="sidebarCollapsed"
            (click)="toggleSidebar()" aria-label="Toggle sidebar">
            <span class="hamburger-bar" [class.open]="showMobileMenu || !sidebarCollapsed"></span>
            <span class="hamburger-bar" [class.open]="showMobileMenu || !sidebarCollapsed"></span>
            <span class="hamburger-bar" [class.open]="showMobileMenu || !sidebarCollapsed"></span>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 py-3 overflow-y-auto overflow-x-hidden">

          <!-- Principal -->
          <div class="sidebar-section-label">
            <span>Principal</span>
          </div>
          <a routerLink="/dashboard" routerLinkActive="active"
             class="sidebar-link"
             [title]="sidebarCollapsed ? 'Tableau de bord' : ''"
             (click)="showMobileMenu = false">
            <i class="fas fa-chart-pie sidebar-link-icon"></i>
            <span class="sidebar-link-label">Tableau de bord</span>
          </a>
          <a routerLink="/enseignants" routerLinkActive="active"
             class="sidebar-link"
             [title]="sidebarCollapsed ? 'Enseignants' : ''"
             (click)="showMobileMenu = false">
            <i class="fas fa-users sidebar-link-icon"></i>
            <span class="sidebar-link-label">Enseignants</span>
          </a>
          <a routerLink="/heures" routerLinkActive="active"
             class="sidebar-link"
             [title]="sidebarCollapsed ? 'Heures effectuées' : ''"
             (click)="showMobileMenu = false">
            <i class="fas fa-clock sidebar-link-icon"></i>
            <span class="sidebar-link-label flex-1">Heures effectuées</span>
            <span *ngIf="notificationCount > 0" class="sidebar-badge">{{notificationCount}}</span>
          </a>
          <a [routerLink]="matieresRoute" routerLinkActive="active"
             class="sidebar-link"
             [title]="sidebarCollapsed ? 'Matières' : ''"
             (click)="showMobileMenu = false">
            <i class="fas fa-book sidebar-link-icon"></i>
            <span class="sidebar-link-label">Matières</span>
          </a>

          <!-- Rapports -->
          <div *ngIf="isRH">
            <div class="sidebar-section-label">
              <span>Rapports</span>
            </div>
            <a routerLink="/rapports" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Rapports' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-file-alt sidebar-link-icon"></i>
              <span class="sidebar-link-label">États & Rapports</span>
            </a>
            <a routerLink="/import" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Importation' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-file-import sidebar-link-icon"></i>
              <span class="sidebar-link-label">Importation Excel</span>
            </a>
          </div>

          <!-- Administration -->
          <div *ngIf="isAdmin">
            <div class="sidebar-section-label">
              <span>Administration</span>
            </div>
            <a routerLink="/parametres" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Paramètres' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-cog sidebar-link-icon"></i>
              <span class="sidebar-link-label">Paramètres</span>
            </a>
            <a routerLink="/utilisateurs" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Utilisateurs' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-user-shield sidebar-link-icon"></i>
              <span class="sidebar-link-label">Utilisateurs</span>
            </a>
            <a routerLink="/logs" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Journal des actions' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-history sidebar-link-icon"></i>
              <span class="sidebar-link-label">Journal des actions</span>
            </a>
          </div>

          <!-- Super Administration -->
          <div *ngIf="isSuperAdmin">
            <div class="sidebar-section-label">
              <span>Super Admin</span>
            </div>
            <a routerLink="/universities" routerLinkActive="active"
               class="sidebar-link"
               [title]="sidebarCollapsed ? 'Universités' : ''"
               (click)="showMobileMenu = false">
              <i class="fas fa-university sidebar-link-icon"></i>
              <span class="sidebar-link-label">Universités</span>
            </a>
          </div>
        </nav>

        <!-- User footer -->
        <div class="sidebar-footer">
          <div class="user-info">
            <app-avatar 
              [url]="auth.getAvatarUrl(user?.avatar_url)" 
              [name]="user?.prenom + ' ' + user?.nom" 
              size="sm">
            </app-avatar>
            <div class="sidebar-footer-text">
              <div class="text-sm font-semibold text-white truncate">{{user?.prenom}} {{user?.nom}}</div>
              <div class="text-xs text-slate-500">{{roleLabel}}</div>
            </div>
          </div>
          <button (click)="logout()"
            class="sidebar-logout-btn"
            [title]="sidebarCollapsed ? 'Déconnexion' : ''">
            <i class="fas fa-sign-out-alt"></i>
            <span class="sidebar-link-label">Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-content">
        <header class="topbar">
          <div class="flex items-center gap-4">
            <!-- Hamburger in Topbar: ONLY visible on Mobile when sidebar is CLOSED -->
            <button class="hamburger-btn lg:hidden" *ngIf="!showMobileMenu" (click)="toggleSidebar()" aria-label="Toggle sidebar">
              <span class="hamburger-bar"></span>
              <span class="hamburger-bar"></span>
              <span class="hamburger-bar"></span>
            </button>
            <div class="topbar-title-wrapper">
              <div class="topbar-icon" *ngIf="!isMobile">
                <i class="fas fa-desktop text-xs"></i>
              </div>
              <span class="topbar-title text-base font-bold uppercase tracking-tight">{{pageTitle}}</span>
            </div>
          </div>

          <!-- University Selector for Super Admin -->
          <div *ngIf="isSuperAdmin" class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:bg-slate-100/80">
            <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <i class="fas fa-university text-xs"></i>
            </div>
            <select 
              [value]="auth.selectedUniversityId || ''" 
              (change)="onUniversityChange($event)"
              class="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[220px] pr-2">
              <option value="">🏫 Toutes les universités</option>
              <option *ngFor="let u of universities" [value]="u.id">
                {{ u.sigle ? '[' + u.sigle + '] ' : '' }}{{ u.nom }}
              </option>
            </select>
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
  sidebarCollapsed = false;
  isUserMenuOpen = false;
  notificationCount = 0;
  universities: any[] = [];
  private subs = new Subscription();

  get isMobile(): boolean {
    return window.innerWidth <= 992;
  }

  @HostListener('window:resize')
  onResize() {
    // Auto-close mobile menu on resize to desktop
    if (window.innerWidth > 992) {
      this.showMobileMenu = false;
    }
  }

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private univService: UniversityService
  ) {}

  toggleSidebar() {
    if (this.isMobile) {
      this.showMobileMenu = !this.showMobileMenu;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  ngOnInit() {
    this.subs.add(this.auth.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.refreshNotifications();
        if (this.isSuperAdmin) {
          this.loadUniversities();
        }
      }
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
    else if (url.includes('matieres')) {
      this.pageTitle = this.user?.role === 'enseignant' ? 'Mes Matières' : 'Gestion des matières';
    }
    else if (url.includes('rapports')) this.pageTitle = 'États & Rapports';
    else if (url.includes('import')) this.pageTitle = 'Importation de données';
    else if (url.includes('parametres')) this.pageTitle = 'Paramètres système';
    else if (url.includes('utilisateurs')) this.pageTitle = 'Gestion des utilisateurs';
    else if (url.includes('logs')) this.pageTitle = 'Journal des actions';
    else if (url.includes('profile')) this.pageTitle = 'Mon Profil';
    else if (url.includes('universities')) this.pageTitle = 'Gestion des universités';
  }

  get matieresRoute(): string {
    if (this.user?.role === 'enseignant') return '/enseignant/mes-matieres';
    return '/matieres';
  }

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin; }
  get isAdmin(): boolean { return this.auth.isAdmin; }
  get isRH(): boolean { return this.auth.isRH; }
  get roleLabel(): string {
    const roles: any = { super_admin: 'Super Administrateur', admin: 'Administrateur', rh: 'Ressources Humaines', enseignant: 'Enseignant' };
    return roles[this.user?.role || ''] || '';
  }

  loadUniversities() {
    this.subs.add(this.univService.getUniversities().subscribe({
      next: (res) => this.universities = res,
      error: () => {}
    }));
  }

  onUniversityChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === '') {
      this.auth.setSelectedUniversity(null, null);
    } else {
      const uId = parseInt(value, 10);
      const univ = this.universities.find(u => u.id === uId);
      this.auth.setSelectedUniversity(uId, univ ? univ.nom : '');
    }
    this.refreshNotifications();
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  logout() { this.auth.logout(); }
}
