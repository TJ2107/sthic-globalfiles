# STHIC PM Tracker

![Version](https://img.shields.io/badge/version-3.2.1-blue.svg)

Une application d'entreprise pour le suivi et la gestion de la maintenance préventive (PM). L'application permet la synchronisation des données depuis des fichiers Excel, l'intégration avec l'API Retable, et le stockage persistant via Cloudflare D1.

## 🚀 Fonctionnalités Principales

*   **Tableau de Bord Intégré :** Vue d'ensemble des statistiques de maintenance (PM planifiés, exécutés, en retard, etc.).
*   **Synchronisation Multi-sources :**
    *   Import et traitement de fichiers Excel (.xlsx).
    *   Connexion en direct à des espaces de travail et bases de données Retable via clé API.
    *   Synchronisation Cloudflare D1 pour une base de données Cloud persistante.
*   **Gestion des Assignations PM :** Ajout, modification, reprogrammation des PM et assignation de techniciens.
*   **Historique et Exports :** Génération de rapports PDF et Excel pour les suivis mensuels/hebdomadaires.
*   **Mode Hors-Ligne & PWA :** Conçue avec des capacités Progressive Web App pour un accès rapide.
*   **Intégration Firebase :** Base de données Firestore intégrée pour une persistance des paramètres et historiques.

## 🔗 Liens de Connexion

*   **Environnement de Développement (Preview) :** [Lien de Développement](https://ais-dev-jamlpyli6yynbc5lamha72-65802711374.europe-west2.run.app)
*   **Environnement Partagé (Staging/Production) :** [Lien Partagé](https://ais-pre-jamlpyli6yynbc5lamha72-65802711374.europe-west2.run.app)

*Note: Lors de la première connexion à l'environnement, configurez votre clé d'API Retable dans les paramètres pour accéder à la base Live.*

## 🛠️ Stack Technique

*   **Frontend :** React 19, Vite, Tailwind CSS, Recharts (pour la visualisation de données).
*   **Backend & Serveur :** Express (développement local) / Cloudflare Pages Functions (déploiement).
*   **Bases de données :** Cloudflare D1 (SQL), Firebase Firestore.
*   **Déploiement :** Conçu pour un déploiement Cloudflare Pages (`wrangler pages deploy`).

## ⚙️ Installation & Lancement en local

1.  **Installer les dépendances :**
    ```bash
    npm install
    ```
2.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3000`.
3.  **Build de production :**
    ```bash
    npm run build
    ```

## 📜 Copyright & Licence

© 2026 Empreintes Technologies. Tous droits réservés.

Ce logiciel, ainsi que tous les codes sources, conceptions, et interfaces associés, sont la propriété exclusive d'Empreintes Technologies. Toute reproduction, distribution ou modification sans autorisation expresse est strictement interdite.
