import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Parametre, Departement, Filiere, AnneeAcademique } from '../../core/models/models';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-cog text-blue-600"></i> Paramètres
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">Configuration du système</p>
      </div>
    </div>

    <div class="grid-2 mb-6">
      <!-- Paramètres système -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-sliders-h text-blue-500"></i> Paramètres généraux</span>
        </div>
        <div class="card-body">
          <div *ngFor="let p of parametres" class="form-group border-b border-slate-50 last:border-0 pb-3 last:pb-0">
            <label class="form-label text-slate-500">{{p.description || p.cle}}</label>
            <div class="flex gap-2">
              <input class="form-control" [(ngModel)]="p.valeur">
              <button class="btn btn-primary btn-sm" (click)="saveParam(p)"><i class="fas fa-save"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Années académiques -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-calendar text-blue-500"></i> Années académiques</span>
          <button class="btn btn-primary btn-sm" (click)="openAnneeModal()"><i class="fas fa-plus"></i></button>
        </div>
        <div class="card-body p-0">
          <div class="table-wrapper">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Libellé</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Période</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let a of annees" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-bold text-slate-800">{{a.libelle}}</td>
                  <td class="px-4 py-3 text-xs text-slate-500">
                    {{a.date_debut | date:'dd/MM/yyyy'}} - {{a.date_fin | date:'dd/MM/yyyy'}}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="badge" [ngClass]="a.is_active ? 'badge-green' : 'badge-gray'">
                        {{a.is_active ? 'Active' : 'Inactive'}}
                      </span>
                      <button *ngIf="!a.is_active" class="p-1 px-2 rounded border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all text-[10px]" (click)="activerAnnee(a)" title="Activer">
                        <i class="fas fa-play"></i>
                      </button>
                      <button *ngIf="!a.is_active" class="p-1 px-2 rounded border border-red-50 text-red-300 hover:text-red-500 hover:bg-red-50 transition-all text-[10px]" (click)="deleteAnnee(a)" title="Supprimer">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2 mb-6">
      <!-- Départements -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-building text-blue-500"></i> Départements</span>
          <button class="btn btn-primary btn-sm" (click)="openDeptModal()"><i class="fas fa-plus"></i></button>
        </div>
        <div class="card-body p-0">
          <div class="table-wrapper">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let d of departements" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3"><code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{{d.code}}</code></td>
                  <td class="px-4 py-3 font-medium text-slate-700">{{d.nom}}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                      <button class="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" (click)="openDeptModal(d)"><i class="fas fa-edit text-xs"></i></button>
                      <button class="p-1.5 rounded-lg border border-red-50 text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors" (click)="deleteDept(d)"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Filières -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-sitemap text-blue-500"></i> Filières</span>
          <button class="btn btn-primary btn-sm" (click)="openFiliereModal()"><i class="fas fa-plus"></i></button>
        </div>
        <div class="card-body p-0">
          <div class="table-wrapper">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Dépt.</th>
                  <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let f of filieres" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-700">{{f.nom}}</td>
                  <td class="px-4 py-3 text-xs text-slate-400">{{f.departement_nom || '-'}}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                      <button class="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" (click)="openFiliereModal(f)"><i class="fas fa-edit text-xs"></i></button>
                      <button class="p-1.5 rounded-lg border border-red-50 text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors" (click)="deleteFiliere(f)"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div class="modal-overlay" *ngIf="showDeptModal" (click)="closeDeptModal($event)">
      <div class="modal max-w-md" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">{{editingDept ? 'Modifier' : 'Ajouter'}} département</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showDeptModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body space-y-4">
          <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" [(ngModel)]="deptForm.nom" placeholder="Ex: Informatique"></div>
          <div class="form-group"><label class="form-label text-slate-500">Code *</label><input class="form-control" [(ngModel)]="deptForm.code" placeholder="Ex: INFO"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="showDeptModal=false">Annuler</button>
          <button class="btn btn-primary" (click)="saveDept()"><i class="fas fa-save mr-2"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showFiliereModal" (click)="closeFiliereModal($event)">
      <div class="modal max-w-md" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">{{editingFiliere ? 'Modifier' : 'Ajouter'}} filière</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showFiliereModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body space-y-4">
          <div class="form-group"><label class="form-label">Nom *</label><input class="form-control" [(ngModel)]="filiereForm.nom" placeholder="Ex: Génie Logiciel"></div>
          <div class="form-group"><label class="form-label text-slate-500">Code *</label><input class="form-control" [(ngModel)]="filiereForm.code" placeholder="Ex: GL"></div>
          <div class="form-group">
            <label class="form-label">Département</label>
            <select class="form-control" [(ngModel)]="filiereForm.departement_id">
              <option [value]="null">-- Aucun --</option>
              <option *ngFor="let d of departements" [value]="d.id">{{d.nom}}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="showFiliereModal=false">Annuler</button>
          <button class="btn btn-primary" (click)="saveFiliere()"><i class="fas fa-save mr-2"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showAnneeModal" (click)="closeAnneeModal($event)">
      <div class="modal max-w-md" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">Nouvelle année académique</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showAnneeModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body space-y-4">
          <div class="form-group"><label class="form-label">Libellé *</label><input class="form-control" [(ngModel)]="anneeForm.libelle" placeholder="Ex: 2025-2026"></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group"><label class="form-label text-slate-500">Début *</label><input type="date" name="date_debut" class="form-control" [(ngModel)]="anneeForm.date_debut" (click)="$event.stopPropagation()"></div>
            <div class="form-group"><label class="form-label text-slate-500">Fin *</label><input type="date" name="date_fin" class="form-control" [(ngModel)]="anneeForm.date_fin" (click)="$event.stopPropagation()"></div>
          </div>
          <label class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-blue-50/50 transition-colors">
            <input type="checkbox" [(ngModel)]="anneeForm.is_active" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
            <span class="text-sm font-medium text-slate-700">Définir comme année active</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="showAnneeModal=false">Annuler</button>
          <button class="btn btn-primary" (click)="saveAnnee()"><i class="fas fa-save mr-2"></i> Créer l'année</button>
        </div>
      </div>
    </div>
  `
})
export class ParametresComponent implements OnInit {
  parametres: Parametre[] = [];
  departements: Departement[] = [];
  filieres: Filiere[] = [];
  annees: AnneeAcademique[] = [];
  showDeptModal = false; editingDept: Departement | null = null; deptForm: any = {};
  showFiliereModal = false; editingFiliere: Filiere | null = null; filiereForm: any = {};
  showAnneeModal = false; anneeForm: any = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.api.getParametres().subscribe(p => this.parametres = p);
    this.api.getDepartements().subscribe(d => this.departements = d);
    this.api.getFilieres().subscribe(f => this.filieres = f);
    this.api.getAnnees().subscribe(a => this.annees = a);
  }

  saveParam(p: Parametre) {
    this.api.updateParametre(p.cle, p.valeur).subscribe({
      next: () => alert('Paramètre sauvegardé'),
      error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
    });
  }

  openDeptModal(d?: Departement) { this.editingDept = d || null; this.deptForm = d ? {...d} : {}; this.showDeptModal = true; }
  closeDeptModal(e: any) { if (e.target === e.currentTarget) this.showDeptModal = false; }
  saveDept() {
    const req = this.editingDept ? this.api.updateDepartement(this.editingDept.id, this.deptForm) : this.api.createDepartement(this.deptForm);
    req.subscribe({
      next: () => { this.showDeptModal = false; this.api.getDepartements().subscribe(d => this.departements = d); },
      error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
    });
  }
  deleteDept(d: Departement) { if (confirm(`Supprimer ${d.nom} ?`)) this.api.deleteDepartement(d.id).subscribe(() => this.api.getDepartements().subscribe(x => this.departements = x)); }

  openFiliereModal(f?: Filiere) { this.editingFiliere = f || null; this.filiereForm = f ? {...f} : { departement_id: null }; this.showFiliereModal = true; }
  closeFiliereModal(e: any) { if (e.target === e.currentTarget) this.showFiliereModal = false; }
  saveFiliere() {
    const req = this.editingFiliere ? this.api.updateFiliere(this.editingFiliere.id, this.filiereForm) : this.api.createFiliere(this.filiereForm);
    req.subscribe({
      next: () => { this.showFiliereModal = false; this.api.getFilieres().subscribe(f => this.filieres = f); },
      error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
    });
  }
  deleteFiliere(f: Filiere) { if (confirm(`Supprimer ${f.nom} ?`)) this.api.deleteFiliere(f.id).subscribe(() => this.api.getFilieres().subscribe(x => this.filieres = x)); }

  openAnneeModal() { this.anneeForm = { is_active: false }; this.showAnneeModal = true; }
  closeAnneeModal(e: any) { if (e.target === e.currentTarget) this.showAnneeModal = false; }
  saveAnnee() { 
    this.api.createAnnee(this.anneeForm).subscribe({
      next: () => { this.showAnneeModal = false; this.api.getAnnees().subscribe(a => this.annees = a); },
      error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
    });
  }
  activerAnnee(a: AnneeAcademique) {
    if (confirm(`Activer l'année ${a.libelle} ? Cela désactivera l'année actuelle.`)) {
      this.api.activerAnnee(a.id).subscribe({
        next: () => this.api.getAnnees().subscribe(x => this.annees = x),
        error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
      });
    }
  }

  deleteAnnee(a: AnneeAcademique) {
    if (confirm(`Supprimer l'année académique ${a.libelle} ?`)) {
      this.api.deleteAnnee(a.id).subscribe({
        next: () => this.api.getAnnees().subscribe(x => this.annees = x),
        error: err => alert('Erreur: ' + (err.error?.error || err.error?.message || 'Inconnue'))
      });
    }
  }
}
