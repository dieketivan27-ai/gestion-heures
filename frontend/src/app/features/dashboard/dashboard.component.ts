import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';
import { DashboardData, AnneeAcademique } from '../../core/models/models';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  styles: [`
    .chart-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
      overflow: hidden;
    }
    .chart-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #f1f5f9;
      font-size: .875rem;
      font-weight: 600;
      color: #334155;
    }
    .chart-wrap-donut {
      display: flex;
      align-items: center;
      padding: 20px;
      gap: 24px;
    }
    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .donut-legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: .8125rem;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .legend-label { color: #475569; font-weight: 500; flex: 1; }
    .legend-value { color: #0f172a; font-weight: 700; }
    .legend-sep { border-top: 1px solid #f1f5f9; margin-top: 4px; padding-top: 8px; }
    .empty-chart {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      color: #94a3b8;
      gap: 8px;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  template: `
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fas fa-chart-pie text-blue-600"></i> Tableau de bord
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Vue d'ensemble de l'activité d'enseignement <span *ngIf="userUniversityNom" class="font-bold text-blue-600">· {{userUniversityNom}}</span>
        </p>
      </div>
      <div class="flex gap-2">
        <button *ngIf="isTeacher"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          (click)="exportPDF()" [disabled]="!teacherData">
          <i class="fas fa-file-pdf"></i> Mon Récapitulatif PDF
        </button>
        <select class="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          style="width:175px" [(ngModel)]="selectedAnnee" (change)="loadData()">
          <option *ngFor="let a of annees" [value]="a.id">{{a.libelle}}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="flex justify-center items-center py-16">
      <div class="spinner"></div>
    </div>

    <!-- VIEW ADMIN / RH -->
    <div *ngIf="data && !loading && !isTeacher">

      <!-- STAT CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex -space-x-2.5 overflow-hidden" *ngIf="data.teacherAvatars?.length">
              <app-avatar *ngFor="let a of (data.teacherAvatars || []).slice(0, 3)"
                [url]="getAvatarUrl(a.avatar_url)" [name]="a.name" size="sm"
                class="inline-block border-2 border-white rounded-full"></app-avatar>
              <div *ngIf="data.totalEnseignants > 3"
                class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 border-2 border-white text-xs font-bold text-slate-600">
                +{{data.totalEnseignants - 3}}
              </div>
            </div>
            <div *ngIf="!data.teacherAvatars?.length" class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
              <i class="fas fa-users text-lg"></i>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-medium">Enseignants actifs</div>
              <div class="text-lg font-bold text-slate-800 leading-none">{{data.totalEnseignants}}</div>
            </div>
          </div>
          <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 opacity-50">
            <i class="fas fa-chevron-right text-xs"></i>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
              <i class="fas fa-clock text-lg"></i>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-medium">Heures effectuées</div>
              <div class="text-lg font-bold text-slate-800 leading-none">{{data.totalHeures.total | number:'1.0-0'}}h</div>
            </div>
          </div>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 opacity-50">
            <i class="fas fa-chart-line text-xs"></i>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500">
              <i class="fas fa-plus-circle text-lg"></i>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-medium">Complémentaires</div>
              <div class="text-lg font-bold text-slate-800 leading-none">{{data.totalHeures.complementaires | number:'1.0-0'}}h</div>
            </div>
          </div>
          <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 opacity-50">
            <i class="fas fa-plus text-xs"></i>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex -space-x-2.5 overflow-hidden" *ngIf="data.enDepassement?.length">
              <app-avatar *ngFor="let e of (data.enDepassement || []).slice(0, 3)"
                [url]="getAvatarUrl(e.avatar_url)" [name]="e.prenom + ' ' + e.nom" size="sm"
                class="inline-block border-2 border-white rounded-full"></app-avatar>
              <div *ngIf="data.enDepassement.length > 3"
                class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 border-2 border-white text-xs font-bold text-red-600">
                +{{data.enDepassement.length - 3}}
              </div>
            </div>
            <div *ngIf="!data.enDepassement?.length" class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500">
              <i class="fas fa-exclamation-triangle text-lg"></i>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-medium">Dépassements</div>
              <div class="text-lg font-bold text-slate-800 leading-none">{{data.enDepassement.length}}</div>
            </div>
          </div>
          <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 opacity-50">
            <i class="fas fa-chevron-right text-xs"></i>
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <!-- Donut: Heures par type -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-chart-pie text-blue-600"></i> Heures par type
            </span>
            <span class="text-xs font-normal text-slate-400">CM · TD · TP</span>
          </div>
          <div *ngIf="!data.parType.length" class="empty-chart">
            <i class="fas fa-chart-pie text-4xl opacity-20"></i>
            <p class="text-sm">Aucune donnée</p>
          </div>
          <div *ngIf="data.parType.length" class="chart-wrap-donut">
            <div style="width:160px;height:160px;flex-shrink:0;position:relative;">
              <canvas #donutCanvas></canvas>
            </div>
            <div class="donut-legend">
              <div class="donut-legend-item" *ngFor="let t of data.parType; let i = index">
                <span class="dot" [style.background]="donutColors[i]"></span>
                <span class="legend-label">{{t.type_heure}}</span>
                <span class="legend-value">{{t.total | number:'1.0-1'}}h</span>
              </div>
              <div class="donut-legend-item legend-sep">
                <span class="legend-label" style="font-weight:600;color:#0f172a;">Total</span>
                <span class="legend-value">{{totalParType | number:'1.0-1'}}h</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Horizontal Bar: Heures par département -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-building text-indigo-600"></i> Heures par département
            </span>
            <span class="text-xs font-normal text-slate-400">heures · enseignants</span>
          </div>
          <div *ngIf="!data.parDepartement.length" class="empty-chart">
            <i class="fas fa-building text-4xl opacity-20"></i>
            <p class="text-sm">Aucune donnée</p>
          </div>
          <div *ngIf="data.parDepartement.length" style="padding:16px 20px;" [style.height]="deptChartHeight">
            <canvas #deptCanvas></canvas>
          </div>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Top enseignants -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-trophy text-amber-500"></i> Top Enseignants
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let e of data.topEnseignants; let i = index" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3">
                    <span *ngIf="i === 0">🥇</span>
                    <span *ngIf="i === 1">🥈</span>
                    <span *ngIf="i === 2">🥉</span>
                    <span *ngIf="i > 2" class="font-bold text-slate-400">{{i+1}}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <app-avatar [url]="getAvatarUrl(e.avatar_url)" [name]="e.prenom + ' ' + e.nom" size="xs"></app-avatar>
                      <span class="font-semibold text-slate-800">{{e.nom}} {{e.prenom}}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{{e.grade}}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-700">{{e.total | number:'1.0-1'}}h</span>
                      <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" style="min-width:40px;max-width:60px;">
                        <div class="h-full rounded-full bg-blue-500" [style.width]="getTopPercent(e.total) + '%'" style="transition:width .6s ease"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Dépassements -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-exclamation-triangle text-amber-500"></i> Dépassements contractuels
            </span>
            <span *ngIf="data.enDepassement.length" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              {{data.enDepassement.length}} cas
            </span>
          </div>
          <div *ngIf="!data.enDepassement.length" class="empty-chart">
            <i class="fas fa-check-circle text-4xl text-emerald-400"></i>
            <p class="text-sm">Aucun dépassement détecté</p>
          </div>
          <div *ngIf="data.enDepassement.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50">
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Enseignant</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contractuel</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Effectué</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Excès</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let e of data.enDepassement" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <app-avatar [url]="getAvatarUrl(e.avatar_url)" [name]="e.prenom + ' ' + e.nom" size="xs"></app-avatar>
                      <span class="font-medium text-slate-800">{{e.nom}} {{e.prenom}}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-600">{{e.heures_contractuelles}}h</td>
                  <td class="px-4 py-3 text-slate-600">{{e.total_effectuees | number:'1.0-1'}}h</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                      +{{e.depassement | number:'1.0-1'}}h
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Line chart: Évolution mensuelle -->
      <div class="chart-card mt-4">
        <div class="chart-card-header">
          <span class="flex items-center gap-2">
            <i class="fas fa-chart-line text-blue-600"></i> Évolution mensuelle des heures
          </span>
          <span class="text-xs font-normal text-slate-400">{{getAnneeLibelle()}}</span>
        </div>
        <div *ngIf="!data.mensuel.length" class="empty-chart">
          <i class="fas fa-chart-line text-4xl opacity-20"></i>
          <p class="text-sm">Aucune donnée mensuelle</p>
        </div>
        <div *ngIf="data.mensuel.length" style="padding:16px 20px 12px;height:240px;">
          <canvas #lineCanvas></canvas>
        </div>
      </div>
    </div>

    <!-- VIEW TEACHER -->
    <div *ngIf="isTeacher && teacherData && !loading">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-clock text-blue-600 text-xl"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{teacherData.stats.total_heures * 1 | number:'1.0-1'}}h</div>
            <div class="text-xs text-slate-500 mt-0.5">Total heures effectuées</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-file-contract text-emerald-600 text-xl"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{teacherData.enseignant.heures_contractuelles}}h</div>
            <div class="text-xs text-slate-500 mt-0.5">Heures contractuelles</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-plus-circle text-amber-500 text-xl"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-800">{{teacherData.stats.heures_complementaires * 1 | number:'1.0-1'}}h</div>
            <div class="text-xs text-slate-500 mt-0.5">Heures complémentaires</div>
          </div>
        </div>
      </div>

      <!-- TEACHER CHARTS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        
        <!-- Donut: Répartition par type -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-chart-pie text-blue-600"></i> Répartition par type
            </span>
            <span class="text-xs font-normal text-slate-400">CM · TD · TP</span>
          </div>
          <div *ngIf="!teacherData.heures.length" class="empty-chart">
            <i class="fas fa-chart-pie text-4xl opacity-20"></i>
            <p class="text-sm">Aucune donnée</p>
          </div>
          <div *ngIf="teacherData.heures.length" class="chart-wrap-donut">
            <div style="width:140px;height:140px;flex-shrink:0;position:relative;">
              <canvas #ensDonut></canvas>
            </div>
            <div class="donut-legend">
              <div class="donut-legend-item">
                <span class="dot bg-blue-500"></span>
                <span class="legend-label">CM</span>
                <span class="legend-value">{{teacherData.stats.total_cm | number:'1.0-1'}}h</span>
              </div>
              <div class="donut-legend-item">
                <span class="dot bg-emerald-500"></span>
                <span class="legend-label">TD</span>
                <span class="legend-value">{{teacherData.stats.total_td | number:'1.0-1'}}h</span>
              </div>
              <div class="donut-legend-item">
                <span class="dot bg-amber-500"></span>
                <span class="legend-label">TP</span>
                <span class="legend-value">{{teacherData.stats.total_tp | number:'1.0-1'}}h</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Jauge: Progression contractuelle -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-gauge-high text-indigo-600"></i> Progression contractuelle
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              Objectif: {{teacherData.enseignant.heures_contractuelles}}h Eq. TD
            </span>
          </div>
          <div class="flex flex-col items-center justify-center p-4">
            <div style="width:100%;height:140px;position:relative;">
              <canvas #ensGauge></canvas>
              <div class="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span class="text-xl font-bold text-slate-800">{{getProgressionPercent()}}%</span>
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Complété</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Barres: Par matière -->
        <div class="chart-card lg:col-span-1">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-book text-emerald-600"></i> Volume par matière
            </span>
          </div>
          <div *ngIf="!teacherData.heures.length" class="empty-chart">
            <i class="fas fa-book text-4xl opacity-20"></i>
          </div>
          <div *ngIf="teacherData.heures.length" style="padding:16px 20px;" [style.height]="ensSubjectChartHeight">
            <canvas #ensSubject></canvas>
          </div>
        </div>

        <!-- Courbe: Évolution mensuelle -->
        <div class="chart-card lg:col-span-1">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-chart-line text-blue-600"></i> Activité mensuelle
            </span>
          </div>
          <div *ngIf="!teacherData.heures.length" class="empty-chart">
            <i class="fas fa-chart-line text-4xl opacity-20"></i>
          </div>
          <div *ngIf="teacherData.heures.length" style="padding:16px 20px;height:200px;">
            <canvas #ensLine></canvas>
          </div>
        </div>

        <!-- Donut: Validé vs En attente -->
        <div class="chart-card lg:col-span-2">
          <div class="chart-card-header">
            <span class="flex items-center gap-2">
              <i class="fas fa-check-double text-emerald-600"></i> État de validation des heures
            </span>
            <span class="text-xs font-normal text-slate-400">heures réelles</span>
          </div>
          <div *ngIf="!teacherData.heures.length" class="empty-chart">
            <i class="fas fa-check-double text-4xl opacity-20"></i>
          </div>
          <div *ngIf="teacherData.heures.length" class="chart-wrap-donut" style="justify-content: center; gap: 40px;">
            <div style="width:140px;height:140px;flex-shrink:0;position:relative;">
              <canvas #ensStatus></canvas>
            </div>
            <div class="donut-legend" style="flex: 0 1 auto; min-width: 150px;">
              <div class="donut-legend-item">
                <span class="dot bg-emerald-500"></span>
                <span class="legend-label">Validées</span>
                <span class="legend-value">{{getStatusStats().valide | number:'1.0-1'}}h</span>
              </div>
              <div class="donut-legend-item">
                <span class="dot bg-slate-300"></span>
                <span class="legend-label">En attente</span>
                <span class="legend-value">{{getStatusStats().attente | number:'1.0-1'}}h</span>
              </div>
              <div class="donut-legend-item legend-sep">
                <span class="legend-label" style="font-weight:600;color:#0f172a;">Total</span>
                <span class="legend-value">{{teacherData.stats.total_heures | number:'1.0-1'}}h</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="chart-card">
        <div class="chart-card-header">
          <span class="flex items-center gap-2">
            <i class="fas fa-list text-blue-600"></i> Mes dernières séances enregistrées
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Matière</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durée</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Compl.</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngIf="!teacherData.heures.length">
                <td colspan="6" class="px-4 py-10 text-center text-slate-400">
                  <i class="fas fa-clock text-3xl mb-2 opacity-30 block"></i>Aucune heure enregistrée
                </td>
              </tr>
              <tr *ngFor="let h of teacherData.heures" class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 text-slate-600">{{h.date_cours | date:'dd/MM/yyyy'}}</td>
                <td class="px-4 py-3 text-slate-700">{{h.matiere_nom || '-'}}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" [ngClass]="typeClass(h.type_heure)">{{h.type_heure}}</span>
                </td>
                <td class="px-4 py-3 font-bold text-slate-800">{{h.duree}}h</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="h.is_complementaire ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'">
                    {{h.is_complementaire ? 'Oui' : 'Non'}}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="h.valide ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
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
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('deptCanvas')  deptCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas')  lineCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('ensDonut')    ensDonutCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('ensGauge')    ensGaugeCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('ensSubject')  ensSubjectCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ensLine')     ensLineCanvas!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('ensStatus')   ensStatusCanvas!:  ElementRef<HTMLCanvasElement>;

  data: DashboardData | null = null;
  teacherData: any = null;
  annees: AnneeAcademique[] = [];
  selectedAnnee: number | null = null;
  loading = true;

  donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  private chartDonut: Chart | null = null;
  private chartDept:  Chart | null = null;
  private chartLine:  Chart | null = null;

  private chartEnsDonut:   Chart | null = null;
  private chartEnsGauge:   Chart | null = null;
  private chartEnsSubject: Chart | null = null;
  private chartEnsLine:    Chart | null = null;
  private chartEnsStatus:  Chart | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private exportSvc: ExportService,
    private cdr: ChangeDetectorRef
  ) {}

  get isTeacher() { return this.auth.currentUser?.role === 'enseignant'; }
  get userUniversityNom(): string | undefined { return this.auth.currentUser?.university_nom; }
  getAvatarUrl(path: string | undefined) { return this.auth.getAvatarUrl(path); }

  get totalParType(): number {
    return (this.data?.parType || []).reduce((s, t) => s + t.total, 0);
  }
  get deptChartHeight(): string {
    const n = this.data?.parDepartement?.length || 1;
    return (Math.max(n * 46, 130) + 36) + 'px';
  }
  get ensSubjectChartHeight(): string {
    const n = Object.keys(this.getEnsHoursBySubject()).length || 1;
    return (Math.max(n * 40, 120) + 36) + 'px';
  }

  ngOnInit() {
    this.api.getAnnees().subscribe(a => {
      this.annees = a;
      const active = a.find(x => x.is_active);
      this.selectedAnnee = active?.id || a[0]?.id || null;
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  loadData() {
    this.loading = true;
    this.destroyCharts();
    if (this.isTeacher) {
      const ensId = this.auth.currentUser?.enseignant_id;
      if (!ensId) { this.loading = false; return; }
      this.api.getEnseignantHeures(ensId, this.selectedAnnee || undefined).subscribe({
        next: d => { 
          this.teacherData = d; 
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.buildTeacherCharts(), 0);
        },
        error: () => this.loading = false
      });
    } else {
      this.api.getDashboard(this.selectedAnnee || undefined).subscribe({
        next: d => {
          this.data = d;
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.buildCharts(), 0);
        },
        error: () => this.loading = false
      });
    }
  }

  private destroyCharts() {
    this.chartDonut?.destroy();   this.chartDonut = null;
    this.chartDept?.destroy();    this.chartDept  = null;
    this.chartLine?.destroy();    this.chartLine  = null;
    this.chartEnsDonut?.destroy();   this.chartEnsDonut = null;
    this.chartEnsGauge?.destroy();   this.chartEnsGauge = null;
    this.chartEnsSubject?.destroy(); this.chartEnsSubject = null;
    this.chartEnsLine?.destroy();    this.chartEnsLine = null;
    this.chartEnsStatus?.destroy();  this.chartEnsStatus = null;
  }

  private buildCharts() {
    if (!this.data) return;
    this.buildDonut();
    this.buildDept();
    this.buildLine();
  }

  private buildDonut() {
    const el = this.donutCanvas?.nativeElement;
    if (!el || !this.data?.parType?.length) return;
    this.chartDonut?.destroy();
    const types = this.data.parType;
    this.chartDonut = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: types.map(t => t.type_heure),
        datasets: [{
          data: types.map(t => t.total),
          backgroundColor: types.map((_, i) => this.donutColors[i] + 'dd'),
          hoverBackgroundColor: types.map((_, i) => this.donutColors[i]),
          borderWidth: 3,
          borderColor: '#fff',
          hoverBorderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: 900, easing: 'easeInOutQuart' } as any,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label} : ${ctx.parsed}h` }
          }
        }
      }
    });
  }

  private buildDept() {
    const el = this.deptCanvas?.nativeElement;
    if (!el || !this.data?.parDepartement?.length) return;
    this.chartDept?.destroy();
    const depts = this.data.parDepartement;
    const palette = ['#6366f1','#3b82f6','#0ea5e9','#14b8a6','#10b981','#84cc16'];
    this.chartDept = new Chart(el, {
      type: 'bar',
      data: {
        labels: depts.map(d => d.departement_nom),
        datasets: [{
          data: depts.map(d => d.total_heures),
          backgroundColor: depts.map((_, i) => palette[i % palette.length] + 'cc'),
          hoverBackgroundColor: depts.map((_, i) => palette[i % palette.length]),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        animation: { duration: 800, easing: 'easeOutQuart' } as any,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x}h` } }
        },
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#475569', font: { size: 11 } }
          }
        }
      }
    });
  }

  private buildLine() {
    const el = this.lineCanvas?.nativeElement;
    if (!el || !this.data?.mensuel?.length) return;
    this.chartLine?.destroy();
    const mensuel = this.data.mensuel;
    this.chartLine = new Chart(el, {
      type: 'line',
      data: {
        labels: mensuel.map(m => this.formatMois(m.mois)),
        datasets: [{
          label: 'Heures',
          data: mensuel.map(m => m.total_heures),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.10)',
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' } as any,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: { label: (ctx) => ` ${ctx.parsed.y}h` }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => v + 'h' },
            beginAtZero: true
          }
        }
      }
    });
  }

  // --- TEACHER CHARTS ---

  private buildTeacherCharts() {
    if (!this.teacherData) return;
    this.buildEnsDonut();
    this.buildEnsGauge();
    this.buildEnsSubjectBar();
    this.buildEnsLine();
    this.buildEnsStatusDonut();
  }

  private buildEnsDonut() {
    const el = this.ensDonutCanvas?.nativeElement;
    if (!el) return;
    this.chartEnsDonut?.destroy();
    const stats = this.teacherData.stats;
    this.chartEnsDonut = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['CM', 'TD', 'TP'],
        datasets: [{
          data: [stats.total_cm, stats.total_td, stats.total_tp],
          backgroundColor: ['#3b82f6dd', '#10b981dd', '#f59e0bdd'],
          hoverBackgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  private buildEnsGauge() {
    const el = this.ensGaugeCanvas?.nativeElement;
    if (!el) return;
    this.chartEnsGauge?.destroy();
    
    // On calcule le cumul des heures équivalentes
    const totalEq = this.teacherData.heures.reduce((s: number, h: any) => s + Number(h.duree_equivalente || 0), 0);
    const objectif = Number(this.teacherData.enseignant.heures_contractuelles || 192);
    const reste = Math.max(0, objectif - totalEq);
    
    this.chartEnsGauge = new Chart(el, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [totalEq, reste],
          backgroundColor: [totalEq >= objectif ? '#10b981' : '#6366f1', '#f1f5f9'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '85%',
        plugins: { tooltip: { enabled: false }, legend: { display: false } }
      }
    });
  }

  private buildEnsSubjectBar() {
    const el = this.ensSubjectCanvas?.nativeElement;
    if (!el) return;
    this.chartEnsSubject?.destroy();
    const data = this.getEnsHoursBySubject();
    const labels = Object.keys(data);
    const values = Object.values(data);

    this.chartEnsSubject = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: '#10b981cc',
          hoverBackgroundColor: '#10b981',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { 
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x}h` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  private buildEnsLine() {
    const el = this.ensLineCanvas?.nativeElement;
    if (!el) return;
    this.chartEnsLine?.destroy();
    const data = this.getEnsMonthlyHours();
    
    this.chartEnsLine = new Chart(el, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Heures',
          data: data.values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  private buildEnsStatusDonut() {
    const el = this.ensStatusCanvas?.nativeElement;
    if (!el) return;
    this.chartEnsStatus?.destroy();
    const stats = this.getStatusStats();

    this.chartEnsStatus = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Validées', 'En attente'],
        datasets: [{
          data: [stats.valide, stats.attente],
          backgroundColor: ['#10b981dd', '#cbd5e1dd'],
          hoverBackgroundColor: ['#10b981', '#cbd5e1'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { 
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label} : ${ctx.parsed}h` } }
        }
      }
    });
  }

  getProgressionPercent(): number {
    const totalEq = this.teacherData?.heures?.reduce((s: number, h: any) => s + Number(h.duree_equivalente || 0), 0) || 0;
    const objectif = Number(this.teacherData?.enseignant?.heures_contractuelles || 192);
    return Math.round((totalEq / objectif) * 100);
  }

  private getEnsHoursBySubject(): {[key: string]: number} {
    const map: any = {};
    (this.teacherData?.heures || []).forEach((h: any) => {
      const subject = h.matiere_nom || 'Inconnu';
      map[subject] = (map[subject] || 0) + Number(h.duree || 0);
    });
    return map;
  }

  private getEnsMonthlyHours() {
    const map: any = {};
    (this.teacherData?.heures || []).forEach((h: any) => {
      const date = new Date(h.date_cours);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      map[key] = (map[key] || 0) + Number(h.duree || 0);
    });

    const sortedKeys = Object.keys(map).sort();
    return {
      labels: sortedKeys.map(k => this.formatMois(k)),
      values: sortedKeys.map(k => map[k])
    };
  }

  getStatusStats(): {valide: number, attente: number} {
    let valide = 0, attente = 0;
    (this.teacherData?.heures || []).forEach((h: any) => {
      if (h.valide) valide += Number(h.duree || 0);
      else attente += Number(h.duree || 0);
    });
    return { valide, attente };
  }

  exportPDF() {
    if (!this.teacherData) return;
    const anneeLibelle = this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
    this.exportSvc.exportIndividuelPDF(this.teacherData, anneeLibelle);
  }

  getTopPercent(val: number): number {
    if (!this.data?.topEnseignants?.length) return 0;
    const max = Math.max(...this.data.topEnseignants.map(e => e.total), 1);
    return (val / max) * 100;
  }

  typeClass(t: string): string {
    return ({ CM: 'badge-blue', TD: 'badge-green', TP: 'badge-orange' } as any)[t] || 'badge-gray';
  }

  formatMois(mois: string): string {
    const [, m] = mois.split('-');
    const names = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return names[parseInt(m) - 1] || mois;
  }

  getAnneeLibelle(): string {
    return this.annees.find(a => a.id == this.selectedAnnee)?.libelle || '';
  }
}
