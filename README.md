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
* La génération d’états de paiement précis
* La traçabilité complète des actions des utilisateurs

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
Cette commande lance MySQL, initialise la base de données (si vide), démarre le backend Node.js, compile Angular et démarre Nginx.

---

## 4. Base de données MySQL
La base de données contient **9 tables principales** couvrant tous les besoins du système :

1. **`users`** : Gère l'authentification (login, mot de passe chiffré, gestion des tokens, obligation de changer le mot de passe, désactivation de compte, rôle).
2. **`enseignants`** : Stocke l'identité complète de l'enseignant (nom, matricule, grade, statut, département, taux horaires, heures contractuelles). Liée à la table `users`.
3. **`heures_effectuees`** : Table névralgique. Enregistre chaque séance d’enseignement (type CM/TD/TP, durée, salle, date, validation RH, et si la séance génère des heures complémentaires).
4. **`matieres`** : Catalogue des cours (intitulé, volume horaire prévu, filière).
5. **`departements`** : Liste des départements de l’établissement.
6. **`filieres`** : Parcours d'enseignements.
7. **`annees_academiques`** : Gère les exercices (ex: 2023–2024, 2024–2025). Le système permet de créer, supprimer (si sans données liées), activer ou désactiver une année ; une seule année peut être active à la fois pour garantir la cohérence des saisies.
8. **`parametres`** : Stocke la configuration (équivalences CM/TD/TP, seuils contractuels).
9. **`audit_logs`** : Table de traçabilité. Elle enregistre silencieusement l'auteur, l'action, la date et l'élément modifié.

---

## 5. Système d'Avatars Utilisateurs
L'application dispose d'un système complet et dynamique d'avatars, récemment optimisé pour une fiabilité maximale :
* **Composant Réutilisable** : `AvatarComponent` gère l'affichage des images réelles ou des **initiales stylisées** en fallback.
* **Nouvelle Architecture d'Upload (Fiabilité Totale)** :
    - **Pattern Natif** : Utilisation d'un pattern `<label>` enveloppant pour le sélecteur de fichiers, garantissant une compatibilité totale avec tous les navigateurs sans blocage de sécurité JavaScript.
    - **Prévisualisation Immédiate** : Affichage instantané de l'image sélectionnée via `FileReader` avant la fin de l'upload.
    - **Feedback Visuel** : Intégration d'un spinner "Envoi..." sur l'avatar pendant le chargement.
* **Gestion Backend & Sécurité** :
    - **Nettoyage Automatique** : Suppression physique des anciens fichiers sur le serveur lors d'une mise à jour ou suppression d'avatar.
    - **Limites Étendues** : Support d'upload jusqu'à **10 Mo** (configuré sur Nginx et l'API).
    - **Persistance Robuste** : Utilisation de chemins absolus via `path.resolve` pour une gestion sans faille dans les volumes Docker.
* **Intégration Visuelle** :
    - **Omniprésence** : Sidebar, listes d'enseignants, tableaux de bord (Avatar Stacks) et rapports PDF/Excel.
    - **Optimisation** : Gestion fine des headers CORS et de la politique de cache (`Cross-Origin-Resource-Policy`).

---

## 6. Backend (Node.js / Express)
Le backend expose une **API REST** sécurisée.

### a. Middlewares
* **`auth.js`** : Vérifie la validité du Token JWT et s'assure que le profil appelant a les privilèges requis (Contrôle d'accès basé sur les rôles - RBAC).
* **`audit.js`** : Enregistreur automatisé des actions dans `audit_logs`.

