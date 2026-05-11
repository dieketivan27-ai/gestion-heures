import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GestionMatiereService } from '../../services/gestion-matiere.service';
import { Matiere } from '../../models/matiere.model';

@Component({
  selector: 'app-admin-matieres',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Gestion des Matières</h1>
        <button (click)="toggleForm()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition shadow-md">
          {{ showForm ? 'Annuler' : 'Ajouter une matière' }}
        </button>
      </div>

      <!-- Formulaire d'ajout/modification -->
      <div *ngIf="showForm" class="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
        <h2 class="text-lg font-semibold mb-4">{{ editingId ? 'Modifier la' : 'Nouvelle' }} matière</h2>
        <form [formGroup]="matiereForm" (ngSubmit)="onSubmit()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input formControlName="code" type="text" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input formControlName="nom" type="text" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
            <select formControlName="semestre" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="S4">S4</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Heures/Semaine</label>
            <input formControlName="heuresParSemaine" type="number" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <input formControlName="niveau" type="text" placeholder="Ex: Licence 1" class="w-full rounded-lg border-gray-300 border p-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div class="md:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
            <button type="button" (click)="resetForm()" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Réinitialiser</button>
            <button type="submit" [disabled]="matiereForm.invalid" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {{ editingId ? 'Mettre à jour' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Tableau des matières -->
      <div class="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semestre</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H/Semaine</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let m of matieres$ | async" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">{{ m.code }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ m.nom }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{{ m.semestre }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ m.heuresParSemaine }}h</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ m.niveau }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button (click)="editMatiere(m)" class="text-indigo-600 hover:text-indigo-900 mr-3">Modifier</button>
                <button (click)="deleteMatiere(m.id)" class="text-red-600 hover:text-red-900">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminMatieresComponent implements OnInit {
  matieres$ = this.matiereService.getMatieres();
  matiereForm: FormGroup;
  showForm = false;
  editingId: number | null = null;

  constructor(private fb: FormBuilder, private matiereService: GestionMatiereService) {
    this.matiereForm = this.fb.group({
      code: ['', Validators.required],
      nom: ['', Validators.required],
      semestre: ['S1', Validators.required],
      heuresParSemaine: [3, [Validators.required, Validators.min(1)]],
      niveau: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  onSubmit() {
    if (this.matiereForm.valid) {
      if (this.editingId) {
        this.matiereService.updateMatiere(this.editingId, this.matiereForm.value);
      } else {
        this.matiereService.addMatiere(this.matiereForm.value);
      }
      this.resetForm();
      this.showForm = false;
    }
  }

  editMatiere(m: Matiere) {
    this.editingId = m.id;
    this.matiereForm.patchValue(m);
    this.showForm = true;
  }

  deleteMatiere(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) {
      this.matiereService.deleteMatiere(id);
    }
  }

  resetForm() {
    this.matiereForm.reset({ semestre: 'S1', heuresParSemaine: 3 });
    this.editingId = null;
  }
}
