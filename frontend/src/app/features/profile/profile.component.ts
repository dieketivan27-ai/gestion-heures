import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  template: `
    <div class="max-w-4xl mx-auto pb-12">
      <!-- Header / Banner -->
      <div class="relative mb-20">
        <div class="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg"></div>
        <div class="absolute -bottom-16 left-8 flex items-end gap-6">
          <div class="relative">
            <app-avatar 
              [url]="getAvatarUrl()" 
              [name]="(user?.prenom || '') + ' ' + (user?.nom || '')" 
              size="xl" 
              [editable]="!uploading"
              (fileSelected)="onFileSelected($event)"
              (avatarRemoved)="onAvatarRemoved()"
              (onError)="onAvatarError($event)">
            </app-avatar>
            <div *ngIf="uploading"
              class="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center z-30">
              <i class="fas fa-spinner fa-spin text-white text-2xl"></i>
              <span class="text-[10px] text-white font-bold mt-1 uppercase tracking-wider">Envoi...</span>
            </div>
          </div>
          <div class="mb-4">
            <h1 class="text-3xl font-black text-slate-800 tracking-tight">{{user?.prenom}} {{user?.nom}}</h1>
            <p class="text-slate-500 flex items-center gap-3">
              <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100/50">{{user?.role}}</span>
              <span class="text-sm font-medium">{{user?.email}}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex gap-1 border-b border-slate-200 mb-8">
        <button (click)="activeTab = 'info'" 
          [class]="activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
          class="px-6 py-3 border-b-2 font-medium text-sm transition-all focus:outline-none">
          Informations personnelles
        </button>
        <button (click)="activeTab = 'security'" 
          [class]="activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
          class="px-6 py-3 border-b-2 font-medium text-sm transition-all focus:outline-none">
          Sécurité
        </button>
      </div>

      <!-- Info Tab -->
      <div *ngIf="activeTab === 'info'" class="grid gap-6">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 class="text-lg font-bold text-slate-800 mb-6">Paramètres du compte</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input type="text" [(ngModel)]="editUser.nom" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input type="text" [(ngModel)]="editUser.prenom" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Email Professionnel</label>
              <input type="email" [(ngModel)]="editUser.email" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Téléphone</label>
              <input type="text" [(ngModel)]="editUser.telephone" class="form-control" placeholder="+225 ...">
            </div>

            <div class="md:col-span-2 pt-4 flex items-center justify-between border-t border-slate-100 mt-2">
              <p class="text-xs text-slate-400 italic">Dernière mise à jour : {{today | date:'mediumDate'}}</p>
              <button type="button" (click)="saveProfile()" [disabled]="saving" 
                class="btn btn-primary px-8 flex items-center gap-2">
                <i *ngIf="saving" class="fas fa-spinner fa-spin"></i>
                <i *ngIf="!saving" class="fas fa-check"></i>
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>

        <div class="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 flex gap-4">
          <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 text-xl">
            <i class="fas fa-info-circle"></i>
          </div>
          <div>
            <h3 class="font-bold text-blue-900 mb-1">Protection du rôle</h3>
            <p class="text-sm text-blue-700 leading-relaxed">
              Pour des raisons de sécurité, votre rôle (<b>{{user?.role}}</b>) ne peut être modifié que par un administrateur système.
            </p>
          </div>
        </div>
      </div>

      <!-- Security Tab -->
      <div *ngIf="activeTab === 'security'">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 class="text-lg font-bold text-slate-800 mb-6">Changer le mot de passe</h2>
          
          <div class="max-w-md">
            <div class="form-group">
              <label class="form-label">Ancien mot de passe</label>
              <div class="relative">
                <input [type]="showOld ? 'text' : 'password'" [(ngModel)]="passwords.old" class="form-control pr-10">
                <button type="button" (click)="showOld = !showOld" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <i class="fas" [ngClass]="showOld ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <div class="form-group mt-4">
              <label class="form-label">Nouveau mot de passe</label>
              <div class="relative">
                <input [type]="showNew ? 'text' : 'password'" [(ngModel)]="passwords.new" class="form-control pr-10">
                <button type="button" (click)="showNew = !showNew" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <i class="fas" [ngClass]="showNew ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <p class="text-xs text-slate-400 mt-1">Minimum 6 caractères.</p>
            </div>

            <div class="form-group mt-4">
              <label class="form-label">Confirmer le nouveau mot de passe</label>
              <div class="relative">
                <input [type]="showConf ? 'text' : 'password'" [(ngModel)]="passwords.conf" class="form-control pr-10">
                <button type="button" (click)="showConf = !showConf" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <i class="fas" [ngClass]="showConf ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <div *ngIf="passwords.new && passwords.conf && passwords.new !== passwords.conf" class="mt-3 text-xs text-red-600 flex items-center gap-1">
              <i class="fas fa-exclamation-triangle"></i> Les mots de passe ne correspondent pas
            </div>

            <div class="pt-6 border-t border-slate-100 mt-6">
              <button type="button" (click)="updatePassword()"
                [disabled]="!passwords.old || !passwords.new || passwords.new !== passwords.conf || changing" 
                class="btn btn-primary w-full py-3 flex items-center justify-center gap-2">
                <i *ngIf="changing" class="fas fa-spinner fa-spin"></i>
                <i *ngIf="!changing" class="fas fa-lock text-sm"></i>
                Mettre à jour le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal succÃ¨s -->
    <div *ngIf="showSuccess" class="modal-overlay" (click)="showSuccess = false">
      <div class="modal w-full max-w-sm text-center py-10 px-8 scale-in-center" (click)="$event.stopPropagation()">
        <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-emerald-50/50">
          <i class="fas fa-check text-3xl"></i>
        </div>
        <h3 class="text-2xl font-extrabold text-slate-800 mb-3">Succès !</h3>
        <p class="text-slate-500 mb-8 text-base leading-relaxed">{{message}}</p>
        <button type="button" (click)="showSuccess = false" class="btn btn-primary w-full py-3.5 text-base">Continuer</button>
      </div>
    </div>

    <!-- Modal erreur -->
    <div *ngIf="error" class="modal-overlay" (click)="error = null">
      <div class="modal w-full max-w-sm text-center py-10 px-8 scale-in-center" (click)="$event.stopPropagation()">
        <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-red-50/50">
          <i class="fas fa-times text-3xl"></i>
        </div>
        <h3 class="text-2xl font-extrabold text-slate-800 mb-3">Erreur</h3>
        <p class="text-slate-500 mb-8 text-base leading-relaxed">{{error}}</p>
        <button type="button" (click)="error = null" class="btn btn-outline w-full py-3.5 text-base border-red-200 text-red-600 hover:bg-red-50">Fermer</button>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  editUser: any = {};
  passwords = { old: '', new: '', conf: '' };
  activeTab: 'info' | 'security' = 'info';

  saving = false;
  changing = false;
  uploading = false;
  showSuccess = false;
  message = '';
  error: string | null = null;
  previewUrl: string | null = null;

  showOld = false;
  showNew = false;
  showConf = false;

  today = new Date();

  constructor(private auth: AuthService) { }

  ngOnInit() {
    this.auth.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.editUser = {
          nom: u.nom || '',
          prenom: u.prenom || '',
          email: u.email || '',
          telephone: u.telephone || ''
        };
      }
    });
  }

  getAvatarUrl() {
    // previewUrl takes priority while upload is in progress
    return this.previewUrl || this.auth.getAvatarUrl(this.user?.avatar_url);
  }

  onAvatarError(msg: string) {
    this.error = msg;
  }

  onFileSelected(file: File) {
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);

    this.uploading = true;
    this.auth.updateAvatar(file).subscribe({
      next: () => {
        this.uploading = false;
        this.previewUrl = null; // let server URL take over
        this.message = 'Votre photo de profil a été mise à jour !';
        this.showSuccess = true;
      },
      error: (err) => {
        this.uploading = false;
        this.previewUrl = null;
        this.error = err.error?.message || "Erreur lors de l'envoi de l'image. Vérifiez que le fichier est bien une image (max 5 Mo).";
      }
    });
  }

  onAvatarRemoved() {
    if (confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) {
      this.previewUrl = null;
      this.auth.deleteAvatar().subscribe({
        next: () => {
          this.message = 'Votre photo de profil a été supprimée.';
          this.showSuccess = true;
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de la suppression";
        }
      });
    }
  }

  saveProfile() {
    if (!this.editUser.nom || !this.editUser.prenom || !this.editUser.email) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    this.saving = true;
    this.auth.updateProfile(this.editUser).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Vos informations ont été mises à jour avec succès.';
        this.showSuccess = true;
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Erreur lors de la mise à jour';
      }
    });
  }

  updatePassword() {
    if (!this.passwords.old || !this.passwords.new) return;
    if (this.passwords.new !== this.passwords.conf) return;

    this.changing = true;
    this.auth.changePassword(this.passwords.old, this.passwords.new).subscribe({
      next: () => {
        this.changing = false;
        this.passwords = { old: '', new: '', conf: '' };
        this.message = 'Votre mot de passe a été modifié.';
        this.showSuccess = true;
      },
      error: (err) => {
        this.changing = false;
        this.error = err.error?.message || "L'ancien mot de passe est incorrect";
      }
    });
  }
}

