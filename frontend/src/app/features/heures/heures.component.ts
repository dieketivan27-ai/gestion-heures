import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { HeureEffectuee, Enseignant, Matiere, AnneeAcademique } from '../../core/models/models';

@Component({
  selector: 'app-heures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-clock text-blue-600"></i> Heures effectuées
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">{{filtered.length}} séance(s) enregistrée(s)</p>
      </div>
      <button *ngIf="isRH" (click)="openModal()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
        <i class="fas fa-plus"></i> Saisir des heures
      </button>
    </div>

    <!-- FILTRES -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
      <div class="flex gap-3 flex-wrap">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:200px" [(ngModel)]="filterAnnee" (change)="load()">
          <option value="ALL">Toutes les années</option>
          <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="filterType" (change)="load()">
          <option value="">Tous types</option>
          <option value="CM">CM</option>
          <option value="TD">TD</option>
          <option value="TP">TP</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="filterValide" (change)="load()">
          <option value="">Tous statuts</option>
          <option value="true">Validés</option>
          <option value="false">En attente</option>
        </select>
        <select *ngIf="isRH" class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:180px" [(ngModel)]="filterEnseignant" (change)="load()">
          <option value="">Tous enseignants</option>
          <option *ngFor="let e of enseignants" [value]="e.id">{{e.nom}} {{e.prenom}}</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matière</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durée</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Éq. CM</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Salle</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Compl.</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="10" class="px-4 py-10 text-center"><div class="spinner" style="margin:0 auto"></div></td>
            </tr>
            <tr *ngIf="!loading && !filtered.length">
              <td colspan="10" class="px-4 py-12 text-center text-slate-400">
                <i class="fas fa-clock text-4xl mb-3 opacity-30 block"></i>Aucune heure trouvée
              </td>
            </tr>
            <tr *ngFor="let h of filtered" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3 text-slate-600">{{h.date_cours | date:'dd/MM/yyyy'}}</td>
              <td class="px-4 py-3 font-semibold text-slate-800">{{h.nom}} {{h.prenom}}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{h.matiere_nom || '-'}}</td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                  [ngClass]="typeClass(h.type_heure)">{{h.type_heure}}</span>
              </td>
              <td class="px-4 py-3 font-bold text-slate-800">{{h.duree}}h</td>
              <td class="px-4 py-3 text-slate-400 text-xs">{{h.duree_equivalente | number:'1.0-2'}}h</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{h.salle || '-'}}</td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                  [ngClass]="h.is_complementaire ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'">
                  {{h.is_complementaire ? '+ Comp.' : 'Normal'}}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  [ngClass]="h.valide ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                  <i class="fas" [ngClass]="h.valide ? 'fa-check' : 'fa-hourglass-half'"></i>
                  {{h.valide ? 'Validé' : 'En attente'}}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1.5">
                  <button *ngIf="isRH && !h.valide" (click)="valider(h)"
                    class="p-1.5 rounded-lg border border-emerald-100 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors" title="Valider">
                    <i class="fas fa-check text-xs"></i>
                  </button>
                  <button *ngIf="isRH" (click)="openModal(h)"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Modifier">
                    <i class="fas fa-edit text-xs"></i>
                  </button>
                  <button *ngIf="isRH" (click)="confirmDelete(h)"
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
          <span class="modal-title">{{editing ? 'Modifier' : 'Saisir'}} des heures</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger mb-4" *ngIf="formError">
            <i class="fas fa-exclamation-circle text-red-500"></i> {{formError}}
          </div>
          
          <div class="form-grid">
            <div class="form-group" *ngIf="!editing">
              <label class="form-label text-slate-500">Année académique *</label>
              <select class="form-control" [(ngModel)]="form.annee_academique_id">
                <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
              </select>
            </div>
            
            <div class="form-group" *ngIf="!editing">
              <label class="form-label">Enseignant *</label>
              <select class="form-control" [(ngModel)]="form.enseignant_id">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let e of enseignants" [value]="e.id">{{e.nom}} {{e.prenom}}</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Matière</label>
              <select class="form-control" [(ngModel)]="form.matiere_id">
                <option [value]="null">-- Aucune --</option>
                <option *ngFor="let m of matieres" [value]="m.id">{{m.intitule}} ({{m.niveau}})</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Date du cours *</label>
              <input type="date" name="date_cours" class="form-control" [(ngModel)]="form.date_cours" (click)="$event.stopPropagation()">
            </div>
            
            <div class="form-group">
              <label class="form-label">Type d'heure *</label>
              <select name="type_heure" class="form-control" [(ngModel)]="form.type_heure">
                <option value="CM">CM - Cours Magistral</option>
                <option value="TD">TD - Travaux Dirigés</option>
                <option value="TP">TP - Travaux Pratiques</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Durée (heures) *</label>
              <div class="relative">
                <input type="number" name="duree" step="0.5" min="0.5" class="form-control pr-8" [(ngModel)]="form.duree">
                <span class="absolute right-3 top-2 text-slate-400 text-xs py-0.5">h</span>
              </div>
            </div>
            
            <div class="form-group col-span-full">
              <label class="form-label">Salle</label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-slate-400 text-xs"><i class="fas fa-door-open"></i></span>
                <input name="salle" class="form-control pl-8" [(ngModel)]="form.salle" placeholder="Ex: Amphi A, Salle 101...">
              </div>
            </div>

            <div class="form-group col-span-full">
              <label class="form-label">Observations</label>
              <textarea name="observations" class="form-control resize-none" [(ngModel)]="form.observations" rows="2" placeholder="Détails optionnels..."></textarea>
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
export class HeuresComponent implements OnInit {
  heures: HeureEffectuee[] = [];
  filtered: HeureEffectuee[] = [];
  enseignants: Enseignant[] = [];
  matieres: Matiere[] = [];
  annees: AnneeAcademique[] = [];
  loading = true;
  showModal = false;
  editing: HeureEffectuee | null = null;
  form: any = {};
  saving = false;
  formError = '';
  filterAnnee: any = null;
  filterType = ''; filterValide = ''; filterEnseignant: any = '';

