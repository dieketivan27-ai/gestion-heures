import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GestionMatiereService } from '../../services/gestion-matiere.service';
import { Enseignant, Matiere, Attribution } from '../../models/matiere.model';
import { combineLatest, map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-admin-attributions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Attribution des Matières</h1>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Formulaire d'attribution -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow p-6 border border-gray-100 sticky top-4">
            <h2 class="text-lg font-semibold mb-4 text-indigo-700">Nouvelle Attribution</h2>
            <form [formGroup]="attributionForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Enseignant</label>
                <select formControlName="enseignantId" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500">
                  <option [value]="null" disabled>Sélectionner un enseignant</option>
                  <option *ngFor="let e of enseignants$ | async" [value]="e.id">{{ e.prenom }} {{ e.nom }}</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
                <select formControlName="semestre" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500">
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                  <option value="S4">S4</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                <select formControlName="matiereId" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500">
                  <option [value]="null" disabled>Sélectionner une matière</option>
                  <option *ngFor="let m of filteredMatieres$ | async" [value]="m.id">
                    {{ m.nom }} ({{ m.heuresParSemaine }}h/sem)
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Année Académique</label>
                <input formControlName="anneeAcademique" type="text" placeholder="Ex: 2023-2024" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500">
              </div>

              <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <div class="flex justify-between items-center text-indigo-900 font-bold">
                  <span>Total Heures:</span>
                  <span class="text-xl">{{ totalHeuresCalculated }}h</span>
                </div>
                <p class="text-[10px] text-indigo-500 mt-1 uppercase tracking-wider font-semibold">Calcul: h/semaine × 16 semaines</p>
              </div>

              <button type="submit" [disabled]="attributionForm.invalid" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition disabled:opacity-50">
                Attribuer la matière
              </button>
            </form>
          </div>
        </div>

        <!-- Liste des attributions -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white rounded-xl shadow p-4 border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-700">Historique des Attributions</h2>
            <div class="flex gap-2">
               <select [(ngModel)]="filterSemestre" (change)="applyFilters()" class="rounded-lg border-gray-300 border text-sm p-2 focus:ring-indigo-500">
                 <option value="ALL">Tous les semestres</option>
                 <option value="S1">S1</option>
                 <option value="S2">S2</option>
                 <option value="S3">S3</option>
                 <option value="S4">S4</option>
               </select>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enseignant</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matière</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observations</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let a of displayAttributions$ | async" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ getEnseignantName(a.enseignantId) }}</div>
                    <div class="text-xs text-gray-500">{{ a.anneeAcademique }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ getMatiereName(a.matiereId) }}</div>
                    <div class="text-xs text-gray-500">Semestre {{ a.semestre }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{{ a.heuresTotal }}h</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [ngClass]="{
                      'bg-yellow-100 text-yellow-800': a.statut === 'EN_ATTENTE',
                      'bg-green-100 text-green-800': a.statut === 'ACCEPTEE',
                      'bg-red-100 text-red-800': a.statut === 'REFUSEE'
                    }" class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight">
                      {{ a.statut }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500 italic">
                    {{ a.statut === 'REFUSEE' ? (a.observation || 'Aucune raison fournie') : '-' }}
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
  enseignants$ = this.matiereService.getEnseignants();
  allMatieres: Matiere[] = [];
  allEnseignants: Enseignant[] = [];
  filteredMatieres$: Observable<Matiere[]>;
  displayAttributions$: Observable<Attribution[]>;
  
  attributionForm: FormGroup;
  totalHeuresCalculated = 0;
  filterSemestre = 'ALL';

  constructor(private fb: FormBuilder, private matiereService: GestionMatiereService) {
    this.attributionForm = this.fb.group({
      enseignantId: [null, Validators.required],
      matiereId: [null, Validators.required],
      semestre: ['S1', Validators.required],
      anneeAcademique: ['2023-2024', Validators.required],
      heuresTotal: [0]
    });

    // Filtre des matières par semestre
    this.filteredMatieres$ = this.attributionForm.get('semestre')!.valueChanges.pipe(
      startWith(this.attributionForm.get('semestre')!.value),
      map(s => this.allMatieres.filter(m => m.semestre === s))
    );

    // Calcul automatique des heures
    this.attributionForm.get('matiereId')!.valueChanges.subscribe(mid => {
      const matiere = this.allMatieres.find(m => m.id === Number(mid));
      if (matiere) {
        this.totalHeuresCalculated = matiere.heuresParSemaine * 16;
        this.attributionForm.get('heuresTotal')!.setValue(this.totalHeuresCalculated);
      }
    });

    this.displayAttributions$ = this.matiereService.getAttributions();
  }

  ngOnInit(): void {
    this.matiereService.getMatieres().subscribe(m => this.allMatieres = m);
    this.matiereService.getEnseignants().subscribe(e => this.allEnseignants = e);
  }

  onSubmit() {
    if (this.attributionForm.valid) {
      const val = this.attributionForm.value;
      this.matiereService.attribuerMatiere({
        ...val,
        enseignantId: Number(val.enseignantId),
        matiereId: Number(val.matiereId)
      });
      this.attributionForm.reset({ 
        semestre: 'S1', 
        anneeAcademique: '2023-2024',
        enseignantId: null,
        matiereId: null
      });
      this.totalHeuresCalculated = 0;
    }
  }

  applyFilters() {
    this.displayAttributions$ = this.matiereService.getAttributions().pipe(
      map(atts => this.filterSemestre === 'ALL' ? atts : atts.filter(a => a.semestre === this.filterSemestre))
    );
  }

  getEnseignantName(id: number): string {
    const e = this.allEnseignants.find(x => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : 'Inconnu';
  }

  getMatiereName(id: number): string {
    const m = this.allMatieres.find(x => x.id === id);
    return m ? m.nom : 'Inconnue';
  }
}
