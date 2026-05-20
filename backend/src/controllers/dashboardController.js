const db = require('../config/database');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const { auditLog } = require('../middleware/audit');

exports.getDashboard = async (req, res) => {
  const { annee_id } = req.query;

  if (req.user.role === 'enseignant') {
    return res.status(403).json({ message: 'Accès au tableau de bord global interdit' });
  }

  const university_id = req.user.university_id || (req.user.role === 'super_admin' ? req.query.university_id : null);

  try {
    let anneeId = annee_id;
    
    // Build queryParams for each query correctly!
    let qParamsTotalHeures = [];
    let qHeuresWhere = ' WHERE valide = 1 ';
    if (anneeId && anneeId !== 'ALL') {
      qHeuresWhere += ' AND h.annee_academique_id=? ';
      qParamsTotalHeures.push(anneeId);
    }
    if (req.user.role !== 'super_admin') {
      qHeuresWhere += ' AND h.university_id=? ';
      qParamsTotalHeures.push(req.user.university_id);
    } else if (university_id) {
      qHeuresWhere += ' AND h.university_id=? ';
      qParamsTotalHeures.push(university_id);
    }

    // 1. Total enseignants
    let qEns = 'SELECT COUNT(*) as total FROM enseignants';
    let qParamsUniv = [];
    if (req.user.role !== 'super_admin') {
      qEns += ' WHERE university_id = ?';
      qParamsUniv.push(req.user.university_id);
    } else if (university_id) {
      qEns += ' WHERE university_id = ?';
      qParamsUniv.push(university_id);
    }
    const [totalEnseignants] = await db.execute(qEns, qParamsUniv);

    // 2. Total heures
    const [totalHeures] = await db.execute(
      `SELECT COALESCE(SUM(duree),0) as total, 
              COALESCE(SUM(CASE WHEN is_complementaire=1 THEN duree ELSE 0 END),0) as complementaires
       FROM heures_effectuees h ${qHeuresWhere}`, qParamsTotalHeures
    );

    // 3. Par type
    const [parType] = await db.execute(
      `SELECT type_heure, COALESCE(SUM(duree),0) as total
       FROM heures_effectuees h ${qHeuresWhere} GROUP BY type_heure`, qParamsTotalHeures
    );

    // 4. Par département
    let qParamsParDept = [];
    let qDeptWhere = '';
    if (req.user.role !== 'super_admin') {
      qDeptWhere = ' WHERE d.university_id = ? ';
      qParamsParDept.push(req.user.university_id);
    } else if (university_id) {
      qDeptWhere = ' WHERE d.university_id = ? ';
      qParamsParDept.push(university_id);
    }
    let joinAnnee = '';
    if (anneeId && anneeId !== 'ALL') {
      joinAnnee = ' AND h.annee_academique_id = ? ';
      qParamsParDept.push(anneeId);
    }
    const [parDepartement] = await db.execute(
      `SELECT d.nom as departement_nom, COALESCE(SUM(h.duree),0) as total_heures,
              COUNT(DISTINCT e.id) as nb_enseignants
       FROM departements d
       LEFT JOIN enseignants e ON e.departement_id = d.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id = e.id ${joinAnnee} AND h.valide=1
       ${qDeptWhere}
       GROUP BY d.id ORDER BY total_heures DESC`, qParamsParDept
    );

    // 5. En dépassement
    let qParamsDepassement = [];
    let qDepassementWhere = ' WHERE e.statut=\'Permanent\' ';
    if (req.user.role !== 'super_admin') {
      qDepassementWhere += ' AND e.university_id = ? ';
      qParamsDepassement.push(req.user.university_id);
    } else if (university_id) {
      qDepassementWhere += ' AND e.university_id = ? ';
      qParamsDepassement.push(university_id);
    }
    let joinAnneeDep = '';
    if (anneeId && anneeId !== 'ALL') {
      joinAnneeDep = ' AND h.annee_academique_id = ? ';
      qParamsDepassement.push(anneeId);
    }
    const [enDepassement] = await db.execute(
      `SELECT e.nom, e.prenom, e.grade, e.statut, e.heures_contractuelles, u.avatar_url,
              COALESCE(SUM(h.duree_equivalente),0) as total_effectuees,
              COALESCE(SUM(h.duree_equivalente),0) - e.heures_contractuelles as depassement
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id=e.id ${joinAnneeDep} AND h.valide=1
       ${qDepassementWhere}
       GROUP BY e.id HAVING total_effectuees > e.heures_contractuelles
       ORDER BY depassement DESC`, qParamsDepassement
    );

    // 6. Mensuel
    const [mensuel] = await db.execute(
      `SELECT DATE_FORMAT(date_cours,'%Y-%m') as mois,
              COALESCE(SUM(duree),0) as total_heures,
              COUNT(*) as nb_seances
       FROM heures_effectuees h ${qHeuresWhere}
       GROUP BY mois ORDER BY mois`, qParamsTotalHeures
    );

    // 7. Top enseignants
    let qParamsTop = [];
    let qTopWhere = '';
    if (req.user.role !== 'super_admin') {
      qTopWhere = ' WHERE e.university_id = ? ';
      qParamsTop.push(req.user.university_id);
    } else if (university_id) {
      qTopWhere = ' WHERE e.university_id = ? ';
      qParamsTop.push(university_id);
    }
    let joinAnneeTop = '';
    if (anneeId && anneeId !== 'ALL') {
      joinAnneeTop = ' AND h.annee_academique_id = ? ';
      qParamsTop.push(anneeId);
    }
    const [topEnseignants] = await db.execute(
      `SELECT e.nom, e.prenom, e.grade, u.avatar_url, COALESCE(SUM(h.duree),0) as total
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id=e.id ${joinAnneeTop} AND h.valide=1
       ${qTopWhere}
       GROUP BY e.id ORDER BY total DESC LIMIT 5`, qParamsTop
    );

    // 8. Avatars
    const [teacherAvatars] = await db.execute(
      `SELECT DISTINCT u.avatar_url, e.nom, e.prenom
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN heures_effectuees h ON h.enseignant_id = e.id ${joinAnneeTop}
       ${qTopWhere}
       LIMIT 5`, qParamsTop
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
  const { annee_id, mois } = req.query;
  const university_id = req.user.university_id || (req.user.role === 'super_admin' ? req.query.university_id : null);
  try {
    let anneeId = annee_id;
    let whereHeures = ' WHERE h.valide = 1 ';
    const paramsHeures = [];
    
    if (anneeId && anneeId !== 'ALL') {
      whereHeures += ' AND h.annee_academique_id = ? ';
      paramsHeures.push(anneeId);
    }
    
    if (mois && mois !== 'ALL') {
      whereHeures += ' AND MONTH(h.date_cours) = ? ';
      paramsHeures.push(mois);
    }

    if (req.user.role !== 'super_admin') {
      whereHeures += ' AND h.university_id = ? ';
      paramsHeures.push(req.user.university_id);
    } else if (university_id) {
      whereHeures += ' AND h.university_id = ? ';
      paramsHeures.push(university_id);
    }

    // 1. Récupérer les enseignants de l'université
    let qEns = `
      SELECT e.id, e.matricule, e.nom, e.prenom, e.grade, e.statut,
             d.nom as departement_nom, u.avatar_url,
             e.taux_horaire_cm, e.taux_horaire_td, e.taux_horaire_tp,
             e.heures_contractuelles
      FROM enseignants e
      LEFT JOIN departements d ON e.departement_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
    `;
    const paramsEns = [];
    if (req.user.role !== 'super_admin') {
      qEns += ' WHERE e.university_id = ? ';
      paramsEns.push(req.user.university_id);
    } else if (university_id) {
      qEns += ' WHERE e.university_id = ? ';
      paramsEns.push(university_id);
    }
    qEns += ' ORDER BY e.nom, e.prenom';

    const [enseignants] = await db.execute(qEns, paramsEns);

    // 2. Récupérer toutes les heures validées de l'année/université
    const [heures] = await db.execute(`
      SELECT h.enseignant_id, h.type_heure, h.duree, h.duree_equivalente, h.date_cours, h.id
      FROM heures_effectuees h
      ${whereHeures}
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
        
        let partNormaleEquiv = 0;
        let partCompEquiv = 0;

        if (cumulEquiv >= seuil) {
          partCompEquiv = dEquiv;
        } else if (cumulEquiv + dEquiv > seuil) {
          partNormaleEquiv = seuil - cumulEquiv;
          partCompEquiv = dEquiv - partNormaleEquiv;
        } else {
          partNormaleEquiv = dEquiv;
        }

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

  const university_id = req.user.university_id || (req.user.role === 'super_admin' ? req.body.university_id || 1 : null);
  const workbook = new ExcelJS.Workbook();
  const conn = await db.getConnection();
  
  try {
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
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

    // Année académique active pour cette université
    const [annees] = await conn.execute('SELECT id FROM annees_academiques WHERE is_active = TRUE AND university_id = ? LIMIT 1', [university_id]);
    const anneeId = annees[0]?.id;
    if (!anneeId) throw new Error('Aucune année académique active trouvée pour votre université');

    // Equivalence parameters for this university
    const [paramsList] = await conn.execute('SELECT cle, valeur FROM parametres WHERE university_id = ?', [university_id]);
    const pMap = {};
    paramsList.forEach(p => { pMap[p.cle] = parseFloat(p.valeur); });
    const coefCM_TD = pMap['equivalence_cm_td'] || 1.5;
    const coefCM_TP = pMap['equivalence_cm_tp'] || 2.0;

    await conn.beginTransaction();

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    const getCellValue = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object') {
        if (cell.value.result !== undefined) return cell.value.result;
        return '';
      }
      return cell.value;
    };

    for (let i = headerRow.rowNumber + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const matricule = getCellValue(row.getCell(colMap.matricule || 1))?.toString().trim();
      if (!matricule || matricule.toUpperCase() === 'TOTAL') continue;

      try {
        const nom = getCellValue(row.getCell(colMap.nom || 2))?.toString().trim();
        const grade = getCellValue(row.getCell(colMap.grade || 3))?.toString().trim();
        const statut = getCellValue(row.getCell(colMap.statut || 4))?.toString().trim() || 'Permanent';
        const deptName = getCellValue(row.getCell(colMap.dept || 5))?.toString().trim();
        const hCM = parseFloat(getCellValue(row.getCell(colMap.cm || 6))) || 0;
        const hTD = parseFloat(getCellValue(row.getCell(colMap.td || 7))) || 0;
        const hTP = parseFloat(getCellValue(row.getCell(colMap.tp || 8))) || 0;

        let deptId = null;
        if (deptName) {
          const [depts] = await conn.execute('SELECT id FROM departements WHERE (nom = ? OR code = ?) AND university_id = ?', [deptName, deptName, university_id]);
          if (depts.length) {
            deptId = depts[0].id;
          } else {
            const [newDept] = await conn.execute('INSERT INTO departements (nom, code, university_id) VALUES (?, ?, ?)', [deptName, deptName.substring(0, 5).toUpperCase(), university_id]);
            deptId = newDept.insertId;
          }
        }

        const [ensRows] = await conn.execute('SELECT id, user_id FROM enseignants WHERE matricule = ? AND university_id = ?', [matricule, university_id]);
        let enseignantId;

        if (ensRows.length) {
          enseignantId = ensRows[0].id;
          await conn.execute(
            'UPDATE enseignants SET nom=?, grade=?, statut=?, departement_id=? WHERE id=?',
            [nom, grade, statut, deptId, enseignantId]
          );
        } else {
          const tempEmail = `${matricule.toLowerCase()}.u${university_id}@import.excel`;
          const tempPassword = 'Temp' + Math.floor(1000 + Math.random() * 9000);
          const hash = await bcrypt.hash(tempPassword, 10);
          
          const [userRes] = await conn.execute(
            'INSERT INTO users (email, password, role, must_change_password, university_id) VALUES (?,?,?,TRUE,?)',
            [tempEmail, hash, 'enseignant', university_id]
          );
          const user_id = userRes.insertId;

          const [newEns] = await conn.execute(
            `INSERT INTO enseignants (user_id, matricule, nom, prenom, email, grade, statut, departement_id, heures_contractuelles, university_id)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [user_id, matricule, nom, '', tempEmail, grade, statut, deptId, statut === 'Vacataire' ? 0 : 192, university_id]
          );
          enseignantId = newEns.insertId;
        }

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
            let dureeEquiv = s.duree;
            if (s.type === 'TD') dureeEquiv = s.duree / coefCM_TD;
            if (s.type === 'TP') dureeEquiv = s.duree / coefCM_TP;

            await conn.execute(
              `INSERT INTO heures_effectuees (enseignant_id, annee_academique_id, date_cours, type_heure, duree, duree_equivalente, valide, observations, university_id)
               VALUES (?, ?, CURDATE(), ?, ?, ?, TRUE, "IMPORT_EXCEL", ?)`,
              [enseignantId, anneeId, s.type, s.duree, dureeEquiv, university_id]
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

exports.importJson = async (req, res) => {
  const { data } = req.body;
  if (!data || !Array.isArray(data)) return res.status(400).json({ message: 'Données invalides ou manquantes' });

  const university_id = req.user.university_id || (req.user.role === 'super_admin' ? req.body.university_id || 1 : null);
  const conn = await db.getConnection();
  
  try {
    const [annees] = await conn.execute('SELECT id FROM annees_academiques WHERE is_active = TRUE AND university_id = ? LIMIT 1', [university_id]);
    const anneeId = annees[0]?.id;
    if (!anneeId) throw new Error('Aucune année académique active trouvée pour votre université');

    // Equivalence parameters for this university
    const [paramsList] = await conn.execute('SELECT cle, valeur FROM parametres WHERE university_id = ?', [university_id]);
    const pMap = {};
    paramsList.forEach(p => { pMap[p.cle] = parseFloat(p.valeur); });
    const coefCM_TD = pMap['equivalence_cm_td'] || 1.5;
    const coefCM_TP = pMap['equivalence_cm_tp'] || 2.0;

    await conn.beginTransaction();
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      const { matricule, nom, grade, statut, departement, heures_cm, heures_td, heures_tp } = row;
      if (!matricule) continue;

      try {
        let deptId = null;
        if (departement) {
          const [depts] = await conn.execute('SELECT id FROM departements WHERE (nom = ? OR code = ?) AND university_id = ?', [departement, departement, university_id]);
          if (depts.length) deptId = depts[0].id;
          else {
            const [newDept] = await conn.execute('INSERT INTO departements (nom, code, university_id) VALUES (?, ?, ?)', [departement, departement.substring(0, 5).toUpperCase(), university_id]);
            deptId = newDept.insertId;
          }
        }

        const [ensRows] = await conn.execute('SELECT id FROM enseignants WHERE matricule = ? AND university_id = ?', [matricule, university_id]);
        let enseignantId;

        if (ensRows.length) {
          enseignantId = ensRows[0].id;
          await conn.execute(
            'UPDATE enseignants SET nom=?, grade=?, statut=?, departement_id=? WHERE id=?',
            [nom, grade, statut, deptId, enseignantId]
          );
        } else {
          const tempEmail = `${matricule.toLowerCase()}.u${university_id}@import.excel`;
          const tempPassword = 'Temp' + Math.floor(1000 + Math.random() * 9000);
          const hash = await bcrypt.hash(tempPassword, 10);
          const [userRes] = await conn.execute('INSERT INTO users (email, password, role, must_change_password, university_id) VALUES (?,?,?,TRUE,?)', [tempEmail, hash, 'enseignant', university_id]);
          const [newEns] = await conn.execute(
            `INSERT INTO enseignants (user_id, matricule, nom, prenom, email, grade, statut, departement_id, heures_contractuelles, university_id)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [userRes.insertId, matricule, nom, '', tempEmail, grade, statut, deptId, statut === 'Vacataire' ? 0 : 192, university_id]
          );
          enseignantId = newEns.insertId;
        }

        await conn.execute('DELETE FROM heures_effectuees WHERE enseignant_id = ? AND annee_academique_id = ? AND observations = "IMPORT_EXCEL"', [enseignantId, anneeId]);

        const seances = [{ t: 'CM', d: parseFloat(heures_cm) }, { t: 'TD', d: parseFloat(heures_td) }, { t: 'TP', d: parseFloat(heures_tp) }];
        for (const s of seances) {
          if (s.d > 0) {
            let eq = s.d;
            if (s.t === 'TD') eq = s.d / coefCM_TD; else if (s.t === 'TP') eq = s.d / coefCM_TP;
            await conn.execute(
              `INSERT INTO heures_effectuees (enseignant_id, annee_academique_id, date_cours, type_heure, duree, duree_equivalente, valide, observations, university_id)
               VALUES (?, ?, CURDATE(), ?, ?, ?, TRUE, "IMPORT_EXCEL", ?)`,
              [enseignantId, anneeId, s.t, s.d, eq, university_id]
            );
          }
        }
        importedCount++;
      } catch (e) {
        console.error(`[ImportJSON Error] Row for ${matricule} failed:`, e);
        errorCount++;
        errors.push(`${matricule}: ${e.message}`);
      }
    }
    await conn.commit();
    res.json({ importedCount, errorCount, errors });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { if (conn) conn.release(); }
};
