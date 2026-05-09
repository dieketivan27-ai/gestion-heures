import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelImportService, ExcelImportRow } from '../../core/services/excel-import.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-5">
      <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
        <i class="fas fa-file-import text-blue-600"></i> Importation de données
      </h1>
      <p class="text-sm text-slate-500 mt-0.5">Importez massivement vos enseignants et leurs heures depuis un fichier Excel</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Zone d'upload -->
      <div class="lg:col-span-1 space-y-4">
        <div 
          class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group relative"
          [class.border-blue-500]="isDragging"
          [class.bg-blue-50]="isDragging"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          
          <input #fileInput type="file" class="hidden" accept=".xlsx, .xls" (change)="onFileChange($event)">
          
          <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <i class="fas fa-cloud-upload-alt text-2xl"></i>
          </div>
          <h4 class="text-slate-700 font-bold mb-1">Glissez-déposez ici</h4>
          <p class="text-xs text-slate-400">ou cliquez pour parcourir vos fichiers (.xlsx, .xls)</p>
          
          <div *ngIf="selectedFile" class="mt-4 p-3 bg-white rounded-lg border border-blue-100 flex items-center gap-3 shadow-sm relative group/file">
            <i class="fas fa-file-excel text-emerald-500 text-xl"></i>
            <div class="text-left overflow-hidden flex-1">
              <div class="text-xs font-bold text-slate-700 truncate">{{selectedFile.name}}</div>
              <div class="text-[10px] text-slate-400">{{(selectedFile.size / 1024) | number:'1.0-1'}} KB</div>
            </div>
            <button (click)="reset(); $event.stopPropagation()" class="w-6 h-6 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>

        <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h5 class="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
            <i class="fas fa-info-circle"></i> Instructions
          </h5>
          <ul class="text-[11px] text-blue-700 space-y-1.5 leading-tight">
            <li>• Votre fichier doit contenir des colonnes identifiables (Matricule, Nom, Heures CM, etc.)</li>
            <li>• Le format du matricule doit être <span class="font-bold">ENSxxx</span>.</li>
            <li>• L'importation créera automatiquement les comptes utilisateurs manquants.</li>
          </ul>
        </div>
      </div>

      <!-- Prévisualisation et Validation -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
          <div class="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
            <h3 class="font-bold text-slate-800">Aperçu des données</h3>
            <div class="flex items-center gap-2" *ngIf="previewData.length">
              <span class="text-[10px] font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg mr-2">
                {{validCount}} valide(s)
              </span>
              <button 
                (click)="reset()"
                [disabled]="importing"
                class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-2">
                <i class="fas fa-undo"></i>
                Réinitialiser
              </button>
              <button 
                [disabled]="!canImport || importing"
                (click)="doImport()"
                class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50">
                <i class="fas fa-check" *ngIf="!importing"></i>
                <span class="spinner !w-3 !h-3 !border-white !border-t-transparent" *ngIf="importing"></span>
                {{importing ? "Importation..." : "Valider l'import"}}
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-auto">
            <div *ngIf="!previewData.length" class="flex flex-col items-center justify-center h-full py-20 text-slate-300">
              <i class="fas fa-table text-5xl mb-4 opacity-20"></i>
              <p class="text-sm">Aucun aperçu disponible. Sélectionnez un fichier.</p>
            </div>

            <table class="w-full text-xs text-left" *ngIf="previewData.length">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Matricule</th>
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Enseignant</th>
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-center">CM</th>
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-center">TD</th>
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-center">TP</th>
                  <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Statut / Erreurs</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let row of previewData" [ngClass]="{'bg-red-50/30': !row.isValid}" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3">
                    <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]" [class.text-red-600]="!row.isValid && (row.errors?.join('') || '').includes('Matricule')">
                      {{row.matricule || 'N/A'}}
                    </code>
                  </td>
                  <td class="px-4 py-3 font-semibold text-slate-700">{{row.nom}}</td>
                  <td class="px-4 py-3 text-center">{{row.heures_cm}}h</td>
                  <td class="px-4 py-3 text-center">{{row.heures_td}}h</td>
                  <td class="px-4 py-3 text-center">{{row.heures_tp}}h</td>
                  <td class="px-4 py-3">
                    <div *ngIf="row.isValid" class="flex items-center gap-1.5 text-emerald-600 font-bold uppercase text-[9px]">
                      <i class="fas fa-check-circle"></i> Valide
                    </div>
                    <div *ngIf="!row.isValid" class="space-y-1">
                      <div *ngFor="let err of row.errors" class="text-[9px] text-red-500 flex items-center gap-1 leading-none">
                        <i class="fas fa-exclamation-triangle flex-shrink-0"></i>
                        <span>{{err}}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer de statut après import -->
          <div *ngIf="importResult" class="p-4 border-t" [ngClass]="importResult.errorCount > 0 ? 'bg-amber-50' : 'bg-emerald-50'">
             <div class="flex items-center justify-between">
                <div class="text-sm font-medium">
                   <span class="text-emerald-700 font-bold">{{importResult.importedCount}} importés</span>
                   <span *ngIf="importResult.errorCount > 0" class="ml-2 text-amber-700 font-bold">{{importResult.errorCount}} erreurs</span>
                </div>
                <button (click)="reset()" class="text-xs text-slate-500 hover:underline">Réinitialiser</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ImportComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  isDragging = false;
  selectedFile: File | null = null;
  previewData: ExcelImportRow[] = [];
  importing = false;
  importResult: any = null;

  constructor(
    private excelService: ExcelImportService,
    private api: ApiService
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  async handleFile(file: File) {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      window.alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    this.selectedFile = file;
    this.importResult = null;
    
    try {
      const raw = await this.excelService.parseExcel(file);
      this.previewData = this.excelService.mapAndValidateData(raw);
    } catch (error: any) {
      window.alert(error?.message || error || 'Erreur lors de la lecture du fichier');
    }
  }

  get canImport(): boolean {
    return this.previewData.some(r => r.isValid);
  }

  get validCount(): number {
    return this.previewData.filter(r => r.isValid).length;
  }

  reset() {
    this.selectedFile = null;
    this.previewData = [];
    this.importResult = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  doImport() {
    if (!this.selectedFile) return;
    this.importing = true;
    
    this.api.importExcel(this.selectedFile).subscribe({
      next: (res: any) => {
        this.importing = false;
        this.importResult = res;
        const msg = `${res.importedCount} enseignants importés avec succès !` + (res.errorCount > 0 ? ` (${res.errorCount} erreurs détectées)` : "");
        window.alert(msg);
      },
      error: (err: any) => {
        this.importing = false;
        const errMsg = err.error?.message || err.message || "Erreur inconnue";
        window.alert(`Erreur lors de l'importation : ${errMsg}`);
      }
    });
  }
}
