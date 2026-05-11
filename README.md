# 🎓 Projet : GestionHeures

## 1. Présentation générale
**GestionHeures** est une application web complète destinée à gérer les heures d’enseignement dans un établissement d’enseignement supérieur.

Dans de nombreuses institutions, le suivi des heures d’enseignement est encore réalisé à l’aide de fichiers Excel, ce qui entraîne plusieurs problèmes :
* Erreurs de calcul
* Difficulté de suivi historique
* Absence de traçabilité
* Manque de sécurité
* Impossibilité de travailler à plusieurs utilisateurs simultanément

L’objectif de **GestionHeures** est donc de proposer une solution numérique centralisée, permettant :
* La saisie et le suivi des heures d’enseignement
* Le calcul automatique des heures complémentaires selon les seuils
* La gestion des enseignants, de leurs comptes d'accès et des matières
* **L'attribution dynamique des matières** aux enseignants avec flux de validation
* La génération d’**états de paiement mensuels** et de rapports de comptabilité
* La traçabilité complète via un **Dashboard d'Audit Log** dédié

L’application est multi-utilisateurs, sécurisée, et accessible via un navigateur web.

---

## 2. Architecture du système
Le projet utilise une **architecture 3-tiers**, une architecture classique et robuste pour les applications web modernes.

Le flux de communication est le suivant :
```text
Navigateur (Utilisateur)
     ↓
Angular (Frontend sur le port 80)
     ↓
Nginx (Serveur Web & Reverse Proxy)
     ↓
Node.js / Express (API Backend sur le port 3000)
     ↓
MySQL (Base de données sur le port 3306)
```

**Explication des rôles :**
* **Angular** gère l’interface utilisateur et les interactions dynamiques (Single Page Application).
* **Nginx** sert les fichiers compilés d'Angular et agit comme *reverse proxy*. Il intercepte les requêtes API et les achemine vers le backend.
* **Node.js / Express** expose une API REST qui concentre toute la logique métier, l'envoi d'emails et la sécurité.
* **MySQL** stocke les données de façon relationnelle et pérenne.

---

## 3. Conteneurisation avec Docker
L’ensemble de l’application est conteneurisé (Docker), ce qui permet :
* Une installation très simple (Plug & Play)
* Un environnement d'exécution identique pour tous les développeurs
* Un déploiement rapide en production

Le système orchestre **3 conteneurs Docker** :

| Conteneur | Rôle |
| :--- | :--- |
| **MySQL** | Base de données |
| **Node.js** | Backend API |
| **Nginx + Angular** | Interface utilisateur |

Les conteneurs communiquent via un réseau Docker interne privé : `app_network`. 
Seuls deux ports sont accessibles depuis l’extérieur :
* **80** → Application Web (Nginx + Angular)
* **8081** → Backend API (Node.js)
* **3306** → Base de données MySQL

**Démarrage complet de l’application :**
```bash
docker-compose up -d --build
```
Cette commande lance MySQL, initialise la base de données, démarre le backend Node.js, compile Angular et démarre Nginx.

---

## 4. Base de données MySQL
La base de données contient **10 tables principales** couvrant tous les besoins du système :

1. **`users`** : Gère l'authentification (login, mot de passe chiffré, tokens, rôles, statut actif/inactif).
2. **`enseignants`** : Identité complète de l'enseignant (matricule, grade, statut, taux horaires, heures contractuelles). Liée à la table `users`.
3. **`heures_effectuees`** : Enregistre chaque séance (type CM/TD/TP, durée, validation RH, calcul automatique du caractère complémentaire).
4. **`attributions_matieres`** : Gère l'affectation des cours aux enseignants par année et semestre, avec un système de statut (EN_ATTENTE, ACCEPTEE, REFUSEE).
5. **`matieres`** : Catalogue des cours (intitulé, volume horaire, filière, niveau, semestre).
6. **`departements`** : Liste des départements.
7. **`filieres`** : Parcours d'enseignements.
8. **`annees_academiques`** : Gestion des exercices (ex: 2023–2024). Une seule année peut être active à la fois.
9. **`parametres`** : Configuration (équivalences CM/TD/TP, seuils contractuels).
10. **`audit_logs`** : Journal de traçabilité complet (auteur, action, date, modifications).

---

