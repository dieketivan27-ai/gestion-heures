import { Component, OnInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GestionMatiereService } from '../../services/gestion-matiere.service';
import { Attribution, Matiere } from '../../models/matiere.model';
import { AuthService } from '../../core/services/auth.service';
import { map, Observable, BehaviorSubject, combineLatest, switchMap, of, tap, catchError, finalize } from 'rxjs';

registerLocaleData(localeFr);

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterAccepted',
  standalone: true
})
export class FilterAcceptedPipe implements PipeTransform {
  transform(items: Attribution[] | null): Attribution[] {
    if (!items) return [];
    return items.filter(item => item.statut === 'ACCEPTEE');
  }
}

@Component({
  selector: 'app-enseignant-attributions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FilterAcceptedPipe],
  template: `
    <div class="container mx-auto p-4 max-w-5xl">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-black text-gray-900 tracking-tight">Mes Attributions</h1>
          <p class="text-gray-500 font-medium">Gérez vos matières pour l'année académique en cours</p>
        </div>
        <div class="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100" *ngIf="currentUser">
           <span class="text-indigo-600 font-bold text-sm">Session: {{ currentUser.nom }} {{ currentUser.prenom }}</span>
        </div>
      </div>

      <!-- Erreur -->
      <div *ngIf="errorMessage" class="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl mb-8 flex items-center gap-4 text-rose-600">
        <i class="fas fa-exclamation-triangle text-2xl"></i>
        <div class="flex-1">
          <p class="font-black">Une erreur est survenue lors du chargement</p>
          <p class="text-sm opacity-80">{{ errorMessage }}</p>
        </div>
        <button (click)="retry()" class="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">Réessayer</button>
      </div>

      <!-- Navigation par Semestre -->
      <div class="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div class="flex p-1 bg-gray-100 rounded-2xl shadow-inner w-full sm:w-auto">
          <button *ngFor="let s of semestres" 
            (click)="onSemestreChange(s)"
            [ngClass]="selectedSemestre === s ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'"
            class="flex-1 sm:flex-none sm:w-32 py-3 px-1 text-center rounded-xl font-black text-xs transition-all uppercase tracking-widest">
            {{ s }}
          </button>
        </div>
        
        <div class="flex gap-2">
          <div class="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
            <i class="fas fa-check-circle text-emerald-500"></i>
            <span class="text-emerald-700 font-bold text-xs uppercase tracking-wider">
              {{ (acceptedCount$ | async) }} Matières validées
            </span>
          </div>
        </div>
      </div>

      <!-- Liste des attributions -->
      <div class="grid gap-6">
        <div *ngIf="loading" class="py-12 text-center">
           <div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
           <p class="text-gray-400 font-bold animate-pulse">Chargement de vos attributions...</p>
        </div>

        <div *ngIf="!loading && !errorMessage && (filteredAttributions$ | async)?.length === 0" 
             class="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100 shadow-sm">
          <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <i class="fas fa-book-open text-gray-300 text-3xl"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Aucune attribution trouvée</h3>
          <p class="text-gray-400 max-w-xs mx-auto">Il n'y a pas encore de matières assignées pour le semestre {{ selectedSemestre }}.</p>
        </div>

        <div *ngFor="let a of filteredAttributions$ | async" 
             class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <!-- Card Content (Same as before) -->
          <div class="p-8 flex flex-wrap items-center justify-between gap-6">
            <div class="flex-1 min-w-[280px]">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
                  {{ (a.matiere_nom || 'M').charAt(0) }}
                </div>
                <div>
                  <h3 class="text-xl font-black text-gray-900 leading-tight">{{ a.matiere_nom }}</h3>
                  <p class="text-indigo-500 font-bold text-xs tracking-widest uppercase">{{ a.matiere_code }}</p>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-4 items-center">
                <span [ngClass]="{
                  'bg-amber-50 text-amber-600 border-amber-100': a.statut === 'EN_ATTENTE',
                  'bg-emerald-50 text-emerald-600 border-emerald-100': a.statut === 'ACCEPTEE',
                  'bg-rose-50 text-rose-600 border-rose-100': a.statut === 'REFUSEE'
                }" class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border">
                  {{ a.statut.replace('_', ' ') }}
                </span>
                <span class="text-gray-400 text-xs font-bold flex items-center gap-1.5">
                  <i class="far fa-calendar-alt"></i> {{ a.anneeAcademique }}
                </span>
                <span class="text-gray-900 text-xs font-black flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl">
                  <i class="far fa-clock text-indigo-500"></i> {{ a.heuresTotal }} HEURES
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <ng-container *ngIf="a.statut === 'EN_ATTENTE'">
                <button (click)="onAccepter(a.id)" class="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-100 flex items-center gap-2">
                  <i class="fas fa-check"></i> Accepter
                </button>
                <button (click)="openRefusal(a.id)" class="bg-white hover:bg-rose-50 text-rose-500 border-2 border-rose-100 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2">
                  <i class="fas fa-times"></i> Refuser
                </button>
              </ng-container>
              
              <div *ngIf="a.statut !== 'EN_ATTENTE'" class="text-right bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                <p class="text-[9px] uppercase text-gray-400 font-black tracking-tighter mb-0.5">Réponse enregistrée le</p>
                <p class="text-sm font-black text-gray-800">{{ a.dateReponse | date:'dd MMMM yyyy':'':'fr' }}</p>
              </div>
            </div>
          </div>

          <!-- Section Refus -->
          <div *ngIf="refusingId === a.id" class="px-8 pb-8 pt-0 animate-fadeIn">
            <div class="bg-rose-50 rounded-3xl p-6 border-2 border-rose-100">
              <label class="block text-sm font-black text-rose-700 mb-3 flex items-center gap-2">
                <i class="fas fa-exclamation-circle"></i> Motif du refus (Obligatoire)
              </label>
              <textarea [(ngModel)]="refusalReason" rows="3" 
                class="w-full rounded-2xl border-rose-200 border-2 p-4 focus:ring-rose-500 focus:border-rose-500 shadow-inner text-gray-700 font-medium transition-all"
                placeholder="Veuillez expliquer pourquoi vous refusez cette attribution..."></textarea>
              <div class="flex justify-end gap-3 mt-4">
                <button (click)="refusingId = null" class="px-6 py-3 text-gray-500 font-black text-sm hover:bg-rose-100/50 rounded-2xl transition-all">Annuler</button>
                <button (click)="onRefuser(a.id)" [disabled]="!refusalReason.trim() || processing" 
                  class="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-2xl font-black text-sm disabled:opacity-50 transition-all shadow-lg shadow-rose-100">
                  {{ processing ? 'Traitement...' : 'Confirmer le refus' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Observation -->
          <div *ngIf="a.statut === 'REFUSEE' && a.observation" class="mx-8 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div class="flex gap-3">
              <i class="fas fa-quote-left text-rose-200 text-xl"></i>
              <div>
                <p class="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Votre observation</p>
                <p class="text-gray-600 font-medium italic">"{{ a.observation }}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Mes Matières (Résumé Liste) -->
      <div *ngIf="(acceptedCount$ | async) !== 0" class="mt-16 animate-fadeIn">
        <h2 class="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <i class="fas fa-list-ul text-indigo-500"></i> Liste récapitulative de mes matières
        </h2>
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Matière</th>
                <th class="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Semestre</th>
                <th class="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Heures</th>
                <th class="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr *ngFor="let a of (attributions$ | async) | filterAccepted" class="hover:bg-gray-50/50 transition-colors">
                <td class="px-8 py-5">
                  <div class="font-black text-gray-900">{{ a.matiere_nom }}</div>
                  <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">{{ a.matiere_code }}</div>
                </td>
                <td class="px-8 py-5 text-center">
                  <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-black text-[10px] uppercase">{{ a.semestre }}</span>
                </td>
                <td class="px-8 py-5 text-center font-bold text-gray-600 text-sm">
                  {{ a.heuresTotal }}h
                </td>
                <td class="px-8 py-5 text-center">
                   <div class="flex items-center justify-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase">
                     <i class="fas fa-check-circle"></i> Validée
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class EnseignantAttributionsComponent implements OnInit {
  semestres: ('S1' | 'S2')[] = ['S1', 'S2'];
  selectedSemestre: 'S1' | 'S2' = 'S1';
  
  private refresh$ = new BehaviorSubject<void>(undefined);
  attributions$: Observable<Attribution[]>;
  filteredAttributions$: Observable<Attribution[]>;
  acceptedCount$: Observable<number>;
  
  loading = true;
  processing = false;
  errorMessage = '';
  refusingId: number | null = null;
  refusalReason = '';
  currentUser: any;

  constructor(
    private matiereService: GestionMatiereService,
    private authService: AuthService
  ) {
    // Pipeline setup
    this.attributions$ = combineLatest([this.authService.currentUser$, this.refresh$]).pipe(
      switchMap(([user]) => {
        this.currentUser = user;
        if (!user || !user.enseignant_id) {
          this.loading = false;
          return of([]);
        }
        this.loading = true;
        this.errorMessage = '';
        return this.matiereService.getAttributionsByEnseignant(user.enseignant_id).pipe(
          catchError(err => {
            console.error('Attribution loading error:', err);
            let backendError = err.error?.error || err.error?.message || err.message;
            if (typeof backendError === 'object') backendError = JSON.stringify(backendError);
            this.errorMessage = backendError;
            return of([]);
          }),
          finalize(() => this.loading = false)
        );
      })
    );

    this.filteredAttributions$ = this.attributions$.pipe(
      map(atts => atts.filter(a => a.semestre === this.selectedSemestre))
    );

    this.acceptedCount$ = this.attributions$.pipe(
      map(atts => atts.filter(a => a.statut === 'ACCEPTEE').length)
    );
  }

  ngOnInit(): void {}

  retry() {
    this.refresh$.next();
  }

  onSemestreChange(s: 'S1' | 'S2') {
    this.selectedSemestre = s;
    this.refresh$.next();
  }

  onAccepter(id: number) {
    if (confirm('Voulez-vous accepter cette attribution ?')) {
      this.processing = true;
      this.matiereService.accepterAttribution(id).subscribe({
        next: () => {
          this.processing = false;
          this.refresh$.next();
        },
        error: (err) => {
          this.processing = false;
          alert('Erreur: ' + err.message);
        }
      });
    }
  }

  openRefusal(id: number) {
    this.refusingId = id;
    this.refusalReason = '';
  }

  onRefuser(id: number) {
    if (this.refusalReason.trim()) {
      this.processing = true;
      this.matiereService.refuserAttribution(id, this.refusalReason).subscribe({
        next: () => {
          this.processing = false;
          this.refusingId = null;
          this.refusalReason = '';
          this.refresh$.next();
        },
        error: (err) => {
          this.processing = false;
          alert('Erreur: ' + err.message);
        }
      });
    }
  }
}
