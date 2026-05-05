import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor() { }

  /**
   * Génère un fichier Excel à partir de données brutes
   */
  exportExcel(data: any[], headers: string[], filename: string) {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  /**
   * Formate un montant en FCFA de façon sécurisée (évite les espaces insécables de toLocaleString)
   */
  private formatFCFA(amount: any): string {
    const value = Math.round(Number(amount || 0));
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' FCFA';
  }

  /**
   * Génère le rapport PDF global/compta
   */
  exportGlobalPDF(data: any[], view: 'global' | 'compta', anneeLibelle: string) {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(18);
    doc.text(view === 'global' ? 'État Global des Heures' : 'État de Paiement Comptabilité', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Année Académique : ${anneeLibelle}`, 14, 30);

    const body = view === 'global' ?
      data.map(r => [
        r.matricule || '-', `${r.nom} ${r.prenom}`, r.grade, r.statut,
        (Number(r.cm_normal || 0) + Number(r.cm_comp || 0)).toFixed(1),
        (Number(r.td_normal || 0) + Number(r.td_comp || 0)).toFixed(1),
        (Number(r.tp_normal || 0) + Number(r.tp_comp || 0)).toFixed(1),
        this.formatFCFA(r.montant_total)
      ]) :
      data.map(r => [
        r.matricule || '-', `${r.nom} ${r.prenom}`, r.statut,
        (Number(r.cm_normal || 0) + Number(r.cm_comp || 0) + Number(r.td_normal || 0) + Number(r.td_comp || 0) + Number(r.tp_normal || 0) + Number(r.tp_comp || 0)).toFixed(1),
        (Number(r.cm_comp || 0) + Number(r.td_comp || 0) + Number(r.tp_comp || 0)).toFixed(1),
        this.formatFCFA(r.montant_total)
      ]);

    autoTable(doc, {
      startY: 35,
      head: [view === 'global' ?
        ['Matr.', 'Enseignant', 'Grade', 'Statut', 'CM', 'TD', 'TP', 'Total'] :
        ['Matr.', 'Enseignant', 'Statut', 'Heures Tot.', 'Heures Comp.', 'Montant']
      ],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [66, 99, 235] }
    });

    doc.save(`rapport_${view}_${anneeLibelle}.pdf`);
  }

  /**
   * Génère la fiche individuelle d'un enseignant
   */
  exportIndividuelPDF(enseignantData: any, anneeLibelle: string) {
    console.log('ExportIndividuelPDF called with:', enseignantData);
    if (!enseignantData || !enseignantData.enseignant) {
       console.error('Données enseignant invalides:', enseignantData);
       alert('Données invalides pour l\'export PDF');
       return;
    }
    const doc = new jsPDF();
    const e = enseignantData.enseignant || {};
    const s = enseignantData.stats || { total_heures: 0, total_cm: 0, total_td: 0, total_tp: 0, heures_complementaires: 0 };
    const heures = enseignantData.heures || [];

    // Titre
    doc.setFontSize(18);
    doc.setTextColor(66, 99, 235);
    doc.text('FICHE INDIVIDUELLE D\'ENSEIGNEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Année Académique : ${anneeLibelle || 'N/A'}`, 14, 30);
    
    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    // Informations Enseignant
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`${e.nom || '-'} ${e.prenom || '-'}`, 14, 45);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Matricule : ${e.matricule || '-'}`, 14, 52);
    doc.text(`Grade : ${e.grade || '-'}`, 14, 57);
    doc.text(`Statut : ${e.statut || '-'}`, 14, 62);
    doc.text(`Département : ${e.departement_nom || '-'}`, 14, 67);

    // Résumé
    doc.setFillColor(248, 250, 252);
    doc.rect(130, 40, 66, 30, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('RÉSUMÉ DES HEURES', 135, 48);
    doc.setFontSize(10);
    doc.text(`Total Heures : ${Number(s.total_heures || 0).toFixed(1)}h`, 135, 55);
    doc.text(`Contractuelles : ${e.heures_contractuelles || 0}h`, 135, 60);
    doc.setTextColor(235, 150, 0);
    doc.text(`Heures Comp. : ${Number(s.heures_complementaires || 0).toFixed(1)}h`, 135, 65);

    // Tableau des heures
    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Matière', 'Type', 'Durée', 'Comp.', 'Validé']],
      body: heures.map((h: any) => [
        new Date(h.date_cours).toLocaleDateString(),
        h.matiere_nom || '-',
        h.type_heure,
        h.duree + 'h',
        h.is_complementaire ? 'Oui' : 'Non',
        h.valide ? 'Oui' : 'Non'
      ]),
      headStyles: { fillColor: [66, 99, 235] },
      margin: { top: 75 }
    });

    doc.save(`fiche_${e.nom}_${anneeLibelle}.pdf`);
  }
}
