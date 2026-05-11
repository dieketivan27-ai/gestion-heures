import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ExportService } from '../../core/services/export.service';
import { AuthService } from '../../core/services/auth.service';
import { AnneeAcademique } from '../../core/models/models';

import { AvatarComponent } from '../../shared/components/avatar.component';
@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-file-alt text-blue-600"></i> États &amp; Rapports
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">Générer et exporter les états de paiement</p>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <div class="flex bg-slate-100 rounded-lg p-1">
          <button class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            [ngClass]="view==='global' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            (click)="view='global'">Global</button>
          <button class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            [ngClass]="view==='compta' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            (click)="view='compta'">Comptabilité</button>
        </div>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" [(ngModel)]="selectedAnnee" (change)="load()">
          <option value="ALL">Toutes les années</option>
          <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
        </select>
        
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" [(ngModel)]="selectedMois" (change)="load()">
          <option value="ALL">Tous les mois</option>
          <option *ngFor="let m of moisList" [value]="m.id">{{m.nom}}</option>
        </select>

        <button *ngIf="!isTeacher" (click)="exportExcel()" [disabled]="!data.length"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          <i class="fas fa-file-excel"></i> Excel
        </button>
        <button *ngIf="!isTeacher" (click)="exportPDF()" [disabled]="!data.length"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          <i class="fas fa-file-pdf"></i> PDF Global
        </button>

        <div class="h-8 w-px bg-slate-200 mx-1" *ngIf="!isTeacher"></div>

        <div class="flex items-center gap-2" *ngIf="!isTeacher">
          <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]" 
            [(ngModel)]="selectedTeacherId">
            <option [ngValue]="null">Choisir enseignant...</option>
            <option *ngFor="let r of data" [ngValue]="r.id">{{r.nom}} {{r.prenom}}</option>
          </select>
          <button (click)="exportIndividuel(selectedTeacherId!)" [disabled]="!selectedTeacherId"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            title="Télécharger la fiche individuelle">
            <i class="fas fa-user-tag"></i> Fiche
          </button>
        </div>
      </div>
    </div>


    <!-- Stat Summary -->
    <div class="grid grid-cols-3 gap-4 mb-5" *ngIf="data.length">
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex -space-x-2.5 overflow-hidden" *ngIf="data.length">
            <app-avatar *ngFor="let r of (data || []).slice(0, 3)" 
              [url]="getAvatarUrl(r.avatar_url)" 
              [name]="r.prenom + ' ' + r.nom" 
              size="sm" 
              class="inline-block border-2 border-white rounded-full">
            </app-avatar>
            <div *ngIf="data.length > 3" 
              class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 border-2 border-white text-xs font-bold text-slate-600">
              +{{data.length - 3}}
            </div>
          </div>
          <div *ngIf="!data.length" class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <i class="fas fa-users text-lg"></i>
          </div>
          <div>
            <div class="text-xs text-slate-500 font-medium">Enseignants</div>
            <div class="text-lg font-bold text-slate-800 leading-none">{{data.length}}</div>
          </div>
        </div>
        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 opacity-50">
          <i class="fas fa-chevron-right text-xs"></i>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas fa-money-bill"></i></div>
        <div><div class="text-2xl font-bold text-slate-800">{{totalMontant | number:'1.0-0'}} FCFA</div><div class="text-xs text-slate-500">Montant total à payer</div></div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas fa-clock"></i></div>
        <div><div class="text-2xl font-bold text-slate-800">{{totalHeures | number:'1.0-0'}}h</div><div class="text-xs text-slate-500">Heures validées</div></div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <span class="font-semibold text-slate-700 text-sm flex items-center gap-2">
          <i class="fas" [ngClass]="view==='global'?'fa-table':'fa-calculator'"></i>
          {{view==='global' ? 'État global des heures complémentaires' : 'État de paiement (Comptabilité)'}}
        </span>
        <span class="text-xs text-slate-400">Heures validées uniquement</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" *ngIf="view==='global'">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matricule</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Département</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">CM (h)</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">TD (h)</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">TP (h)</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total FCFA</th>
              <th class="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" *ngIf="!isTeacher">Indiv.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="10" class="px-4 py-20 text-center"><div class="spinner mx-auto"></div></td>
            </tr>
            <tr *ngIf="!loading && !data.length">
              <td colspan="10" class="px-4 py-20 text-center">
                <div class="flex flex-col items-center opacity-30">
                  <i class="fas fa-file-alt text-4xl mb-3"></i>
                  <p class="text-sm">Aucune donnée pour cette période</p>
                </div>
              </td>
            </tr>
            <tr *ngFor="let r of data" class="hover:bg-slate-50 transition-colors">
              <td class="px-3 py-3">
                <code class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">{{r.matricule || '-'}}</code>
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2">
                  <app-avatar [url]="getAvatarUrl(r.avatar_url)" [name]="r.prenom + ' ' + r.nom" size="xs"></app-avatar>
                  <div class="font-bold text-slate-800">{{r.nom}} {{r.prenom}}</div>
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="badge badge-blue text-[10px]">{{r.grade}}</span>
              </td>
              <td class="px-3 py-3">
                <span class="badge text-[10px]" [ngClass]="r.statut==='Permanent'?'badge-green':'badge-orange'">{{r.statut}}</span>
              </td>
              <td class="px-3 py-3 text-xs text-slate-500 truncate max-w-[120px]">{{r.departement_nom || '-'}}</td>
              <td class="px-3 py-3 text-slate-600 font-medium">{{(r.cm_normal + r.cm_comp) | number:'1.0-1'}}</td>
              <td class="px-3 py-3 text-slate-600 font-medium">{{(r.td_normal + r.td_comp) | number:'1.0-1'}}</td>
              <td class="px-3 py-3 text-slate-600 font-medium">{{(r.tp_normal + r.tp_comp) | number:'1.0-1'}}</td>
              <td class="px-3 py-3 font-bold text-blue-600">{{r.montant_total | number:'1.0-0'}}</td>
              <td class="px-3 py-3 text-center" *ngIf="!isTeacher">
                <button class="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors" (click)="exportIndividuel(r.id)" title="Fiche PDF">
                  <i class="fas fa-file-pdf"></i>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot *ngIf="data.length" class="bg-slate-50/50 font-bold border-t border-slate-100">
            <tr>
              <td colspan="5" class="px-3 py-4 text-right text-slate-500 text-xs uppercase tracking-wider">Totaux</td>
              <td class="px-3 py-4 text-slate-700">{{totalCM | number:'1.0-1'}}</td>
              <td class="px-3 py-4 text-slate-700">{{totalTD | number:'1.0-1'}}</td>
              <td class="px-3 py-4 text-slate-700">{{totalTP | number:'1.0-1'}}</td>
              <td class="px-3 py-4 text-blue-600 font-extrabold text-base">{{totalMontant | number:'1.0-0'}} <span class="text-[10px]">FCFA</span></td>
              <td *ngIf="!isTeacher"></td>
            </tr>
          </tfoot>
        </table>

        <table class="w-full text-sm" *ngIf="view==='compta'">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Département</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Total Heures</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Comp. Payées</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant Net</th>
              <th class="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" *ngIf="!isTeacher">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="6" class="px-4 py-20 text-center"><div class="spinner mx-auto"></div></td>
            </tr>
            <tr *ngFor="let r of data" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <app-avatar [url]="getAvatarUrl(r.avatar_url)" [name]="r.prenom + ' ' + r.nom" size="xs"></app-avatar>
                  <div>
                    <div class="font-bold text-slate-800">{{r.nom}} {{r.prenom}}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{r.matricule || '-'}}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{r.departement_nom || '-'}}</td>
              <td class="px-4 py-3 text-center text-slate-700 font-medium">
                {{(r.cm_normal + r.cm_comp + r.td_normal + r.td_comp + r.tp_normal + r.tp_comp) | number:'1.0-1'}}h
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                  {{(r.cm_comp + r.td_comp + r.tp_comp) | number:'1.0-1'}}h
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="font-extrabold text-emerald-600">{{r.montant_total | number:'1.0-0'}} <span class="font-normal text-[10px]">FCFA</span></div>
              </td>
              <td class="px-4 py-3 text-center" *ngIf="!isTeacher">
                <button class="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors" (click)="exportIndividuel(r.id)">
                  <i class="fas fa-file-pdf"></i>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot *ngIf="data.length" class="bg-slate-50/50 font-extrabold border-t border-slate-100">
            <tr>
              <td colspan="4" class="px-4 py-4 text-right text-slate-500 text-xs uppercase tracking-wider">Total à Régler</td>
              <td colspan="2" class="px-4 py-4 text-emerald-600 text-lg">{{totalMontant | number:'1.0-0'}} <span class="text-xs font-bold">FCFA</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `
})
export class RapportsComponent implements OnInit {
  data: any[] = [];
  annees: AnneeAcademique[] = [];
  selectedAnnee: number | null = null;
  selectedMois: string = 'ALL';
  selectedTeacherId: number | null = null;
  loading = false;
  view: 'global' | 'compta' = 'global';

  moisList = [
    { id: '1', nom: 'Janvier' }, { id: '2', nom: 'Février' }, { id: '3', nom: 'Mars' },
    { id: '4', nom: 'Avril' }, { id: '5', nom: 'Mai' }, { id: '6', nom: 'Juin' },
    { id: '7', nom: 'Juillet' }, { id: '8', nom: 'Août' }, { id: '9', nom: 'Septembre' },
    { id: '10', nom: 'Octobre' }, { id: '11', nom: 'Novembre' }, { id: '12', nom: 'Décembre' }
  ];

  constructor(
    private api: ApiService,
    private exportSvc: ExportService,
    private auth: AuthService
  ) { }

  get isTeacher(): boolean { return this.auth.currentUser?.role === 'enseignant'; }

  ngOnInit() {
    this.api.getAnnees().subscribe(a => {
      this.annees = a;
      const active = a.find(x => x.is_active);
      this.selectedAnnee = active?.id || a[0]?.id || null;
      this.load();
    });
  }

  load() {
    this.loading = true;
    this.api.getEtatPaiement(this.selectedAnnee || undefined, this.selectedMois).subscribe({
      next: d => {
        this.data = d;
        this.selectedTeacherId = null;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getAvatarUrl(path: string | undefined) {
    return this.auth.getAvatarUrl(path);
  }

  get totalMontant() { return this.data.reduce((s, r) => s + Number(r.montant_total || 0), 0); }
  get totalHeures() { return this.data.reduce((s, r) => s + Number(r.cm_normal || 0) + Number(r.cm_comp || 0) + Number(r.td_normal || 0) + Number(r.td_comp || 0) + Number(r.tp_normal || 0) + Number(r.tp_comp || 0), 0); }
  get totalCM() { return this.data.reduce((s, r) => s + Number(r.cm_normal || 0) + Number(r.cm_comp || 0), 0); }
  get totalTD() { return this.data.reduce((s, r) => s + Number(r.td_normal || 0) + Number(r.td_comp || 0), 0); }
  get totalTP() { return this.data.reduce((s, r) => s + Number(r.tp_normal || 0) + Number(r.tp_comp || 0), 0); }

  exportExcel() {
    let headers: string[] = [];
    let rows: any[] = [];
    const anneeLibelle = this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
    const moisNom = this.moisList.find(m => m.id === this.selectedMois)?.nom || '';
    const periode = moisNom ? `${moisNom} ${anneeLibelle}` : anneeLibelle;

    if (this.view === 'global') {
      headers = ['Matricule', 'Nom', 'Prénom', 'Grade', 'Statut', 'Département', 'CM (h)', 'TD (h)', 'TP (h)', 'Montant CM', 'Montant TD', 'Montant TP', 'Total FCFA'];
      rows = this.data.map(r => [
        r.matricule || '', r.nom, r.prenom, r.grade, r.statut, r.departement || '',
        r.cm_normal + r.cm_comp, r.td_normal + r.td_comp, r.tp_normal + r.tp_comp,
        r.montant_cm, r.montant_td, r.montant_tp, r.montant_total
      ]);
    } else {
      headers = ['Matricule', 'Nom', 'Prénom', 'Statut', 'Total Heures', 'Heures Complémentaires', 'Montant Total'];
      rows = this.data.map(r => [
        r.matricule || '', r.nom, r.prenom, r.statut,
        r.cm_normal + r.cm_comp + r.td_normal + r.td_comp + r.tp_normal + r.tp_comp,
        r.cm_comp + r.td_comp + r.tp_comp,
        r.montant_total
      ]);
    }

    this.exportSvc.exportExcel(rows, headers, `rapport_${this.view}_${periode.replace(/ /g, '_')}`);
  }

  exportPDF() {
    const anneeLibelle = this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
    const moisNom = this.moisList.find(m => m.id === this.selectedMois)?.nom || '';
    const periode = moisNom ? `${moisNom} ${anneeLibelle}` : anneeLibelle;
    this.exportSvc.exportGlobalPDF(this.data, this.view, periode);
  }

  exportIndividuel(enseignantId: number) {
    console.log('[RapportsComponent] exportIndividuel called with ID:', enseignantId);
    if (!enseignantId) { alert('ID enseignant introuvable'); return; }

    this.api.getEnseignantHeures(enseignantId, this.selectedAnnee || undefined).subscribe({
      next: data => {
        const anneeLibelle = this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
        this.exportSvc.exportIndividuelPDF(data, anneeLibelle);
      },
      error: err => {
        console.error('[RapportsComponent] API error:', err);
        alert('Erreur lors du téléchargement : ' + (err.message || err.status));
      }
    });
  }
}
