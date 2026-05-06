const db = require('../config/database');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const { auditLog } = require('../middleware/audit');

exports.getDashboard = async (req, res) => {
  const { annee_id } = req.query;

  // Si c'est un enseignant, on redirige ou on limite les stats
  if (req.user.role === 'enseignant') {
    // Les enseignants ont leur propre vue dans le frontend qui appelle d'autres endpoints.
    // Par sécurité, on bloque l'accès aux stats globales.
    return res.status(403).json({ message: 'Accès au tableau de bord global interdit' });
  }

  try {
    // Année active si non précisée
    let anneeId = annee_id;
    let whereAnnee = '';
    const queryParamsAnnee = [];
    if (anneeId && anneeId !== 'ALL') {
      whereAnnee = ' AND h.annee_academique_id=? ';
      queryParamsAnnee.push(anneeId);
    }

    const [totalEnseignants] = await db.execute('SELECT COUNT(*) as total FROM enseignants');
    const [totalHeures] = await db.execute(
      `SELECT COALESCE(SUM(duree),0) as total, 
              COALESCE(SUM(CASE WHEN is_complementaire=1 THEN duree ELSE 0 END),0) as complementaires
       FROM heures_effectuees h WHERE valide=1 ${whereAnnee}`, queryParamsAnnee
    );
    const [parType] = await db.execute(
      `SELECT type_heure, COALESCE(SUM(duree),0) as total
       FROM heures_effectuees h WHERE valide=1 ${whereAnnee} GROUP BY type_heure`, queryParamsAnnee
    );
    const [parDepartement] = await db.execute(
      `SELECT d.nom as departement_nom, COALESCE(SUM(h.duree),0) as total_heures,
              COUNT(DISTINCT e.id) as nb_enseignants
       FROM departements d
       LEFT JOIN enseignants e ON e.departement_id = d.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id = e.id ${whereAnnee.replace('AND h.', 'AND ')}
       GROUP BY d.id ORDER BY total_heures DESC`, queryParamsAnnee
    );
    const [enDepassement] = await db.execute(
      `SELECT e.nom, e.prenom, e.grade, e.statut, e.heures_contractuelles, u.avatar_url,
              COALESCE(SUM(h.duree_equivalente),0) as total_effectuees,
              COALESCE(SUM(h.duree_equivalente),0) - e.heures_contractuelles as depassement
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id=e.id ${whereAnnee.replace('AND h.', 'AND ')}
       WHERE e.statut='Permanent'
       GROUP BY e.id HAVING total_effectuees > e.heures_contractuelles
       ORDER BY depassement DESC`, queryParamsAnnee
    );
    const [mensuel] = await db.execute(
      `SELECT DATE_FORMAT(date_cours,'%Y-%m') as mois,
              COALESCE(SUM(duree),0) as total_heures,
              COUNT(*) as nb_seances
       FROM heures_effectuees h WHERE h.valide=1 ${whereAnnee}
       GROUP BY mois ORDER BY mois`, queryParamsAnnee
    );
    const [topEnseignants] = await db.execute(
      `SELECT e.nom, e.prenom, e.grade, u.avatar_url, COALESCE(SUM(h.duree),0) as total
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id=e.id ${whereAnnee.replace('AND h.', 'AND ')} AND h.valide=1
       GROUP BY e.id ORDER BY total DESC LIMIT 5`, queryParamsAnnee
    );

    const [teacherAvatars] = await db.execute(
      `SELECT DISTINCT u.avatar_url, e.nom, e.prenom
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id = e.id ${whereAnnee.replace('AND h.', 'AND ')}
       LIMIT 5`, queryParamsAnnee
    );

    res.json({
      totalEnseignants: Number(totalEnseignants[0].total || 0),
      totalHeures: {
        total: Number(totalHeures[0].total || 0),
        complementaires: Number(totalHeures[0].complementaires || 0)
      },
      parType: parType.map(t => ({ ...t, total: Number(t.total || 0) })),
      parDepartement: parDepartement.map(d => ({ ...d, departement: d.departement_nom, total_heures: Number(d.total_heures || 0) })),
      enDepassement: enDepassement.map(e => ({ 
        ...e, 
        total_effectuees: Number(e.total_effectuees || 0),
        depassement: Number(e.depassement || 0)
      })),
      mensuel: mensuel.map(m => ({ ...m, total_heures: Number(m.total_heures || 0) })),
      topEnseignants: topEnseignants.map(e => ({ ...e, total: Number(e.total || 0) })),
      teacherAvatars: teacherAvatars.map(a => ({ avatar_url: a.avatar_url, name: `${a.prenom} ${a.nom}` }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getEtatPaiement = async (req, res) => {
  const { annee_id } = req.query;
  try {
    let anneeId = annee_id;
    let whereAnnee = '';
    const paramsHeures = [];
    if (anneeId && anneeId !== 'ALL') {
      whereAnnee = ' WHERE h.annee_academique_id = ? AND h.valide = 1 ';
      paramsHeures.push(anneeId);
    } else {
      whereAnnee = ' WHERE h.valide = 1 ';
    }
    // 1. Récupérer les enseignants
    const [enseignants] = await db.execute(`
      SELECT e.id, e.matricule, e.nom, e.prenom, e.grade, e.statut,
             d.nom as departement_nom, u.avatar_url,
             e.taux_horaire_cm, e.taux_horaire_td, e.taux_horaire_tp,
             e.heures_contractuelles
      FROM enseignants e
      LEFT JOIN departements d ON e.departement_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.nom, e.prenom
    `);

    // 2. Récupérer toutes les heures validées de l'année
    const [heures] = await db.execute(`
      SELECT h.enseignant_id, h.type_heure, h.duree, h.duree_equivalente, h.date_cours, h.id
      FROM heures_effectuees h
      ${whereAnnee}
      ORDER BY h.enseignant_id, h.date_cours ASC, h.id ASC
    `, paramsHeures);

    // 3. Calcul par enseignant
    const result = enseignants.map(e => {
      const eHeures = heures.filter(h => h.enseignant_id === e.id);
      const seuil = Number(e.heures_contractuelles || 0);
      
      let cumulEquiv = 0;
      let cmNormal = 0, tdNormal = 0, tpNormal = 0;
      let cmComp = 0, tdComp = 0, tpComp = 0;

      for (const h of eHeures) {
        const dEquiv = Number(h.duree_equivalente || 0);
        const dReelle = Number(h.duree || 0);
        
        // On calcule la partie qui est "normale" (sous le seuil)
        // et la partie "complémentaire" (au dessus)
        let partNormaleEquiv = 0;
        let partCompEquiv = 0;

        if (cumulEquiv >= seuil) {
          // Déjà au dessus du seuil
          partCompEquiv = dEquiv;
        } else if (cumulEquiv + dEquiv > seuil) {
          // On traverse le seuil
          partNormaleEquiv = seuil - cumulEquiv;
          partCompEquiv = dEquiv - partNormaleEquiv;
        } else {
          // Entièrement sous le seuil
          partNormaleEquiv = dEquiv;
        }

        // On reporte au prorata sur la durée réelle pour chaque type
        const ratioNorm = dEquiv > 0 ? (partNormaleEquiv / dEquiv) : 1;
        const ratioComp = dEquiv > 0 ? (partCompEquiv / dEquiv) : 0;

        if (h.type_heure === 'CM') {
          cmNormal += dReelle * ratioNorm;
          cmComp += dReelle * ratioComp;
        } else if (h.type_heure === 'TD') {
          tdNormal += dReelle * ratioNorm;
          tdComp += dReelle * ratioComp;
        } else if (h.type_heure === 'TP') {
          tpNormal += dReelle * ratioNorm;
          tpComp += dReelle * ratioComp;
        }

        cumulEquiv += dEquiv;
      }

      const tCM = Number(e.taux_horaire_cm || 0);
      const tTD = Number(e.taux_horaire_td || 0);
      const tTP = Number(e.taux_horaire_tp || 0);

      // Pour les vacataires (seuil=0), tout finit en cmComp etc car cumulEquiv >= 0.
      // Mais pour le rapport, on suit la logique de paye :
      // Permanents : payés uniquement sur la partie Comp
      // Vacataires : payés sur tout (Normal + Comp)
      const payCM = e.statut === 'Permanent' ? cmComp : (cmNormal + cmComp);
      const payTD = e.statut === 'Permanent' ? tdComp : (tdNormal + tdComp);
      const payTP = e.statut === 'Permanent' ? tpComp : (tpNormal + tpComp);

      return {
        id: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        grade: e.grade,
        statut: e.statut,
        departement: e.departement_nom,
        departement_nom: e.departement_nom,
        taux_horaire_cm: tCM,
        taux_horaire_td: tTD,
        taux_horaire_tp: tTP,
        heures_contractuelles: seuil,
        cm_normal: cmNormal,
        td_normal: tdNormal,
        tp_normal: tpNormal,
        cm_comp: cmComp,
        td_comp: tdComp,
        tp_comp: tpComp,
        montant_cm: payCM * tCM,
        montant_td: payTD * tTD,
        montant_tp: payTP * tTP,
        montant_total: (payCM * tCM) + (payTD * tTD) + (payTP * tTP),
        avatar_url: e.avatar_url
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

  const workbook = new ExcelJS.Workbook();
  const conn = await db.getConnection();
  
  try {
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
    // On cherche les headers intelligemment
    let headerRow = null;
    worksheet.eachRow((row, rowNumber) => {
      if (!headerRow) {
        let isHeader = false;
        row.eachCell((cell) => {
          const val = cell.value?.toString().toLowerCase().trim() || '';
          if (val.includes('matricule') || val.includes('nom') || val.includes('enseignant')) {
            isHeader = true;
          }
        });
        if (isHeader) headerRow = row;
      }
    });

    if (!headerRow) throw new Error('Impossible de trouver la ligne d\'en-tête contenant Matricule ou Nom');

    const colMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().toLowerCase().trim();
      if (val?.includes('matricule') || val?.includes('matr')) colMap.matricule = colNumber;
      if (val?.includes('nom') || val?.includes('enseignant')) colMap.nom = colNumber;
      if (val?.includes('grade')) colMap.grade = colNumber;
      if (val?.includes('statut')) colMap.statut = colNumber;
      if (val?.includes('département') || val?.includes('departement') || val?.includes('dept')) colMap.dept = colNumber;
      if (val?.includes('cm') && !val?.includes('montant')) colMap.cm = colNumber;
      if (val?.includes('td') && !val?.includes('montant')) colMap.td = colNumber;
      if (val?.includes('tp') && !val?.includes('montant')) colMap.tp = colNumber;
    });

    // On récupère l'année active
    const [annees] = await conn.execute('SELECT id FROM annees_academiques WHERE is_active = TRUE LIMIT 1');
    const anneeId = annees[0]?.id;
    if (!anneeId) throw new Error('Aucune année académique active trouvée');

    await conn.beginTransaction();

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Helper for safely extracting values, handling exceljs formulas
    const getCellValue = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
      return cell.value;
    };

    // On itère sur les lignes après le header
    for (let i = headerRow.rowNumber + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const matricule = getCellValue(row.getCell(colMap.matricule || 1))?.toString().trim();
      if (!matricule) continue;

      try {
        const nom = getCellValue(row.getCell(colMap.nom || 2))?.toString().trim();
        const grade = getCellValue(row.getCell(colMap.grade || 3))?.toString().trim();
        const statut = getCellValue(row.getCell(colMap.statut || 4))?.toString().trim() || 'Permanent';
        const deptName = getCellValue(row.getCell(colMap.dept || 5))?.toString().trim();
        const hCM = parseFloat(getCellValue(row.getCell(colMap.cm || 6))) || 0;
        const hTD = parseFloat(getCellValue(row.getCell(colMap.td || 7))) || 0;
        const hTP = parseFloat(getCellValue(row.getCell(colMap.tp || 8))) || 0;

        // 1. Gérer le département
        let deptId = null;
        if (deptName) {
          const [depts] = await conn.execute('SELECT id FROM departements WHERE nom = ? OR code = ?', [deptName, deptName]);
          if (depts.length) {
            deptId = depts[0].id;
          } else {
            const [newDept] = await conn.execute('INSERT INTO departements (nom, code) VALUES (?, ?)', [deptName, deptName.substring(0, 5).toUpperCase()]);
            deptId = newDept.insertId;
          }
        }

        // 2. Chercher l'enseignant
        const [ensRows] = await conn.execute('SELECT id, user_id FROM enseignants WHERE matricule = ?', [matricule]);
        let enseignantId;

        if (ensRows.length) {
          enseignantId = ensRows[0].id;
          // Mise à jour
          await conn.execute(
            'UPDATE enseignants SET nom=?, grade=?, statut=?, departement_id=? WHERE id=?',
            [nom, grade, statut, deptId, enseignantId]
          );
        } else {
          // Création Enseignant + User
          const tempEmail = `${matricule.toLowerCase()}@import.excel`;
          const tempPassword = 'Temp' + Math.floor(1000 + Math.random() * 9000);
          const hash = await bcrypt.hash(tempPassword, 10);
          
          const [userRes] = await conn.execute(
            'INSERT INTO users (email, password, role, must_change_password) VALUES (?,?,?,TRUE)',
            [tempEmail, hash, 'enseignant']
          );
          const user_id = userRes.insertId;

          const [newEns] = await conn.execute(
            `INSERT INTO enseignants (user_id, matricule, nom, prenom, email, grade, statut, departement_id, heures_contractuelles)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [user_id, matricule, nom, '', tempEmail, grade, statut, deptId, statut === 'Vacataire' ? 0 : 192]
          );
          enseignantId = newEns.insertId;
        }

        // 3. Gérer les heures (On supprime les anciens imports pour ce prof/année)
        await conn.execute(
          'DELETE FROM heures_effectuees WHERE enseignant_id = ? AND annee_academique_id = ? AND observations = "IMPORT_EXCEL"',
          [enseignantId, anneeId]
        );

        const seances = [
          { type: 'CM', duree: hCM },
          { type: 'TD', duree: hTD },
          { type: 'TP', duree: hTP }
        ];

        for (const s of seances) {
          if (s.duree > 0) {
            // Calcul durée équivalente simple (on pourrait raffiner avec les paramètres)
            let dureeEquiv = s.duree;
            if (s.type === 'TD') dureeEquiv = s.duree * 0.66;
            if (s.type === 'TP') dureeEquiv = s.duree * 0.5;

            await conn.execute(
              `INSERT INTO heures_effectuees (enseignant_id, annee_academique_id, date_cours, type_heure, duree, duree_equivalente, valide, observations)
               VALUES (?, ?, CURDATE(), ?, ?, ?, TRUE, "IMPORT_EXCEL")`,
              [enseignantId, anneeId, s.type, s.duree, dureeEquiv]
            );
          }
        }

        importedCount++;
      } catch (rowErr) {
        errorCount++;
        errors.push(`Ligne ${i} (${matricule}): ${rowErr.message}`);
      }
    }

    await conn.commit();
    await auditLog(req.user.id, 'IMPORT', 'multiple', null, { importedCount, errorCount }, req.ip);

    res.json({
      message: 'Importation terminée',
      importedCount,
      errorCount,
      errors
    });

  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ message: 'Erreur lors de l\'importation', error: err.message });
  } finally {
    if (conn) conn.release();
  }
};
