import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-history text-indigo-600"></i> Journal des Actions
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">Historique complet des modifications du système</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <input
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style="width:200px"
          placeholder="🔍 Rechercher..."
          [(ngModel)]="search"
          (input)="applyFilter()">
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          [(ngModel)]="filterAction" (change)="applyFilter()">
          <option value="">Toutes les actions</option>
          <option value="CREATE">Création</option>
          <option value="UPDATE">Modification</option>
          <option value="DELETE">Suppression</option>
          <option value="LOGIN">Connexion</option>
          <option value="IMPORT">Importation</option>
        </select>
        <button (click)="load()" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <i class="fas fa-sync-alt" [class.animate-spin]="loading"></i> Actualiser
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-plus-circle"></i>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-800">{{countByAction('CREATE')}}</div>
          <div class="text-xs text-slate-500">Créations</div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-edit"></i>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-800">{{countByAction('UPDATE')}}</div>
          <div class="text-xs text-slate-500">Modifications</div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-trash"></i>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-800">{{countByAction('DELETE')}}</div>
          <div class="text-xs text-slate-500">Suppressions</div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
          <i class="fas fa-file-import"></i>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-800">{{countByAction('IMPORT')}}</div>
          <div class="text-xs text-slate-500">Importations</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <span class="font-semibold text-slate-700 text-sm flex items-center gap-2">
          <i class="fas fa-list-ul text-slate-400"></i> {{filtered.length}} entrée(s)
        </span>
        <span class="text-xs text-slate-400">Dernière mise à jour : {{lastRefresh | date:'HH:mm:ss'}}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Heure</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Utilisateur</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Entité</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Détails</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngIf="loading">
              <td colspan="6" class="px-4 py-16 text-center">
                <div class="spinner mx-auto"></div>
              </td>
            </tr>
            <tr *ngIf="!loading && !filtered.length">
              <td colspan="6" class="px-4 py-16 text-center text-slate-400">
                <i class="fas fa-history text-4xl mb-3 opacity-30 block"></i>
                <p class="text-sm">Aucune entrée trouvée</p>
              </td>
            </tr>
            <tr *ngFor="let log of paginated" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                <div class="font-medium text-slate-700">{{log.created_at | date:'dd/MM/yyyy'}}</div>
                <div class="text-slate-400">{{log.created_at | date:'HH:mm:ss'}}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {{getUserInitials(log)}}
                  </div>
                  <div>
                    <div class="font-medium text-slate-700 text-xs">{{log.user_email || 'Système'}}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  [ngClass]="getActionClass(log.action)">
                  <i [ngClass]="getActionIcon(log.action)"></i>
                  {{getActionLabel(log.action)}}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="text-xs text-slate-600 font-medium">{{formatTable(log.table_name)}}</div>
                <div class="text-xs text-slate-400" *ngIf="log.record_id">#{{log.record_id}}</div>
              </td>
              <td class="px-4 py-3 max-w-[240px]">
                <div class="text-xs text-slate-500 truncate" [title]="formatDetails(log.details)">
                  {{formatDetails(log.details)}}
                </div>
              </td>
              <td class="px-4 py-3">
                <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500">{{log.ip_address || '-'}}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div *ngIf="filtered.length > pageSize" class="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <span class="text-xs text-slate-500">Page {{currentPage}} / {{totalPages}}</span>
        <div class="flex gap-2">
          <button (click)="currentPage = currentPage - 1" [disabled]="currentPage <= 1"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button (click)="currentPage = currentPage + 1" [disabled]="currentPage >= totalPages"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class LogsComponent implements OnInit {
  logs: any[] = [];
  filtered: any[] = [];
  loading = false;
  search = '';
  filterAction = '';
  lastRefresh = new Date();

  currentPage = 1;
  pageSize = 20;

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.lastRefresh = new Date();
    this.api.getLogs().subscribe({
      next: data => {
        this.logs = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter() {
    this.currentPage = 1;
    this.filtered = this.logs.filter(log => {
      const matchAction = !this.filterAction || log.action === this.filterAction;
      const q = this.search.toLowerCase();
      const matchSearch = !q ||
        (log.user_email || '').toLowerCase().includes(q) ||
        (log.table_name || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.ip_address || '').toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }

  get totalPages() { return Math.ceil(this.filtered.length / this.pageSize); }
  get paginated() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  countByAction(action: string) { return this.logs.filter(l => l.action === action).length; }

  getUserInitials(log: any): string {
    const email = log.user_email || '';
    return email.charAt(0).toUpperCase() || '?';
  }

  getActionLabel(action: string): string {
    const map: any = { CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression', LOGIN: 'Connexion', IMPORT: 'Import', LOGOUT: 'Déconnexion' };
    return map[action] || action;
  }

  getActionClass(action: string): string {
    const map: any = {
      CREATE: 'bg-emerald-50 text-emerald-700',
      UPDATE: 'bg-blue-50 text-blue-700',
      DELETE: 'bg-red-50 text-red-600',
      LOGIN: 'bg-indigo-50 text-indigo-600',
      IMPORT: 'bg-amber-50 text-amber-700',
      LOGOUT: 'bg-slate-100 text-slate-600',
    };
    return map[action] || 'bg-slate-50 text-slate-600';
  }

  getActionIcon(action: string): string {
    const map: any = {
      CREATE: 'fas fa-plus-circle',
      UPDATE: 'fas fa-edit',
      DELETE: 'fas fa-trash',
      LOGIN: 'fas fa-sign-in-alt',
      IMPORT: 'fas fa-file-import',
      LOGOUT: 'fas fa-sign-out-alt',
    };
    return map[action] || 'fas fa-circle';
  }

  formatTable(table: string): string {
    const map: any = {
      enseignants: 'Enseignant',
      heures_effectuees: 'Heure effectuée',
      matieres: 'Matière',
      users: 'Utilisateur',
      departements: 'Département',
      parametres: 'Paramètre',
      attributions_matieres: 'Attribution',
      multiple: 'Importation multiple',
    };
    return map[table] || table;
  }

  formatDetails(details: any): string {
    if (!details) return '-';
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch { return details; }
    }
    if (typeof details === 'object') {
      const { importedCount, errorCount, nom, prenom, email } = details;
      if (importedCount !== undefined) return `${importedCount} importé(s), ${errorCount} erreur(s)`;
      if (nom) return `${nom} ${prenom || ''} ${email ? '— ' + email : ''}`.trim();
      return JSON.stringify(details).substring(0, 80);
    }
    return String(details);
  }
}
