import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Matiere, Filiere, AnneeAcademique } from '../../core/models/models';

@Component({
  selector: 'app-matieres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-book text-blue-600"></i> Matières
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">{{matieres.length}} matière(s) enregistrée(s)</p>
      </div>
      <button *ngIf="isRH" (click)="openModal()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
        <i class="fas fa-plus"></i> Ajouter
      </button>
    </div>

    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="flex gap-3 flex-wrap p-4 border-b border-slate-50">
        <input class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:220px" placeholder="🔍 Rechercher..." [(ngModel)]="search" (input)="applyFilter()">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:120px" [(ngModel)]="filterNiveau" (change)="applyFilter()">
          <option value="">Tous niveaux</option>
          <option *ngFor="let n of niveaux" [value]="n">{{n}}</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="filterAnnee" (change)="load()">
          <option value="ALL">Toutes années</option>
          <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Intitulé</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Filière</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Cours Magistraux">Vol. CM</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Travaux Dirigés">Vol. TD</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Travaux Pratiques">Vol. TP</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">Total</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="9" class="px-4 py-10 text-center"><div class="spinner" style="margin:0 auto"></div></td>
            </tr>
            <tr *ngIf="!loading && !filtered.length">
              <td colspan="9" class="px-4 py-12 text-center text-slate-400">
                <i class="fas fa-book text-4xl mb-3 opacity-30 block"></i>Aucune matière trouvée
              </td>
            </tr>
            <tr *ngFor="let m of filtered" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <code class="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{{m.code || '-'}}</code>
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-slate-800">{{m.intitule}}</div>
                <div class="text-xs text-slate-400" *ngIf="m.annee_libelle"><i class="far fa-calendar-alt"></i> {{m.annee_libelle}}</div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                <span *ngIf="m.filiere_nom" class="truncate block max-w-[150px]" [title]="m.filiere_nom">{{m.filiere_nom}}</span>
                <span *ngIf="!m.filiere_nom" class="text-slate-300">-</span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" [ngClass]="{
                  'bg-blue-50 text-blue-700': m.niveau.startsWith('L'),
                  'bg-purple-50 text-purple-700': m.niveau.startsWith('M')
                }">{{m.niveau}}</span>
              </td>
              <td class="px-4 py-3 text-center text-slate-600">{{m.volume_horaire_prevu_cm}}h</td>
              <td class="px-4 py-3 text-center text-slate-600">{{m.volume_horaire_prevu_td}}h</td>
              <td class="px-4 py-3 text-center text-slate-600">{{m.volume_horaire_prevu_tp}}h</td>
              <td class="px-4 py-3 text-center font-bold text-blue-600 text-base">{{m.volume_total}}h</td>
              <td class="px-4 py-3">
                <div class="flex gap-1.5">
                  <button *ngIf="isRH" (click)="openModal(m)"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Modifier">
                    <i class="fas fa-edit text-xs"></i>
                  </button>
                  <button *ngIf="isAdmin" (click)="confirmDelete(m)"
                    class="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Supprimer">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal($event)">
      <div class="modal max-w-xl" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">{{editing ? 'Modifier' : 'Ajouter'}} une matière</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger mb-4" *ngIf="formError">
            <i class="fas fa-exclamation-circle text-red-500"></i> {{formError}}
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label text-slate-500">Code</label>
              <input class="form-control" [(ngModel)]="form.code" placeholder="Ex: MAT001">
            </div>
            <div class="form-group">
              <label class="form-label">Intitulé *</label>
              <input class="form-control" [(ngModel)]="form.intitule" required placeholder="Ex: Mathématiques">
            </div>
            <div class="form-group">
              <label class="form-label">Filière</label>
              <select class="form-control" [(ngModel)]="form.filiere_id">
                <option [value]="null">-- Aucune --</option>
                <option *ngFor="let f of filieres" [value]="f.id">{{f.nom}}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Niveau *</label>
              <select class="form-control" [(ngModel)]="form.niveau">
                <option *ngFor="let n of niveaux" [value]="n">{{n}}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Année académique</label>
              <select class="form-control" [(ngModel)]="form.annee_academique_id">
                <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
              </select>
            </div>
            <div class="grid grid-cols-3 gap-3 col-span-full mt-2 pt-4 border-t border-slate-100">
              <div class="form-group">
                <label class="form-label">Vol. CM (h)</label>
                <input type="number" class="form-control" [(ngModel)]="form.volume_horaire_prevu_cm">
              </div>
              <div class="form-group">
                <label class="form-label">Vol. TD (h)</label>
                <input type="number" class="form-control" [(ngModel)]="form.volume_horaire_prevu_td">
              </div>
              <div class="form-group">
                <label class="form-label">Vol. TP (h)</label>
                <input type="number" class="form-control" [(ngModel)]="form.volume_horaire_prevu_tp">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="showModal=false">Annuler</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">
            <span class="spinner !border-white !border-t-transparent" *ngIf="saving" style="width:14px;height:14px;border-width:2px"></span>
            <i class="fas fa-save" *ngIf="!saving"></i>
            {{editing ? 'Mettre à jour' : 'Enregistrer'}}
          </button>
        </div>
      </div>
    </div>
  `
})
export class MatieresComponent implements OnInit {
  matieres: Matiere[] = []; filtered: Matiere[] = [];
  filieres: Filiere[] = []; annees: AnneeAcademique[] = [];
  loading = true; showModal = false; editing: Matiere | null = null;
  form: any = {}; saving = false; formError = '';
  search = ''; filterNiveau = ''; filterAnnee: any = null;
  niveaux = ['L1', 'L2', 'L3', 'M1', 'M2'];

  constructor(private api: ApiService, private auth: AuthService, private router: Router) { }
  get isRH() { return this.auth.isRH; }
  get isAdmin() { return this.auth.isAdmin; }

  ngOnInit() {
    if (this.auth.currentUser?.role === 'enseignant') {
      this.router.navigate(['/enseignant/mes-matieres']);
      return;
    }
    this.api.getAnnees().subscribe(a => { this.annees = a; const active = a.find(x => x.is_active); this.filterAnnee = active?.id || null; this.load(); });
    this.api.getFilieres().subscribe(f => this.filieres = f);
  }

  load() {
    this.loading = true;
    this.api.getMatieres(this.filterAnnee || undefined).subscribe({
      next: d => {
        this.matieres = d.map(m => ({
          ...m,
          volume_total: (m.volume_horaire_prevu_cm || 0) + (m.volume_horaire_prevu_td || 0) + (m.volume_horaire_prevu_tp || 0)
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter() {
    this.filtered = this.matieres.filter(m =>
      (!this.search || m.intitule.toLowerCase().includes(this.search.toLowerCase()) || (m.code && m.code.toLowerCase().includes(this.search.toLowerCase()))) &&
      (!this.filterNiveau || m.niveau === this.filterNiveau)
    );
  }

  openModal(m?: Matiere) {
    this.editing = m || null;
    const active = this.annees.find(a => a.is_active);
    this.form = m ? { ...m } : { niveau: 'L1', volume_horaire_prevu_cm: 0, volume_horaire_prevu_td: 0, volume_horaire_prevu_tp: 0, annee_academique_id: active?.id || this.annees[0]?.id, filiere_id: null };
    this.formError = ''; this.showModal = true;
  }

  closeModal(e: any) { if (e.target === e.currentTarget) this.showModal = false; }

  save() {
    if (!this.form.intitule) { this.formError = 'L\'intitule est obligatoire'; return; }
    this.saving = true; this.formError = '';
    const req = this.editing ? this.api.updateMatiere(this.editing.id, this.form) : this.api.createMatiere(this.form);
    req.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.load(); },
      error: err => {
        this.saving = false;
        this.formError = err.error?.error || err.error?.message || 'Erreur lors de l\'enregistrement';
      }
    });
  }

  confirmDelete(m: Matiere) {
    if (confirm(`Supprimer "${m.intitule}" ?`)) this.api.deleteMatiere(m.id).subscribe(() => this.load());
  }
}