  constructor(private api: ApiService, private auth: AuthService) {}
  get isRH() { return this.auth.isRH; }

  ngOnInit() {
    this.api.getAnnees().subscribe(a => {
      this.annees = a;
      const active = a.find(x => x.is_active);
      this.filterAnnee = active?.id || null;
      
      const user = this.auth.currentUser;
      if (user && user.role === 'enseignant') {
        this.filterEnseignant = user.enseignant_id;
      }
      
      this.load();
    });
    this.api.getEnseignants().subscribe(e => this.enseignants = e);
    this.api.getMatieres().subscribe(m => this.matieres = m);
  }

  load() {
    this.loading = true;
    const filters: any = {};
    if (this.filterAnnee) filters.annee_id = this.filterAnnee;
    if (this.filterType) filters.type_heure = this.filterType;
    if (this.filterValide !== '') filters.valide = this.filterValide;
    if (this.filterEnseignant) filters.enseignant_id = this.filterEnseignant;

    this.api.getHeures(filters).subscribe({ 
      next: d => { 
        this.heures = d; 
        this.applyFilter(); 
        this.loading = false; 
      }, 
      error: () => this.loading = false 
    });
  }

  applyFilter() {
    this.filtered = this.heures;
  }

  openModal(h?: HeureEffectuee) {
    this.editing = h || null;
    const active = this.annees.find(a => a.is_active);
    const today = new Date().toISOString().split('T')[0];
    this.form = h ? { ...h } : { 
      date_cours: today, 
      type_heure: 'CM', 
      duree: 2, 
      annee_academique_id: active?.id || this.annees[0]?.id, 
      enseignant_id: null, 
      matiere_id: null 
    };
    this.formError = ''; this.showModal = true;
  }

  closeModal(e: any) { if (e.target === e.currentTarget) this.showModal = false; }

  save() {
    if (!this.form.date_cours || !this.form.type_heure || !this.form.duree) { this.formError = 'Champs obligatoires manquants'; return; }
    if (!this.editing && !this.form.enseignant_id) { this.formError = 'Sélectionnez un enseignant'; return; }
    this.saving = true; this.formError = '';
    const req = this.editing ? this.api.updateHeure(this.editing.id, this.form) : this.api.createHeure(this.form);
    req.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.load(); },
      error: err => { 
        this.saving = false; 
        this.formError = err.error?.error || err.error?.message || 'Une erreur est survenue'; 
      }
    });
  }

  valider(h: HeureEffectuee) {
    this.api.validerHeure(h.id).subscribe(() => this.load());
  }

  confirmDelete(h: HeureEffectuee) {
    if (confirm('Supprimer cette entrée ?')) this.api.deleteHeure(h.id).subscribe(() => this.load());
  }

  typeClass(t: string): string { return { CM: 'bg-blue-50 text-blue-700', TD: 'bg-emerald-50 text-emerald-700', TP: 'bg-amber-50 text-amber-700' }[t] || 'bg-slate-100 text-slate-500'; }
}
