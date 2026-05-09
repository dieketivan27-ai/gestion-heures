import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';
import { AvatarComponent } from '../../shared/components/avatar.component';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-user-shield text-blue-600"></i> Gestion des Utilisateurs
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">{{filteredUsers.length}} utilisateur(s) au total</p>
      </div>
      <button (click)="openModal()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm shadow-blue-200">
        <i class="fas fa-plus"></i> Nouvel Utilisateur
      </button>
    </div>

    <!-- FILTRES -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6">
      <div class="flex gap-4 flex-wrap items-center">
        <div class="relative flex-1 min-w-[240px]">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input 
            class="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
            placeholder="Rechercher par nom, prénom ou email..." 
            [(ngModel)]="searchTerm" 
            (input)="applyFilters()">
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rôle:</span>
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" [(ngModel)]="roleFilter" (change)="applyFilters()">
            <option value="ALL">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="rh">Ressources Humaines</option>
            <option value="enseignant">Enseignant</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut:</span>
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="ALL">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>
      </div>
    </div>

    <!-- LISTE -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date création</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="5" class="px-4 py-12 text-center">
                <div class="spinner mx-auto"></div>
              </td>
            </tr>
            <tr *ngIf="!loading && filteredUsers.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-slate-400">
                <i class="fas fa-user-slash text-4xl mb-3 opacity-20 block"></i>
                Aucun utilisateur trouvé
              </td>
            </tr>
            <tr *ngFor="let u of filteredUsers" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <app-avatar [url]="getAvatarUrl(u.avatar_url)" [name]="(u.prenom || u.nom) ? (u.prenom + ' ' + u.nom) : u.email" size="sm"></app-avatar>
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-800 truncate">
                      {{ (u.prenom || u.nom) ? (u.prenom + ' ' + u.nom) : u.email }}
                      <span *ngIf="u.id === currentUser?.id" class="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Moi</span>
                    </div>
                    <div class="text-xs text-slate-400 truncate">{{u.email}}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span [ngClass]="getRoleClass(u.role)" class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  {{getRoleLabel(u.role)}}
                </span>
              </td>
              <td class="px-4 py-3">
                <button (click)="toggleStatus(u)" [disabled]="u.id === currentUser?.id"
                  class="flex items-center gap-2 group/status" [title]="u.id === currentUser?.id ? 'Vous ne pouvez pas désactiver votre propre compte' : 'Changer le statut'">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" [ngClass]="u.is_active ? 'bg-emerald-400' : 'bg-slate-300'"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2" [ngClass]="u.is_active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  </span>
                  <span class="text-xs font-medium" [ngClass]="u.is_active ? 'text-emerald-600' : 'text-slate-400'">
                    {{u.is_active ? 'Actif' : 'Inactif'}}
                  </span>
                </button>
              </td>
              <td class="px-4 py-3 text-slate-500 text-xs">
                {{u.created_at | date:'dd/MM/yyyy HH:mm'}}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-1.5">
                  <button (click)="openModal(u)" 
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all" title="Modifier">
                    <i class="fas fa-edit text-xs"></i>
                  </button>
                  <button (click)="confirmDelete(u)" [disabled]="u.id === currentUser?.id"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Supprimer">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL UTILISATEUR -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal=false">
      <div class="modal max-w-lg" (click)="$event.stopPropagation()">
        <div class="modal-header border-b border-slate-50 p-5">
          <div>
            <h3 class="modal-title text-lg font-bold text-slate-800">
              {{editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Complétez les informations du compte</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 transition-colors" (click)="showModal=false">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>
        
        <div class="modal-body p-6">
          <div *ngIf="formError" class="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-5 flex items-center gap-3">
            <i class="fas fa-exclamation-circle text-base"></i>
            <span>{{formError}}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prénom *</label>
              <input class="form-control" [(ngModel)]="form.prenom" placeholder="Ex: Jean">
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom *</label>
              <input class="form-control" [(ngModel)]="form.nom" placeholder="Ex: DUPONT">
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
              <div class="relative">
                <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="email" class="form-control pl-9" [(ngModel)]="form.email" placeholder="email@exemple.com">
              </div>
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Téléphone</label>
              <div class="relative">
                <i class="fas fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input class="form-control pl-9" [(ngModel)]="form.telephone" placeholder="+225 ...">
              </div>
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rôle *</label>
              <select class="form-control" [(ngModel)]="form.role">
                <option value="enseignant">Enseignant</option>
                <option value="rh">Ressources Humaines</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            
            <div class="form-group md:col-span-2" *ngIf="!editingUser">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mot de passe temporaire *</label>
              <div class="relative">
                <i class="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input type="password" class="form-control pl-9" [(ngModel)]="form.password" placeholder="Minimum 6 caractères">
              </div>
              <p class="text-[10px] text-slate-400 mt-1.5">L'utilisateur devra changer son mot de passe à la première connexion.</p>
            </div>

            <div class="form-group md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-lg" *ngIf="editingUser">
              <div class="flex-1">
                <label class="block text-sm font-semibold text-slate-700">Compte actif</label>
                <p class="text-xs text-slate-400">Autorise l'utilisateur à se connecter au système</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" [(ngModel)]="form.is_active" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer border-t border-slate-50 p-5 bg-slate-50/30 flex justify-end gap-3 rounded-b-xl">
          <button class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors" (click)="showModal=false">Annuler</button>
          <button class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2"
            (click)="save()" [disabled]="saving">
            <span class="spinner !border-white !border-t-transparent !w-3 !h-3" *ngIf="saving"></span>
            <i class="fas fa-check" *ngIf="!saving"></i>
            {{editingUser ? "Mettre à jour" : "Créer l'utilisateur"}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UtilisateursComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = true;
  saving = false;
  
  // Modal state
  showModal = false;
  editingUser: User | null = null;
  form: any = {};
  formError = '';

  // Filters
  searchTerm = '';
  roleFilter = 'ALL';
  statusFilter = 'ALL';

  constructor(
    private userService: UserService,
    private auth: AuthService
  ) {}

  get currentUser() { return this.auth.currentUser; }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.filteredUsers = this.users.filter(u => {
      const matchSearch = !this.searchTerm || 
        `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchRole = this.roleFilter === 'ALL' || u.role === this.roleFilter;
      
      const matchStatus = this.statusFilter === 'ALL' || 
        (this.statusFilter === 'active' ? u.is_active : !u.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }

  getAvatarUrl(path?: string | null) {
    return this.auth.getAvatarUrl(path || undefined);
  }

  getRoleLabel(role: string): string {
    const labels: any = { admin: 'Admin', rh: 'RH', enseignant: 'Enseignant' };
    return labels[role] || role;
  }

  getRoleClass(role: string): string {
    const classes: any = {
      admin: 'bg-indigo-50 text-indigo-700',
      rh: 'bg-purple-50 text-purple-700',
      enseignant: 'bg-blue-50 text-blue-700'
    };
    return classes[role] || 'bg-slate-50 text-slate-700';
  }

  openModal(u: User | null = null) {
    this.editingUser = u;
    if (u) {
      this.form = { ...u };
    } else {
      this.form = { role: 'enseignant', is_active: true };
    }
    this.formError = '';
    this.showModal = true;
  }

  save() {
    if (!this.form.nom || !this.form.prenom || !this.form.email || (!this.editingUser && !this.form.password)) {
      this.formError = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    this.saving = true;
    this.formError = '';

    const req = this.editingUser 
      ? this.userService.updateUser(this.editingUser.id, this.form)
      : this.userService.createUser(this.form);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.loadUsers();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err.error?.message || 'Une erreur est survenue';
      }
    });
  }

  toggleStatus(u: User) {
    this.userService.toggleStatus(u.id).subscribe({
      next: () => {
        u.is_active = !u.is_active;
      },
      error: (err) => alert(err.error?.message || 'Erreur lors du changement de statut')
    });
  }

  confirmDelete(u: User) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${u.prenom} ${u.nom} ? Cette action est irréversible et supprimera également son profil enseignant s'il existe.`)) {
      this.userService.deleteUser(u.id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert(err.error?.message || 'Erreur lors de la suppression')
      });
    }
  }
}
