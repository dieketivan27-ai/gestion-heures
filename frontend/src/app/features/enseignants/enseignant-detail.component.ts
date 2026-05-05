import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';
import { AnneeAcademique } from '../../core/models/models';
import { AvatarComponent } from '../../shared/components/avatar.component';

@Component({
  selector: 'app-enseignant-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AvatarComponent],
  template: `
    <!-- Top bar -->
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <a routerLink="/enseignants"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
        <i class="fas fa-arrow-left"></i> Retour
      </a>
      <button (click)="exportPDF()" [disabled]="!data"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
        <i class="fas fa-file-pdf"></i> Télécharger Fiche (PDF)
      </button>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="flex items-center justify-center py-20">
      <div class="spinner" style="width:40px;height:40px"></div>
    </div>

    <div *ngIf="!loading && data">
      <!-- Profile Card -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <div class="flex gap-6 flex-wrap items-center">
          <!-- Avatar -->
          <app-avatar [url]="getAvatarUrl(data.enseignant.avatar_url)" 
                      [name]="data.enseignant.prenom + ' ' + data.enseignant.nom" 
                      size="lg"></app-avatar>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-slate-800">{{data.enseignant.nom}} {{data.enseignant.prenom}}</h2>
            <div class="flex gap-2 flex-wrap mt-2">
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{{data.enseignant.grade}}</span>
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                [ngClass]="data.enseignant.statut==='Permanent' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                {{data.enseignant.statut}}
              </span>
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {{data.enseignant.departement_nom || 'Sans département'}}
              </span>
            </div>
            <div class="mt-2 text-sm text-slate-500 flex items-center gap-4 flex-wrap">
              <span><i class="fas fa-envelope mr-1"></i>{{data.enseignant.email}}</span>
              <span *ngIf="data.enseignant.telephone"><i class="fas fa-phone mr-1"></i>{{data.enseignant.telephone}}</span>
            </div>
          </div>

          <!-- Quick stats -->
          <div class="flex gap-6 flex-wrap">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{data.stats.total_heures * 1 | number:'1.0-1'}}</div>
              <div class="text-xs text-slate-500 mt-0.5">Total heures</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-emerald-600">{{data.enseignant.heures_contractuelles}}</div>
              <div class="text-xs text-slate-500 mt-0.5">Contractuelles</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-amber-500">{{data.stats.heures_complementaires * 1 | number:'1.0-1'}}</div>
              <div class="text-xs text-slate-500 mt-0.5">Complémentaires</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat mini-cards -->
      <div class="grid grid-cols-3 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="fas fa-chalkboard-teacher"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{data.stats.total_cm * 1 | number:'1.0-1'}}h</div>
            <div class="text-xs text-slate-500">Cours Magistraux</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="fas fa-users"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{data.stats.total_td * 1 | number:'1.0-1'}}h</div>
            <div class="text-xs text-slate-500">Travaux Dirigés</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="fas fa-flask"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{data.stats.total_tp * 1 | number:'1.0-1'}}h</div>
            <div class="text-xs text-slate-500">Travaux Pratiques</div>
          </div>
        </div>
      </div>

      <!-- Hours table -->
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <span class="font-semibold text-slate-700 text-sm flex items-center gap-2">
            <i class="fas fa-list"></i> Historique des heures
          </span>
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            [(ngModel)]="selectedAnnee" (change)="loadDetail()">
            <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matière</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durée</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Salle</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Compl.</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngIf="!data.heures.length">
                <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                  <i class="fas fa-clock text-4xl mb-3 opacity-30 block"></i>Aucune heure enregistrée
                </td>
              </tr>
              <tr *ngFor="let h of data.heures" class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 text-slate-600">{{h.date_cours | date:'dd/MM/yyyy'}}</td>
                <td class="px-4 py-3 text-slate-700">{{h.matiere_nom || '-'}}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" [ngClass]="typeClass(h.type_heure)">{{h.type_heure}}</span>
                </td>
                <td class="px-4 py-3 font-bold text-slate-800">{{h.duree}}h</td>
                <td class="px-4 py-3 text-slate-500">{{h.salle || '-'}}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="h.is_complementaire ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'">
                    {{h.is_complementaire ? 'Oui' : 'Non'}}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="h.valide ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                    <i class="fas" [ngClass]="h.valide ? 'fa-check' : 'fa-hourglass-half'"></i>
                    {{h.valide ? 'Validé' : 'En attente'}}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class EnseignantDetailComponent implements OnInit {
  data: any = null;
  annees: AnneeAcademique[] = [];
  selectedAnnee: number | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute, 
    private api: ApiService,
    private auth: AuthService,
    private exportSvc: ExportService
  ) {}

  ngOnInit() {
    this.api.getAnnees().subscribe(a => {
      this.annees = a;
      const active = a.find(x => x.is_active);
      this.selectedAnnee = active?.id || a[0]?.id || null;
      this.loadDetail();
    });
  }

  loadDetail() {
    const id = +this.route.snapshot.params['id'];
    this.loading = true;
    this.api.getEnseignantHeures(id, this.selectedAnnee || undefined).subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  getAvatarUrl(path: string | undefined) {
    return this.auth.getAvatarUrl(path);
  }

  exportPDF() {
    if (!this.data) return;
    const anneeLibelle = this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
    this.exportSvc.exportIndividuelPDF(this.data, anneeLibelle);
  }

  typeClass(t: string): string {
    return { CM: 'bg-blue-50 text-blue-700', TD: 'bg-emerald-50 text-emerald-700', TP: 'bg-amber-50 text-amber-700' }[t] || 'bg-slate-100 text-slate-500';
 'badge-gray'; }
}
