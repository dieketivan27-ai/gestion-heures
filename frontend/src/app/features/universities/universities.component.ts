import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniversityService } from '../../core/services/university.service';
import { University } from '../../core/models/models';

@Component({
  selector: 'app-universities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-university text-blue-600"></i> Gestion des Universités
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">{{universities.length}} université(s) enregistrée(s) au total</p>
      </div>
      <button (click)="openModal()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all shadow-sm shadow-blue-200">
        <i class="fas fa-plus"></i> Nouvelle Université
      </button>
    </div>

    <!-- CARDS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loading">
      <div *ngIf="universities.length === 0" class="col-span-full bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400 shadow-sm">
        <i class="fas fa-university text-5xl mb-4 opacity-20 block"></i>
        Aucune université n'est configurée pour le moment.
      </div>

      <div *ngFor="let univ of universities" 
        class="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all overflow-hidden flex flex-col group">
        <!-- Header -->
        <div class="p-5 border-b border-slate-50 flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-transform">
            {{ univ.sigle || univ.nom.substring(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <h3 class="font-bold text-slate-800 text-base leading-tight truncate" [title]="univ.nom">{{ univ.nom }}</h3>
            <span class="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider mt-1.5">
              ID: #{{ univ.id }}
            </span>
          </div>
        </div>

        <!-- Body stats -->
        <div class="p-5 flex-1 grid grid-cols-2 gap-4 bg-slate-50/20">
          <div class="p-3 bg-white rounded-lg border border-slate-50 text-center">
            <i class="fas fa-users text-blue-500 mb-1 block"></i>
            <span class="text-lg font-bold text-slate-800">{{ univ.nb_enseignants || 0 }}</span>
            <p class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Enseignants</p>
          </div>
          <div class="p-3 bg-white rounded-lg border border-slate-50 text-center">
            <i class="fas fa-user-shield text-indigo-500 mb-1 block"></i>
            <span class="text-lg font-bold text-slate-800">{{ univ.nb_utilisateurs || 0 }}</span>
            <p class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Utilisateurs</p>
          </div>
        </div>

        <!-- Footer / Actions -->
        <div class="p-4 border-t border-slate-50 bg-white flex items-center justify-between">
          <span class="text-[11px] text-slate-400">
            Créée le {{ univ.created_at | date:'dd/MM/yyyy' }}
          </span>
          <div class="flex gap-2">
            <button (click)="openModal(univ)"
              class="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all" title="Modifier">
              <i class="fas fa-edit text-xs"></i>
            </button>
            <button (click)="confirmDelete(univ)"
              class="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all" title="Supprimer">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SPINNER -->
    <div class="py-20 text-center" *ngIf="loading">
      <div class="spinner mx-auto"></div>
    </div>

    <!-- DIALOG MODAL -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
      <div class="modal max-w-md" (click)="$event.stopPropagation()">
        <div class="modal-header border-b border-slate-50 p-5">
          <div>
            <h3 class="modal-title text-lg font-bold text-slate-800">
              {{ editingUniv ? "Modifier l'université" : "Nouvelle Université" }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Saisissez les détails de l'établissement</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 transition-colors" (click)="showModal = false">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div class="modal-body p-6">
          <div *ngIf="formError" class="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-5 flex items-center gap-3">
            <i class="fas fa-exclamation-circle text-base"></i>
            <span>{{formError}}</span>
          </div>

          <div class="space-y-4">
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de l'Université *</label>
              <input class="form-control" [(ngModel)]="form.nom" placeholder="Ex: Université Félix Houphouët-Boigny">
            </div>
            <div class="form-group">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sigle / Abréviation</label>
              <input class="form-control" [(ngModel)]="form.sigle" placeholder="Ex: UFHB">
            </div>
          </div>
        </div>

        <div class="modal-footer border-t border-slate-50 p-5 bg-slate-50/30 flex justify-end gap-3 rounded-b-xl">
          <button class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors" (click)="showModal = false">Annuler</button>
          <button class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2"
            (click)="save()" [disabled]="saving">
            <span class="spinner !border-white !border-t-transparent !w-3 !h-3" *ngIf="saving"></span>
            <i class="fas fa-check" *ngIf="!saving"></i>
            {{ editingUniv ? "Mettre à jour" : "Enregistrer" }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UniversitiesComponent implements OnInit {
  universities: University[] = [];
  loading = true;
  saving = false;
  
  // Modal forms
  showModal = false;
  editingUniv: University | null = null;
  form: any = {};
  formError = '';

  constructor(private universityService: UniversityService) {}

  ngOnInit() {
    this.loadUniversities();
  }

  loadUniversities() {
    this.loading = true;
    this.universityService.getUniversities().subscribe({
      next: (data) => {
        this.universities = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  openModal(univ: University | null = null) {
    this.editingUniv = univ;
    if (univ) {
      this.form = { ...univ };
    } else {
      this.form = { nom: '', sigle: '' };
    }
    this.formError = '';
    this.showModal = true;
  }

  save() {
    if (!this.form.nom || !this.form.nom.trim()) {
      this.formError = "Le nom de l'université est obligatoire.";
      return;
    }

    this.saving = true;
    this.formError = '';

    const req = this.editingUniv
      ? this.universityService.updateUniversity(this.editingUniv.id, this.form)
      : this.universityService.createUniversity(this.form);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.loadUniversities();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err.error?.message || 'Une erreur est survenue';
      }
    });
  }

  confirmDelete(univ: University) {
    if (univ.id === 1) {
      alert("L'université de démonstration par défaut ne peut pas être supprimée.");
      return;
    }

    const warningMessage = `ATTENTION ! Êtes-vous sûr de vouloir supprimer l'université "${univ.nom}" ?\n\n` +
      `Cette action détruira DÉFINITIVEMENT :\n` +
      `- Tous les utilisateurs associés\n` +
      `- Tous les enseignants enregistrés\n` +
      `- Toutes les matières et attributions\n` +
      `- Toutes les déclarations d'heures effectuées\n\n` +
      `Cette opération est irréversible et détruira TOUTES les données de cette université !`;

    if (confirm(warningMessage)) {
      if (confirm(`Saisissez "SUPPRIMER" pour valider la suppression définitive de ${univ.nom} :`)) {
        this.loading = true;
        this.universityService.deleteUniversity(univ.id).subscribe({
          next: () => this.loadUniversities(),
          error: (err) => {
            this.loading = false;
            alert(err.error?.message || 'Erreur lors de la suppression');
          }
        });
      }
    }
  }
}