### b. Controllers (Logique métier étendue)
* **`authController`** : Gère la connexion, mais aussi les **flux de réinitialisation de mot de passe par email (SMTP)** (lien sécurisé valide 6 minutes) et le changement de mot de passe obligatoire lors de la première connexion.
* **`enseignantController`** : Gère le CRUD. **Particularité :** la création d'un enseignant déclenche la création d'un compte utilisateur, la génération d'un mot de passe temporaire robuste et **l'envoi automatique d'un email de bienvenue**. La suppression d'un enseignant entraîne la suppression en cascade de son compte utilisateur. **Sécurité :** le contrôleur applique un filtrage automatique ; si un enseignant est connecté, il ne peut récupérer que sa propre fiche.
* **`dashboardController`** : Génère la donnée agrégée des graphiques, les alertes de dépassement de service, l'état des paiements et l'échantillonnage des avatars pour les cartes de résumé. Il implémente également un endpoint d'**importation JSON ultra-fiable** (`importJson`) qui reçoit des données pré-validées par le frontend pour créer automatiquement les enseignants, comptes utilisateurs, départements et y associer les heures en une seule transaction sécurisée. **Sécurité :** l'accès aux statistiques globales est strictement réservé aux rôles Admin et RH ; les enseignants sont redirigés vers leurs propres données.
* **`referentielController`** : Gestion centralisée des départements, filières, années (activation/désactivation), paramètres et utilisateurs. Garantit une cohérence des données de département à travers tout le système (fiches, rapports, exports).

### c. Sécurité et Fiabilité
- **Requêtes Optimisées et Intégrité** : L'API utilise des jointures souples (`LEFT JOIN`) et gère dynamiquement les filtres optionnels pour permettre des vues globales (ex: filtre "Toutes les années") sans exclure les données historiques ou orphelines.
- **Messagerie d'erreur précise** : Le backend capture et transmet les véritables causes d'erreur (ex: surcharge de valeur, doublons) au frontend, au lieu de masquer le problème sous une "Erreur 500" opaque.
- **Helmet.js** : Ajout d'en-têtes HTTP de sécurité.
- **Rate Limiting** : Limite les attaques par force brute (500 requêtes / 15 minutes).
- **Bcrypt & JWT** : Mots de passe hachés, authentification par token avec une péremption de 8 heures.

---

## 7. Frontend (Angular 17)
Le frontend est développé avec **Angular 17** en exploitant les **Standalone Components** (approche sans NgModules).

### a. Core (Services globaux)
* **`AuthService`** : Conserve l'état de l'utilisateur, vérifie les restrictions de première connexion (`must_change_password`) et gère le JWT.
* **`ApiService`** : Façade unique vers l'API Node.js. Intègre un constructeur de paramètres intelligent (`buildFilters`) qui nettoie automatiquement les requêtes (en ignorant les valeurs neutres comme "Toutes les années") pour un filtrage global cohérent sur toute l'application.
* **`authGuard` & `authInterceptor`** : Sécurisation des routes et injection automatique du header `Authorization: Bearer Token`.

