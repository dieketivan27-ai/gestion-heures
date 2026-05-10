import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelImportService, ExcelImportRow } from '../../core/services/excel-import.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-excel-import-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal max-w-4xl w-full" (click)="$event.stopPropagation()">
        <div class="modal-header border-b border-slate-100 p-5">
          <div>
            <h3 class="modal-title text-lg font-bold text-slate-800">Importation Enseignants (Excel)</h3>
            <p class="text-xs text-slate-400 mt-0.5">Sélectionnez un fichier .xlsx pour importer des données en masse</p>
          </div>
          <button (click)="close()" [disabled]="importing" class="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div class="modal-body p-6 max-h-[70vh] overflow-y-auto">
          <!-- Alerte d'erreur -->
          <div *ngIf="globalError" class="mb-5 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-shake">
            <div class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
              <i class="fas fa-exclamation-triangle text-sm"></i>
            </div>
            <div class="flex-1">
              <h4 class="text-sm font-bold text-red-800">Une erreur est survenue</h4>
              <p class="text-xs text-red-600/80 leading-relaxed mt-0.5">{{globalError}}</p>
            </div>
            <button (click)="clearError()" class="text-red-400 hover:text-red-600 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Zone de Drop / Sélection -->
          <div *ngIf="!previewData.length" 
               class="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
               (click)="fileInput.click()">
            <input #fileInput type="file" class="hidden" accept=".xlsx, .xls" (change)="onFileChange($event)">
            <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <i class="fas fa-file-excel text-2xl"></i>
            </div>
            <h4 class="text-slate-700 font-bold mb-1">Cliquez pour choisir un fichier</h4>
            <p class="text-xs text-slate-400">Format accepté : .xlsx, .xls</p>
          </div>

          <!-- Prévisualisation -->
          <div *ngIf="previewData.length">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm font-bold text-slate-700">{{previewData.length}} lignes détectées</span>
              <button (click)="reset()" [disabled]="importing" class="text-xs text-red-500 hover:underline disabled:opacity-30">Changer de fichier</button>
            </div>

            <div class="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="bg-white border-b border-slate-100">
                    <th class="px-3 py-2 font-bold text-slate-500">Matricule</th>
                    <th class="px-3 py-2 font-bold text-slate-500">Enseignant</th>
                    <th class="px-3 py-2 font-bold text-slate-500">CM</th>
                    <th class="px-3 py-2 font-bold text-slate-500">TD</th>
                    <th class="px-3 py-2 font-bold text-slate-500">TP</th>
                    <th class="px-3 py-2 font-bold text-slate-500">Statut</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let row of previewData" [class.bg-red-50]="!row.isValid">
                    <td class="px-3 py-2">
                      <span class="font-mono" [class.text-red-500]="row.errors?.includes('Matricule manquant') || row.errors?.includes('Format matricule invalide (attendu: ENSxxx)')">
                        {{row.matricule}}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      <div class="font-semibold text-slate-700">{{row.nom}}</div>
                      <div class="text-[10px] text-slate-400">{{row.departement}}</div>
                    </td>
                    <td class="px-3 py-2">{{row.heures_cm}}h</td>
                    <td class="px-3 py-2">{{row.heures_td}}h</td>
                    <td class="px-3 py-2">{{row.heures_tp}}h</td>
                    <td class="px-3 py-2">
                      <div class="flex flex-col gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded" 
                              [ngClass]="row.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
                          {{row.isValid ? 'OK' : 'Erreur'}}
                        </span>
                        <div *ngFor="let err of row.errors" class="text-[9px] text-red-500 leading-none">{{err}}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer border-t border-slate-100 p-5 bg-slate-50/30 flex justify-end gap-3 rounded-b-xl">
          <button (click)="close()" [disabled]="importing" class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-30">Annuler</button>
          <button *ngIf="previewData.length" 
                  [disabled]="!canImport || importing"
                  (click)="doImport()"
                  class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fas fa-file-import" *ngIf="!importing"></i>
            <span class="spinner !w-3 !h-3 !border-white !border-t-transparent" *ngIf="importing"></span>
            Confirmer l'importation ({{validCount}})
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .animate-shake {
      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `]
})
export class ExcelImportModalComponent {
  @Output() imported = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  previewData: ExcelImportRow[] = [];
  importing = false;
  selectedFile: File | null = null;
  globalError: string | null = null;

  constructor(
    private excelService: ExcelImportService,
    private api: ApiService
  ) {}

  async onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    
    this.reset(); // On réinitialise tout au début d'un nouvel import
    this.selectedFile = file;
    
    try {
      const result = await this.excelService.parseExcel(file);
      this.previewData = this.excelService.mapAndValidateData(result.rows);
      
      if (this.previewData.length === 0) {
        this.globalError = "Le fichier semble vide ou ne contient aucune donnée valide.";
      }
    } catch (error: any) {
      console.error('Excel parse error:', error);
      this.globalError = typeof error === 'string' ? error : (error.message || "Erreur lors de la lecture du fichier Excel.");
      this.previewData = [];
    }
  }

  get canImport(): boolean {
    return this.previewData.some(r => r.isValid) && !this.importing;
  }

  get validCount(): number {
    return this.previewData.filter(r => r.isValid).length;
  }

  close() {
    if (this.importing) return;
    this.closed.emit();
  }

  reset() {
    this.previewData = [];
    this.selectedFile = null;
    this.globalError = null;
    this.importing = false;
  }

  clearError() {
    this.globalError = null;
  }

  doImport() {
    const validData = this.previewData.filter(r => r.isValid);
    if (!validData.length || this.importing) return;
    
    this.importing = true;
    this.globalError = null;
    
    // On envoie uniquement les lignes valides sous forme de JSON
    this.api.importJson(validData).subscribe({
      next: (res) => {
        this.importing = false;
        this.imported.emit(res);
      },
      error: (err) => {
        this.importing = false;
        console.error('Import error:', err);
        this.globalError = err.error?.message || err.message || "Une erreur inconnue est survenue lors de l'importation.";
      }
    });
  }
}