## 5. Système d'Avatars Utilisateurs
L'application dispose d'un système complet et dynamique d'avatars :
* **Fallback Intelligent** : Affichage d'initiales stylisées si aucune image n'est définie.
* **Upload Natif & Sécurisé** : Utilisation d'un sélecteur de fichiers HTML5 intégré avec prévisualisation immédiate (`FileReader`).
* **Optimisation Backend** : Nettoyage automatique des anciens fichiers, limitation à 5 Mo (configuré sur l'API), et persistance via volumes Docker.

---

## 6. Backend (Node.js / Express)
L'API REST est structurée pour la performance et la sécurité.

### a. Middlewares
* **`auth.js`** : Vérifie le Token JWT et gère le **Contrôle d'accès basé sur les rôles (RBAC)**.
* **`audit.js`** : Middleware intercepteur qui enregistre automatiquement chaque modification (POST, PUT, DELETE) dans les logs d'audit.

### b. Controllers (Points clés)
* **`attributionController`** : Gère le flux d'affectation des matières. Les Admins/RH créent les attributions ; les enseignants peuvent les consulter et y répondre (Accepter/Refuser).
* **`authController`** : Gestion sécurisée des comptes (BCrypt), réinitialisation de mot de passe par email (SMTP), et changement de mot de passe obligatoire.
* **`dashboardController`** : Centralise les statistiques, l'**état des paiements mensuels**, et l'**importation Excel/JSON transactionnelle** (garantissant qu'aucune donnée n'est créée en cas d'erreur partielle).
* **`userController`** : Interface d'administration pour la gestion directe des comptes utilisateurs (création, activation/désactivation).

### c. Sécurité
- **Helmet.js & Rate Limiting** : Protection contre les attaques courantes et force brute.
- **Filtrage de Données** : Isolation automatique des données (un enseignant ne peut jamais accéder aux informations privées de ses collègues).
- **Transactions SQL** : Les opérations complexes (comme l'import massif) utilisent des transactions pour garantir l'intégrité de la base.

---

## 7. Frontend (Angular 17)
Développé avec une approche **Standalone Components** et une UX moderne.

### a. Modules Majeurs
* **Tableau de Bord Analytique** : Visualisations via **Chart.js**. Graphiques de répartition des heures, suivi contractuel par jauge, et KPI financiers.
* **Gestion des Attributions** : Interface dédiée pour affecter des matières aux enseignants. Système de badges de statut et notifications pour les enseignants ayant des attributions en attente.
* **États & Rapports** : Module de génération de rapports.
    - **PDF Individuels** : Fiches d'heures détaillées avec avatars.
    - **États de Paiement** : Vue mensuelle filtrable pour la comptabilité.
    - **Exports Excel** : Listes complètes pour traitement externe.
* **Audit Logs Dashboard** : Interface réservée aux administrateurs permettant de visualiser l'historique complet des actions sur le système (qui a fait quoi, quand).
* **Importateur Excel Robuste** : Moteur de parsing côté client (SheetJS) avec prévisualisation en temps réel et validation avant envoi au serveur.

### b. Expérience Utilisateur (UX)
* **Design Responsive** : Interface fluide adaptée aux écrans de bureau et tablettes.
* **Micro-interactions** : Spinners de chargement, toasts de notification (Succès/Erreur), et modales sécurisées contre la fermeture accidentelle.

---

## 8. Gestion des rôles
Le système applique le principe du moindre privilège :

| Action | Admin | RH | Enseignant |
| :--- | :---: | :---: | :---: |
| Configuration système & Paramètres | ✅ | ❌ | ❌ |
| Gestion des comptes utilisateurs | ✅ | ❌ | ❌ |
| Consultation des Logs d'Audit | ✅ | ❌ | ❌ |
| Gestion des enseignants & matières | ✅ | ✅ | ❌ |
| Attribution des matières | ✅ | ✅ | ❌ |
| Saisie et validation des heures | ✅ | ✅ | ❌ |
| Réponse aux attributions | ❌ | ❌ | ✅ |
| Consultation de son propre profil | ✅ | ✅ | ✅ |

---

## 9. Logique métier : Heures Complémentaires
C'est le cœur du système, automatisant le calcul de la paie :
1. **Conversion automatique** : Les heures de CM/TD/TP sont converties en équivalent TD selon les coefficients paramétrables.
2. **Suivi du service fait** : Le système compare en temps réel le volume horaire validé par rapport à l'obligation de service contractuelle (ex: 192h).
3. **Génération de la paie** : Seules les heures validées et dépassant le seuil contractuel sont considérées comme complémentaires et valorisées financièrement selon le taux horaire de la matière.

---

## 10. Conclusion
**GestionHeures** transforme la gestion académique d'un processus manuel et risqué vers une plateforme numérique robuste, transparente et automatisée. Elle offre une visibilité totale à l'administration tout en simplifiant le quotidien des enseignants.