### b. Pages principales
* **Modulaires d'Authentification** : Connexion, Mot de passe oublié (Demande de Reset Token) et Changement de mot de passe obligatoire.
* **`DashboardComponent` & `Layout`** : Tableau de bord dynamique avec design compact. Intègre des **visualisations de données modernes et interactives via Chart.js** pour les administrateurs/RH (répartition des heures, volume par département, évolution mensuelle) et **désormais pour les enseignants** (jauge de progression contractuelle en équivalent TD, répartition par matière, par type d'heure, évolution mensuelle, et KPI comparatif des heures validées vs en attente). L'analyse y est ancrée par défaut sur une **année académique spécifique** pour garantir la pertinence des métriques. L'interface globale inclut des **piles d'avatars visuelles**, un système de **notifications dynamiques** (badge en temps réel pour les heures en attente), et offre une véritable expérience analytique ciblée selon le profil connecté.
* **`EnseignantsComponent` & `EnseignantDetailComponent`** : Annuaire filtrable pour le personnel administratif. Pour les enseignants, cette page est **automatiquement filtrée** pour n'afficher que leur propre profil, garantissant la confidentialité des données.
* **`HeuresComponent`** : Interface de saisie et validation RH des séances. Les enseignants peuvent y consulter l'historique complet de leurs propres séances.
* **`MatieresComponent` & `ParametresComponent`** : Gestion de la nomenclature et configuration globale.
* **`RapportsComponent`** : Extraction rigoureuse des états de paiement. Supporte l'**export PDF et Excel** pour les rapports globaux, les rapports de comptabilité (vue dédiée), ainsi que les fiches individuelles avec suivi précis de l'état de validation ("validé") et l'intégration des avatars. Intègre un **filtre dynamique** permettant de sélectionner un enseignant spécifique et de télécharger instantanément sa fiche individuelle PDF sécurisée (avec assainissement automatique des noms de fichiers contenant des caractères spéciaux comme `/` pour les années académiques).
* **`ImportComponent` (Importation Massive)** : Interface drag-and-drop permettant d'importer massivement des enseignants et leurs heures depuis un fichier Excel. Le système intègre un moteur de parsing côté client très robuste (SheetJS) capable de détecter automatiquement les en-têtes pertinents (même sous des titres de tableaux fusionnés), d'ignorer les lignes de synthèse (comme "TOTAL") et de calculer dynamiquement les valeurs des formules Excel pour offrir un **aperçu en temps réel 100% fiable**. Les données sont ensuite envoyées au backend via un payload JSON propre, garantissant une synchronisation parfaite entre l'aperçu affiché et la base de données ("WYSIWYG").

### c. Expérience Utilisateur & Stabilité (UX)
* **Ergonomie des Modales** : Les fenêtres contextuelles (pop-ups) intègrent une gestion stricte des événements (interception de la propagation des clics) afin de prévenir toute fermeture accidentelle lors de la saisie de données sensibles (dates, listes déroulantes).
* **Filtres Globaux & Historiques** : L'API et le Frontend traitent intelligemment les paramètres de filtrage, permettant l'extraction exhaustive de l'historique via l'option "Toutes les années" dans les listes de données globales, tout en la restreignant délibérément sur le tableau de bord analytique pour préserver la netteté des graphiques.

---

## 8. Gestion des rôles
Le système applique le principe du moindre privilège via 3 profils distincts :

| Action | Admin | RH | Enseignant |
| :--- | :---: | :---: | :---: |
| Configuration système & Paramètres | ✅ | ❌ | ❌ |
| Gestion globale des enseignants | ✅ | ✅ | ❌ |
| Saisie et validation des heures | ✅ | ✅ | ❌ |
| Accès aux rapports globaux et stats | ✅ | ✅ | ❌ |
| Isolation des données (Filtre auto) | ❌ | ❌ | ✅ |

*(Note : La saisie des heures est volontairement confiée à l'administration/RH pour garantir le contrôle et éviter la fraude. Les enseignants bénéficient d'un cloisonnement strict : ils ne peuvent ni voir ni exporter les données de leurs collègues).*

---

## 9. Logique métier principale : Heures Complémentaires
C'est le cœur du système, remplaçant la charge cognitive des fichiers Excel.

1. **Saisie** : Un agent RH saisit une séance d'enseignement (ex: 2h de TD).
2. **Conversion** : Le système convertit cette durée en équivalent CM (ex: 2h TD = 1.33h CM).
3. **Cumul global** : Le système additionne dynamiquement toutes les heures de l'année scolaire de cet enseignant.
4. **Basculement automatique** : Si la somme dépasse l'obligation de service contractuel (ex: 192 heures annuelles pour un permanent, 0 pour un vacataire dont toutes les heures sont complémentaires), la séance (ou la fraction excédentaire) est verrouillée avec le statut `is_complementaire = true`.
5. **Paiement** : Lors de la génération des rapports de paie, seules les heures complémentaires (ayant fait l'objet d'une "Validation RH") sont converties en valeur monétaire selon le taux horaire individuel de la matière concernée du professeur.

---

## 10. Reverse Proxy avec Nginx
Nginx joue un rôle crucial :
1. **Serveur Statique** : Sert les fichiers compilés optimisés de l'application Angular.
2. **Reverse Proxy (Sécurité & Routage)** : Intercepte les requêtes web ciblant `/api/*` et les redirige vers le processus interne Node.js (qui tourne de façon masquée sur le port 3000). Cela prévient les failles de sécurité frontales et neutralise les problèmes de politique CORS.

---

## Conclusion
**GestionHeures** a été pensée pour être une plateforme clef-en-main, hautement résiliente. 
En automatisant les calculs, en structurant le workflow de saisie et de validation, en intégrant des notifications par email et un journal d'audit rigoureux, le projet modernise en profondeur la gestion chronophage de l'enseignement académique.
#   g e s t i o n - h e u r e s  
 