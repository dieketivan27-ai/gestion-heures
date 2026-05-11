import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-attributions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-tasks text-indigo-600"></i> Attributions des Matières
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">Gérez les matières attribuées par enseignant et par semestre</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Formulaire d'attribution -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-4">
          <h2 class="text-base font-semibold mb-4 text-indigo-700 flex items-center gap-2">
            <i class="fas fa-plus-circle"></i> Nouvelle Attribution
          </h2>
          <div *ngIf="formError" class="alert alert-danger mb-4 text-sm">
            <i class="fas fa-exclamation-circle"></i> {{formError}}
          </div>
          <div *ngIf="successMsg" class="alert alert-success mb-4 text-sm">
            <i class="fas fa-check-circle"></i> {{successMsg}}
          </div>
          <form [formGroup]="attrForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="form-group">
              <label class="form-label">Enseignant *</label>
              <select formControlName="enseignant_id" class="form-control">
                <option [value]="null" disabled>-- Sélectionner --</option>
                <option *ngFor="let e of enseignants" [value]="e.id">{{e.prenom}} {{e.nom}}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Semestre *</label>
              <div class="flex gap-2">
                <button type="button" *ngFor="let s of semestres"
                  (click)="attrForm.get('semestre')?.setValue(s)"
                  [class]="attrForm.get('semestre')?.value === s
                    ? 'flex-1 py-1.5 text-sm font-bold rounded-lg bg-indigo-600 text-white shadow-sm'
                    : 'flex-1 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50'">
                  {{s}}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Matière *</label>
              <select formControlName="matiere_id" class="form-control">
                <option [value]="null" disabled>-- Sélectionner --</option>
                <option *ngFor="let m of matieres" [value]="m.id">
                  {{m.intitule}} <span *ngIf="m.code">({{m.code}})</span>
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Volume horaire total (optionnel)</label>
              <input type="number" formControlName="heures_total" class="form-control" placeholder="Ex: 45">
            </div>

            <div class="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
              <p class="font-semibold">Note :</p>
              <p class="text-xs mt-1">L'attribution sera créée avec le statut <strong>EN_ATTENTE</strong>. L'enseignant devra accepter ou refuser depuis son espace.</p>
            </div>

            <button type="submit" [disabled]="attrForm.invalid || saving"
              class="w-full btn btn-primary flex items-center justify-center gap-2">
              <span class="spinner !border-white !border-t-transparent" *ngIf="saving" style="width:14px;height:14px;border-width:2px"></span>
              <i class="fas fa-paper-plane" *ngIf="!saving"></i>
              {{saving ? 'Envoi...' : 'Attribuer la matière'}}
            </button>
          </form>
        </div>
      </div>

      <!-- Liste des attributions -->
      <div class="lg:col-span-2">
        <!-- Filtres -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-wrap gap-3">
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" [(ngModel)]="filterStatut" (change)="load()">
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="ACCEPTEE">Acceptées</option>
            <option value="REFUSEE">Refusées</option>
          </select>
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" [(ngModel)]="filterSemestre" (change)="load()">
            <option value="">Tous semestres</option>
            <option value="S1">Semestre 1</option>
            <option value="S2">Semestre 2</option>
          </select>
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" [(ngModel)]="filterEnseignant" (change)="load()">
            <option value="">Tous enseignants</option>
            <option *ngFor="let e of enseignants" [value]="e.id">{{e.prenom}} {{e.nom}}</option>
          </select>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matière</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Semestre</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Heures</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Observation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngIf="loadingList">
                  <td colspan="6" class="py-10 text-center"><div class="spinner" style="margin:0 auto"></div></td>
                </tr>
                <tr *ngIf="!loadingList && !attributions.length">
                  <td colspan="6" class="py-10 text-center text-slate-400">
                    <i class="fas fa-inbox text-3xl mb-2 block opacity-30"></i>Aucune attribution trouvée
                  </td>
                </tr>
                <tr *ngFor="let a of attributions" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-800">{{a.enseignant_prenom}} {{a.enseignant_nom}}</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800">{{a.matiere_nom}}</div>
                    <div class="text-xs text-slate-400">{{a.matiere_code}}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">{{a.semestre}}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-600">{{a.heures_total || '-'}}h</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
                      'bg-amber-50 text-amber-700 border border-amber-100': a.statut === 'EN_ATTENTE',
                      'bg-emerald-50 text-emerald-700 border border-emerald-100': a.statut === 'ACCEPTEE',
                      'bg-rose-50 text-rose-700 border border-rose-100': a.statut === 'REFUSEE'
                    }">{{a.statut.replace('_', ' ')}}</span>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-400 italic">
                    {{a.statut === 'REFUSEE' ? (a.observation || 'Aucune raison') : '-'}}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminAttributionsComponent implements OnInit {
  enseignants: any[] = [];
  matieres: any[] = [];
  attributions: any[] = [];
  semestres = ['S1', 'S2', 'S3', 'S4'];

  attrForm: FormGroup;
  saving = false;
  loadingList = false;
  formError = '';
  successMsg = '';
  filterStatut = '';
  filterSemestre = '';
  filterEnseignant: any = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.attrForm = this.fb.group({
      enseignant_id: [null, Validators.required],
      matiere_id: [null, Validators.required],
      semestre: ['S1', Validators.required],
      heures_total: [null]
    });
  }

  ngOnInit(): void {
    this.api.getEnseignants().subscribe(e => this.enseignants = e);
    this.api.getMatieres().subscribe(m => this.matieres = m);
    this.load();
  }

  load() {
    this.loadingList = true;
    const filters: any = {};
    if (this.filterStatut) filters.statut = this.filterStatut;
    if (this.filterSemestre) filters.semestre = this.filterSemestre;
    if (this.filterEnseignant) filters.enseignant_id = this.filterEnseignant;

    this.api.getAttributions(filters).subscribe({
      next: data => { this.attributions = data; this.loadingList = false; },
      error: () => this.loadingList = false
    });
  }

  onSubmit() {
    if (this.attrForm.invalid) return;
    this.saving = true; this.formError = ''; this.successMsg = '';
    const val = this.attrForm.value;

    this.api.createAttribution({
      enseignant_id: Number(val.enseignant_id),
      matiere_id: Number(val.matiere_id),
      semestre: val.semestre,
      heures_total: val.heures_total || 0
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Attribution envoyée ! L\'enseignant peut maintenant accepter ou refuser.';
        this.attrForm.patchValue({ enseignant_id: null, matiere_id: null, heures_total: null });
        this.load();
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: err => {
        this.saving = false;
        this.formError = err.error?.message || err.error?.error || 'Erreur lors de l\'attribution';
      }
    });
  }
}
