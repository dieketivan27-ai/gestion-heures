import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GestionMatiereService } from '../../services/gestion-matiere.service';
import { Attribution, Matiere } from '../../models/matiere.model';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-enseignant-attributions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Mes Attributions de Matières</h1>

      <!-- Navigation par Semestre -->
      <div class="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button *ngFor="let s of semestres" 
          (click)="selectedSemestre = s"
          [ngClass]="selectedSemestre === s ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          class="flex-1 py-4 px-1 text-center border-b-2 font-bold text-sm transition-all uppercase tracking-widest">
          Semestre {{ s }}
        </button>
      </div>

      <!-- Liste des attributions pour le semestre sélectionné -->
      <div class="space-y-4">
        <div *ngIf="(getFilteredAttributions() | async)?.length === 0" class="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
          <p class="text-gray-500">Aucune attribution pour le semestre {{ selectedSemestre }}</p>
        </div>

        <div *ngFor="let a of getFilteredAttributions() | async" class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden group">
          <div class="p-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="text-xl font-bold text-gray-900">{{ getMatiereName(a.matiereId) }}</h3>
                <span [ngClass]="{
                  'bg-yellow-100 text-yellow-800': a.statut === 'EN_ATTENTE',
                  'bg-green-100 text-green-800': a.statut === 'ACCEPTEE',
                  'bg-red-100 text-red-800': a.statut === 'REFUSEE'
                }" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {{ a.statut }}
                </span>
              </div>
              <p class="text-gray-500 text-sm flex items-center gap-4">
                <span><i class="far fa-calendar-alt mr-1"></i> {{ a.anneeAcademique }}</span>
                <span class="font-bold text-indigo-600"><i class="far fa-clock mr-1"></i> {{ a.heuresTotal }} heures totales</span>
              </p>
            </div>

            <div class="flex items-center gap-3">
              <!-- Actions pour EN_ATTENTE -->
              <ng-container *ngIf="a.statut === 'EN_ATTENTE'">
                <button (click)="onAccepter(a.id)" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition shadow-lg shadow-green-100">
                  Accepter
                </button>
                <button (click)="openRefusal(a.id)" class="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-bold transition shadow-lg shadow-red-100">
                  Refuser
                </button>
              </ng-container>
              
              <!-- Date de réponse pour les autres -->
              <div *ngIf="a.statut !== 'EN_ATTENTE'" class="text-right">
                <p class="text-[10px] uppercase text-gray-400 font-bold">Répondu le</p>
                <p class="text-sm font-medium text-gray-600">{{ a.dateReponse | date:'dd/MM/yyyy' }}</p>
              </div>
            </div>
          </div>

          <!-- Section Refus (Textarea) -->
          <div *ngIf="refusingId === a.id" class="px-6 pb-6 pt-0 border-t border-gray-50 bg-red-50/30">
            <div class="mt-4">
              <label class="block text-sm font-bold text-red-700 mb-2">Motif du refus (Obligatoire)</label>
              <textarea [(ngModel)]="refusalReason" rows="3" 
                class="w-full rounded-xl border-red-200 border p-3 focus:ring-red-500 focus:border-red-500 shadow-inner"
                placeholder="Veuillez expliquer pourquoi vous refusez cette attribution..."></textarea>
              <div class="flex justify-end gap-2 mt-4">
                <button (click)="refusingId = null" class="px-4 py-2 text-gray-600 font-bold">Annuler</button>
                <button (click)="onRefuser(a.id)" [disabled]="!refusalReason.trim()" 
                  class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition shadow-lg shadow-red-100">
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>

          <!-- Observation si refusé -->
          <div *ngIf="a.statut === 'REFUSEE' && a.observation" class="px-6 py-4 bg-gray-50 border-t border-gray-100 italic text-gray-600 text-sm">
            <span class="font-bold text-red-700 not-italic mr-2">Observation:</span> "{{ a.observation }}"
          </div>
        </div>
      </div>
    </div>
  `
})
export class EnseignantAttributionsComponent implements OnInit {
  semestres: ('S1' | 'S2' | 'S3' | 'S4')[] = ['S1', 'S2', 'S3', 'S4'];
  selectedSemestre: 'S1' | 'S2' | 'S3' | 'S4' = 'S1';
  matieres: Matiere[] = [];
  
  // Dans un cas réel, on récupèrerait l'ID de l'enseignant connecté
  currentEnseignantId = 1; // Mock: Kouassi Jean

  refusingId: number | null = null;
  refusalReason = '';

  constructor(private matiereService: GestionMatiereService) {}

  ngOnInit(): void {
    this.matiereService.getMatieres().subscribe(m => this.matieres = m);
  }

  getFilteredAttributions(): Observable<Attribution[]> {
    return this.matiereService.getAttributionsByEnseignant(this.currentEnseignantId).pipe(
      map(atts => atts.filter(a => a.semestre === this.selectedSemestre))
    );
  }

  getMatiereName(id: number): string {
    return this.matieres.find(m => m.id === id)?.nom || 'Inconnue';
  }

  onAccepter(id: number) {
    if (confirm('Voulez-vous accepter cette attribution ?')) {
      this.matiereService.accepterAttribution(id);
    }
  }

  openRefusal(id: number) {
    this.refusingId = id;
    this.refusalReason = '';
  }

  onRefuser(id: number) {
    if (this.refusalReason.trim()) {
      this.matiereService.refuserAttribution(id, this.refusalReason);
      this.refusingId = null;
      this.refusalReason = '';
    }
  }
}
