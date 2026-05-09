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
          <button (click)="close()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div class="modal-body p-6 max-h-[70vh] overflow-y-auto">
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
              <button (click)="reset()" class="text-xs text-red-500 hover:underline">Changer de fichier</button>
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
          <button (click)="close()" class="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Annuler</button>
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
  `]
})
export class ExcelImportModalComponent {
  @Output() imported = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  previewData: ExcelImportRow[] = [];
  importing = false;
  selectedFile: File | null = null;

  constructor(
    private excelService: ExcelImportService,
    private api: ApiService
  ) {}

  async onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedFile = file;
    
    try {
      const raw = await this.excelService.parseExcel(file);
      this.previewData = this.excelService.mapAndValidateData(raw);
    } catch (error) {
      alert(error);
    }
  }

  get canImport(): boolean {
    return this.previewData.some(r => r.isValid);
  }

  get validCount(): number {
    return this.previewData.filter(r => r.isValid).length;
  }

  close() {
    this.closed.emit();
  }

  reset() {
    this.previewData = [];
    this.selectedFile = null;
  }

  doImport() {
    if (!this.selectedFile) return;
    this.importing = true;
    
    // On utilise l'API backend existante qui accepte le fichier multipart
    this.api.importExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.importing = false;
        this.imported.emit(res);
      },
      error: (err) => {
        this.importing = false;
        alert('Erreur lors de l\'importation : ' + (err.error?.message || err.message));
      }
    });
  }
}
