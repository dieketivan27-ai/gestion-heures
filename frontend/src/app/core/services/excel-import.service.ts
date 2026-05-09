import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Observable, of } from 'rxjs';

export interface ExcelImportRow {
  matricule: string;
  nom: string;
  grade?: string;
  statut?: string;
  departement?: string;
  heures_cm: number;
  heures_td: number;
  heures_tp: number;
  isValid?: boolean;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class ExcelImportService {

  constructor() {}

  /**
   * Parse un fichier Excel et retourne un tableau d'objets JSON
   */
  public parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject('Erreur lors de la lecture du fichier Excel');
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Mappe et valide les données JSON brutes vers le format ExcelImportRow
   */
  public mapAndValidateData(rawData: any[]): ExcelImportRow[] {
    return rawData.map(row => {
      const errors: string[] = [];
      
      // Mapping dynamique (on cherche les colonnes approchantes)
      const matricule = this.findValue(row, ['matricule', 'matr', 'id']);
      const nom = this.findValue(row, ['nom', 'enseignant', 'professeur', 'nom complet']);
      const grade = this.findValue(row, ['grade', 'titre']);
      const statut = this.findValue(row, ['statut', 'type']);
      const dept = this.findValue(row, ['département', 'departement', 'dept']);
      
      const hCM = this.findValue(row, ['cm', 'cours magistral', 'heures cm']);
      const hTD = this.findValue(row, ['td', 'travaux dirigés', 'heures td']);
      const hTP = this.findValue(row, ['tp', 'travaux pratiques', 'heures tp']);

      // Validation Matricule
      if (!matricule) {
        errors.push('Matricule manquant');
      } else if (!/^ENS\d+$/.test(matricule.toString().trim().toUpperCase())) {
        errors.push('Format matricule invalide (attendu: ENSxxx)');
      }

      // Validation Nom
      if (!nom) errors.push('Nom manquant');

      // Validation Heures (doivent être des nombres)
      const numCM = parseFloat(hCM);
      const numTD = parseFloat(hTD);
      const numTP = parseFloat(hTP);

      if (isNaN(numCM) && hCM !== undefined && hCM !== null) errors.push('Heures CM invalides');
      if (isNaN(numTD) && hTD !== undefined && hTD !== null) errors.push('Heures TD invalides');
      if (isNaN(numTP) && hTP !== undefined && hTP !== null) errors.push('Heures TP invalides');

      return {
        matricule: matricule?.toString() || '',
        nom: nom?.toString() || '',
        grade: grade?.toString() || '',
        statut: statut?.toString() || 'Permanent',
        departement: dept?.toString() || '',
        heures_cm: isNaN(numCM) ? 0 : numCM,
        heures_td: isNaN(numTD) ? 0 : numTD,
        heures_tp: isNaN(numTP) ? 0 : numTP,
        isValid: errors.length === 0,
        errors: errors
      };
    });
  }

  /**
   * Helper pour trouver une valeur dans un objet à partir d'une liste de clés possibles
   */
  private findValue(row: any, possibleKeys: string[]): any {
    const rowKeys = Object.keys(row);
    for (const key of possibleKeys) {
      const foundKey = rowKeys.find(rk => rk.toLowerCase().trim().includes(key.toLowerCase()));
      if (foundKey) return row[foundKey];
    }
    return undefined;
  }
}
