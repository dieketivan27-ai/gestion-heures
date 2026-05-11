import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Enseignant, Departement, AnneeAcademique, Matiere } from '../../core/models/models';
import { AvatarComponent } from '../../shared/components/avatar.component';

@Component({
  selector: 'app-enseignants',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, AvatarComponent, NgSelectModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-users text-blue-600"></i> Enseignants
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">{{filtered.length}} enseignant(s) enregistré(s)</p>
      </div>
      <div class="flex items-center gap-2">
        <button *ngIf="isRH" (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm shadow-blue-200">
          <i class="fas fa-plus"></i> Ajouter
        </button>
      </div>
    </div>

    <!-- FILTRES -->
    <div *ngIf="!isTeacher" class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
      <div class="flex gap-3 flex-wrap">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="selectedAnnee" (change)="load()">
          <option value="ALL">Toutes les années</option>
          <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
        </select>
        <input class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:200px" placeholder="🔍 Rechercher..." [(ngModel)]="search" (input)="applyFilter()">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="filterGrade" (change)="applyFilter()">
          <option value="">Tous les grades</option>
          <option value="Assistant">Assistant</option>
          <option value="Maitre-Assistant">Maître-Assistant</option>
          <option value="Professeur">Professeur</option>
          <option value="Autres">Autres</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:140px" [(ngModel)]="filterStatut" (change)="applyFilter()">
          <option value="">Tous statuts</option>
          <option value="Permanent">Permanent</option>
          <option value="Vacataire">Vacataire</option>
        </select>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style="width:160px" [(ngModel)]="filterDept" (change)="applyFilter()">
          <option value="">Tous départements</option>
          <option *ngFor="let d of departements" [value]="d.id">{{d.nom}}</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matricule</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom & Prénom</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Département</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">CM</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">TD</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">TP</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="10" class="px-4 py-10 text-center">
                <div class="spinner" style="margin:0 auto"></div>
              </td>
            </tr>
            <tr *ngIf="!loading && !filtered.length">
              <td colspan="10" class="px-4 py-12 text-center text-slate-400">
                <i class="fas fa-users text-4xl mb-3 opacity-30 block"></i>Aucun enseignant trouvé
              </td>
            </tr>
            <tr *ngFor="let e of filtered" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <code class="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{{e.matricule || '-'}}</code>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <app-avatar [url]="getAvatarUrl(e.avatar_url)" [name]="e.prenom + ' ' + e.nom" size="sm"></app-avatar>
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-800 truncate">{{e.nom}} {{e.prenom}}</div>
                    <div class="text-xs text-slate-400 truncate">{{e.email}}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{{e.grade}}</span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                  [ngClass]="e.statut==='Permanent' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{e.statut}}</span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">
                <div class="mb-1">{{e.departement_nom || '-'}}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100" *ngFor="let matiere of e.matieres">
                    {{ matiere.intitule }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-slate-600">{{e.total_cm | number:'1.0-1'}}</td>
              <td class="px-4 py-3 text-slate-600">{{e.total_td | number:'1.0-1'}}</td>
              <td class="px-4 py-3 text-slate-600">{{e.total_tp | number:'1.0-1'}}</td>
              <td class="px-4 py-3 font-bold text-slate-800">{{e.total_heures | number:'1.0-1'}}h</td>
              <td class="px-4 py-3">
                <div class="flex gap-1.5">
                  <a [routerLink]="['/enseignants', e.id]"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Voir détail">
                    <i class="fas fa-eye text-xs"></i>
                  </a>
                  <button *ngIf="isRH" (click)="openModal(e)"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Modifier">
                    <i class="fas fa-edit text-xs"></i>
                  </button>
                  <button *ngIf="isAdmin" (click)="confirmDelete(e)"
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

    <!-- MODAL ENSEIGNANT -->
    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">{{editing ? 'Modifier' : 'Ajouter'}} un enseignant</span>
          <button class="btn btn-outline btn-icon btn-sm" (click)="showModal=false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div *ngIf="formError" class="alert alert-danger mb-4">
            <i class="fas fa-exclamation-circle"></i> {{formError}}
          </div>
          <form [formGroup]="form" class="form-grid">
            <div class="form-group">
              <label class="form-label text-slate-500">Matricule</label>
              <input class="form-control" formControlName="matricule" placeholder="ENS001">
            </div>
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input class="form-control" formControlName="nom" [class.border-red-300]="submitted && form.get('nom')?.invalid">
            </div>
            <div class="form-group">
              <label class="form-label">Prénom *</label>
              <input class="form-control" formControlName="prenom" [class.border-red-300]="submitted && form.get('prenom')?.invalid">
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input type="email" class="form-control" formControlName="email" [class.border-red-300]="submitted && form.get('email')?.invalid">
            </div>
            <div class="form-group">
              <label class="form-label">Téléphone</label>
              <input class="form-control" formControlName="telephone" placeholder="+225 ...">
            </div>
            <div class="form-group">
              <label class="form-label">Grade *</label>
              <select class="form-control" formControlName="grade">
                <option value="Assistant">Assistant</option>
                <option value="Maitre-Assistant">Maître-Assistant</option>
                <option value="Professeur">Professeur</option>
                <option value="Autres">Autres</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Statut *</label>
              <select class="form-control" formControlName="statut" (change)="onStatutChange()">
                <option value="Permanent">Permanent</option>
                <option value="Vacataire">Vacataire</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Département</label>
              <select class="form-control" formControlName="departement_id">
                <option [value]="null">-- Aucun --</option>
                <option *ngFor="let d of departements" [value]="d.id">{{d.nom}}</option>
              </select>
            </div>
            <div class="form-group col-span-full">
              <label class="form-label">Matières</label>
              <ng-select
                [items]="matieresList"
                bindLabel="intitule"
                bindValue="id"
                [multiple]="true"
                placeholder="Sélectionner une ou plusieurs matières"
                formControlName="matieres"
                class="custom-ng-select">
              </ng-select>
            </div>
            <div class="form-group">
              <label class="form-label">Heures contractuelles</label>
              <input type="number" class="form-control" formControlName="heures_contractuelles">
            </div>
            <div class="grid grid-cols-3 gap-3 col-span-full mt-2 pt-4 border-t border-slate-100">
               <div class="form-group">
                 <label class="form-label">Taux CM (FCFA/h)</label>
                 <input type="number" class="form-control" formControlName="taux_horaire_cm">
               </div>
               <div class="form-group">
                 <label class="form-label">Taux TD (FCFA/h)</label>
                 <input type="number" class="form-control" formControlName="taux_horaire_td">
               </div>
               <div class="form-group">
                 <label class="form-label">Taux TP (FCFA/h)</label>
                 <input type="number" class="form-control" formControlName="taux_horaire_tp">
               </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="showModal=false">Annuler</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">
            <span class="spinner !border-white !border-t-transparent" *ngIf="saving" style="width:14px;height:14px;border-width:2px"></span>
            <i class="fas fa-save" *ngIf="!saving"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL SUCCÈS -->
    <div class="modal-overlay" *ngIf="showSuccessModal">
      <div class="modal max-w-md scale-in-center" (click)="$event.stopPropagation()">
        <div class="p-8 md:p-10 text-center">
          <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-emerald-50/50">
            <i class="fas fa-check text-3xl"></i>
          </div>
          <h3 class="text-2xl font-extrabold text-slate-800 mb-3">Enseignant créé !</h3>
          
          <div *ngIf="tempCredentials?.emailSent" class="bg-emerald-50/80 text-emerald-700 text-sm rounded-xl p-4 mb-6 border border-emerald-100">
            Un email de bienvenue a été envoyé à <strong>{{tempCredentials?.email}}</strong>.
          </div>
          
          <div *ngIf="!tempCredentials?.emailSent" class="bg-amber-50/80 text-amber-800 text-sm rounded-xl p-4 mb-6 border border-amber-200 shadow-sm">
            <p class="flex items-center justify-center gap-2 mb-2 font-bold text-amber-600">
              <i class="fas fa-exclamation-triangle"></i> L'envoi de l'email a échoué.
            </p>
            Communiquez ces identifiants à l'enseignant :
          </div>

          <div class="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-6 text-left mb-8 shadow-inner">
            <div class="mb-5 border-b border-slate-200/50 pb-4">
              <label class="block text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1.5">Identifiant</label>
              <div class="font-bold text-slate-700">{{tempCredentials?.email}}</div>
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1.5">Mot de passe temporaire</label>
              <div class="font-mono font-extrabold text-3xl text-blue-600 tracking-widest">{{tempCredentials?.password}}</div>
              <p class="text-[11px] text-red-500 mt-3 font-semibold flex items-center gap-1.5"><i class="fas fa-shield-alt"></i> Changement obligatoire au premier login.</p>
            </div>
          </div>

          <button class="btn btn-primary w-full py-3.5 text-base" (click)="showSuccessModal=false">
            Terminer
          </button>
        </div>
      </div>
    </div>
  `
})
export class EnseignantsComponent implements OnInit {
  enseignants: Enseignant[] = [];
  filtered: Enseignant[] = [];
  departements: Departement[] = [];
  annees: AnneeAcademique[] = [];
  matieresList: Matiere[] = [];
  selectedAnnee: number | null = null;
  loading = true;
  showModal = false;
  editing: Enseignant | null = null;
  form!: FormGroup;
  saving = false;
  formError = '';
  submitted = false;
  search = ''; filterGrade = ''; filterStatut = ''; filterDept: any = '';
  showSuccessModal = false;
  tempCredentials: any = null;

  constructor(private api: ApiService, private auth: AuthService, private fb: FormBuilder) {
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      matricule: [''],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      grade: ['Assistant', Validators.required],
      statut: ['Permanent', Validators.required],
      departement_id: [null],
      heures_contractuelles: [192],
      taux_horaire_cm: [0],
      taux_horaire_td: [0],
      taux_horaire_tp: [0],
      matieres: [[]]
    });
  }

  get isRH() { return this.auth.isRH; }
  get isAdmin() { return this.auth.isAdmin; }
  get isTeacher() { return this.auth.currentUser?.role === 'enseignant'; }

  getAvatarUrl(path: string | undefined) {
    return this.auth.getAvatarUrl(path);
  }

  ngOnInit() {
    this.api.getDepartements().subscribe(d => this.departements = d);
    this.api.getMatieres().subscribe(m => this.matieresList = m);
    this.api.getAnnees().subscribe(a => {
      this.annees = a;
      const active = a.find(x => x.is_active);
      this.selectedAnnee = active?.id || a[0]?.id || null;
      this.load();
    });
  }

  load() {
    this.loading = true;
    this.api.getEnseignants(this.selectedAnnee || undefined).subscribe({
      next: d => { this.enseignants = d; this.applyFilter(); this.loading = false; },
      error: () => this.loading = false
    });
  }

  applyFilter() {
    this.filtered = this.enseignants.filter(e => {
      const s = this.search.toLowerCase();
      return (!s || `${e.nom} ${e.prenom} ${e.matricule} ${e.email}`.toLowerCase().includes(s))
        && (!this.filterGrade || e.grade === this.filterGrade)
        && (!this.filterStatut || e.statut === this.filterStatut)
        && (!this.filterDept || e.departement_id == this.filterDept);
    });
  }

  openModal(e?: Enseignant) {
    this.editing = e || null;
    this.formError = ''; this.submitted = false;

    if (e) {
      this.form.patchValue({
        matricule: e.matricule || '',
        nom: e.nom || '',
        prenom: e.prenom || '',
        email: e.email || '',
        telephone: e.telephone || '',
        grade: e.grade || 'Assistant',
        statut: e.statut || 'Permanent',
        departement_id: e.departement_id || null,
        heures_contractuelles: e.heures_contractuelles ?? 192,
        taux_horaire_cm: e.taux_horaire_cm || 0,
        taux_horaire_td: e.taux_horaire_td || 0,
        taux_horaire_tp: e.taux_horaire_tp || 0,
        matieres: e.matieres ? e.matieres.map(m => m.id) : []
      });
    } else {
      this.form.reset({
        grade: 'Assistant',
        statut: 'Permanent',
        taux_horaire_cm: 0,
        taux_horaire_td: 0,
        taux_horaire_tp: 0,
        heures_contractuelles: 192,
        matieres: []
      });
    }

    this.showModal = true;
  }

  onStatutChange() {
    const statut = this.form.get('statut')?.value;
    const heures = this.form.get('heures_contractuelles')?.value;

    if (statut === 'Vacataire') {
      this.form.get('heures_contractuelles')?.setValue(0);
    } else if (statut === 'Permanent' && (!heures || heures === 0)) {
      this.form.get('heures_contractuelles')?.setValue(192);
    }
  }

  closeModal(e: any) { if (e.target === e.currentTarget) this.showModal = false; }

  save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.formError = 'Veuillez remplir les champs obligatoires correctement';
      return;
    }
    this.saving = true; this.formError = '';
    const formValue = this.form.value;

    const req = this.editing
      ? this.api.updateEnseignant(this.editing.id, formValue)
      : this.api.createEnseignant(formValue);
    req.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.showModal = false;
        this.load();

        // Afficher les identifiants si c'est une création
        if (!this.editing) {
          this.tempCredentials = {
            email: this.form.value.email,
            password: res.tempPassword || '******',
            emailSent: res.emailSent
          };
          this.showSuccessModal = true;
        }
      },
      error: err => {
        this.saving = false;
        this.formError = err.error?.error || err.error?.message || 'Erreur lors de l\'enregistrement';
      }
    });
  }

  confirmDelete(e: Enseignant) {
    if (confirm(`Supprimer ${e.nom} ${e.prenom} ?`)) {
      this.api.deleteEnseignant(e.id).subscribe(() => this.load());
    }
  }
}
