# Interclub Director Dashboard 🏆♟️

Tableau de bord tout-en-un pour les directeurs et capitaines d'interclubs d'échecs en Belgique (FRBE / KBSB).  
*All-in-one management dashboard for Belgian chess interclub directors and team captains (FRBE / KBSB).*

[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Deployed%20with-Vercel-000000.svg?logo=vercel&logoColor=white)](https://vercel.com/)

---

## 📑 Sommaire / Table of Contents

- [Français 🇫🇷](#français-)
  - [Présentation Générale](#-présentation-générale)
  - [Détail des Pages & Fonctionnement](#-détail-des-pages--fonctionnement)
    - [1. Classements Équipes](#1-classements-équipes)
    - [2. Performances Joueurs & TPR](#2-performances-joueurs--tpr)
    - [3. Scouting & Préparation](#3-scouting--préparation)
    - [4. Simulateur & Règles FRBE](#4-simulateur--règles-frbe)
    - [5. Exports & Feuilles de Match](#5-exports--feuilles-de-match)
  - [Architecture & Flux de Données](#-architecture--flux-de-données)
  - [Installation & Démarrage](#-installation--démarrage)
  - [Déploiement en Production (Vercel)](#-déploiement-en-production-vercel)
- [English 🇬🇧](#english-)
  - [Overview](#-overview)
  - [Pages Breakdown & How It Works](#-pages-breakdown--how-it-works)
    - [1. Team Standings](#1-team-standings)
    - [2. Player Performance & TPR](#2-player-performance--tpr)
    - [3. Scouting & Next Match](#3-scouting--next-match)
    - [4. Lineup Simulator & FRBE Rules](#4-lineup-simulator--frbe-rules)
    - [5. Exports & Match Sheets](#5-exports--match-sheets)
  - [Architecture & Data Flow](#-architecture--data-flow)
  - [Setup & Local Development](#-setup--local-development)
  - [Production Deployment (Vercel)](#-production-deployment-vercel)

---

# Français 🇫🇷

## 📌 Présentation Générale

L'application **Interclub Director Dashboard** simplifie la vie des directeurs sportifs et capitaines de clubs d'échecs affiliés à la Fédération Royale Belge des Échecs (**FRBE / KBSB**).

Elle permet de suivre les classements de toutes les équipes du club, analyser les performances individuelles, étudier la composition probable des adversaires de la prochaine ronde, composer les équipes en validant automatiquement le règlement officiel FRBE, et générer les comptes-rendus par e-mail ainsi que les feuilles de match officielles.

L'interface adopte un design sombre moderne (Antigravity glassmorphism, fond spatial avec lueurs d'ambiance et flou d'arrière-plan).

---

## 🖥️ Détail des Pages & Fonctionnement

### 1. Classements Équipes
> **Objectif :** Suivre en temps réel la situation sportive de toutes les équipes du club dans leurs divisions respectives.

* **Ce que la page affiche :**
  * **Cartes résumées en haut de page :** Pour chaque équipe du club (Équipe 1, 2, 3...), affichage de la division, des points de match, des points d'échiquier et du classement actuel.
  * **Scroll & Dépliage automatique :** En cliquant sur une carte d'équipe, la page déroule automatiquement la division correspondante et fait défiler l'écran (*smooth scroll*) jusqu'au tableau complet.
  * **Tableau complet de division :** Classement officiel avec points de match, points de grille, parties jouées, départages et mise en valeur de votre équipe.
  * **Détail du dernier match joué :** Accordéon dépliable montrant le score global de la dernière ronde et le détail individuel de chaque échiquier (nom des joueurs, matricules, Elo, couleur Blanc/Noir et résultat 1-0, ½-½, 0-1).
* **Comment ça fonctionne sous le capot :**
  * L'application interroge les endpoints officiels FRBE (`/anon/icclub/{id}` et `/anon/icseries?round={r}`).
  * Elle croise les numéros d'appariement (*pairing numbers*) et identifie instantanément les résultats Domicile / Extérieur.
  * Un dictionnaire global des joueurs résout les matricules pour afficher les noms complets et cotes Elo réelles.

---

### 2. Performances Joueurs & TPR
> **Objectif :** Évaluer l'efficacité de chaque membre du club ayant disputé au moins une partie d'interclubs dans la saison.

* **Ce que la page affiche :**
  * **Tableau récapitulatif :** Nombre de rondes disputées, victoires, nulles, défaites, total de points et pourcentage de réussite.
  * **Performance Tournoi FIDE (TPR) :** Calcul mathématique de la performance réalisée en fonction de la moyenne Elo des adversaires rencontrés et du score obtenu.
  * **Variation Elo estimée :** Estimation du gain ou de la perte de points Elo au cours de la saison.
  * **Badge "En forme" (🔥) :** Distingue automatiquement les joueurs qui surperforment par rapport à leur classement officiel.
  * **Historique individuel interactif :** Au clic ou au survol d'un joueur, une fiche détaillée liste tous ses adversaires affrontés, leur classement Elo, la couleur jouée et le résultat échiquier par échiquier.
* **Comment ça fonctionne sous le capot :**
  * Calcul basé sur la formule officielle FIDE : moyenne des cotes adverses additionnée au différentiel $\Delta R$ issu de la table de conversion standard FIDE.
  * Les forfaits administratifs ou parties non jouées sont filtrés pour ne pas fausser le calcul statistique.

---

### 3. Scouting & Préparation
> **Objectif :** Anticiper le match de la prochaine ronde et préparer tactiquement l'alignement des équipes.

* **Ce que la page affiche :**
  * **Affiche de la rencontre :** Nom de l'adversaire prévu, ronde, lieu (Domicile / Déplacement) et adresse de la salle de jeu.
  * **Indicateur de difficulté tricolore :**
    * 🟢 **Favori (+50 Elo ou plus) :** Équipe sur le papier supérieure.
    * 🟡 **Équilibré (-50 à +50 Elo) :** Match serré.
    * 🔴 **En danger / Alerte (-50 Elo ou moins) :** Alerte visuelle pour le directeur (besoin d'aligner des renforts !).
  * **Comparatif des moyennes Elo :** Moyenne prévisionnelle de notre équipe comparée à la moyenne de l'équipe adverse.
  * **Tendances de composition adverse :** Analyse échiquier par échiquier des joueurs adverses ayant joué lors des rondes précédentes, avec leur fréquence d'apparition et leur Elo.
* **Comment ça fonctionne sous le capot :**
  * Le moteur de scouting scanne la grille d'appariements de la division pour trouver le prochain adversaire.
  * Il agrège l'ensemble des feuilles de match des rondes passées de l'adversaire afin d'établir la liste des joueurs les plus probables à chaque échiquier.

---

### 4. Simulateur & Règles FRBE
> **Objectif :** Composer interactivement les équipes pour la ronde à venir tout en garantissant le respect strict des règlements de la fédération.

* **Ce que la page affiche :**
  * **Deck des Joueurs (colonne de gauche) :**
    * Liste de tous les joueurs du club triés par classement Elo.
    * **Gestion des disponibilités de la ronde :** Boutons d'état rapide : Présent (🟢), À confirmer (🟡), Absent (🔴). Les joueurs absents restent visibles en bas du deck en rouge clair pour pouvoir être rétablis en 1 clic.
    * **Mise en valeur visuelle de l'éligibilité :** Dès qu'une équipe est sélectionnée, les joueurs autorisés à jouer dans cette division restent colorés avec une bordure verte. Les joueurs inéligibles (trop forts, titulaires d'une équipe supérieure, ou < 1800 en Div 1) sont grisés (*grayscale*) avec une bordure rouge et un badge `INÉLIGIBLE`.
    * **Auto-scroll intelligent :** Changer d'équipe fait défiler automatiquement le deck jusqu'au premier joueur éligible selon les règles de la FRBE.
    * **⚙️ Bouton "Config" (Gestion de l'Effectif Saison) :** Modale avec barre de recherche permettant de marquer les joueurs inactifs/enfants comme "Ignorés" ou de fixer les réservistes permanents ("Toujours Réserve").
  * **Constructeur d'Échiquiers (colonne de droite) :**
    * Onglets pour basculer facilement entre les équipes du club (Équipe 1, 2, 3, etc.).
    * **Assignation Click-to-Assign :** Cliquez sur un joueur dans le deck, puis sur un échiquier pour l'assigner ou le remplacer.
    * **Anti-doublon universel :** Assigner un joueur le retire automatiquement de toute autre équipe où il aurait été placé.
    * **Baguette Magique "Auto-fill" :** Remplit automatiquement les échiquiers vides de l'équipe avec les meilleurs joueurs disponibles, non ignorés et non encore placés.
    * **Bannière d'alerte réglementaire FRBE tricolore :** Analyse en temps réel la conformité de l'équipe (Vert = Conforme, Jaune = Avertissements, Rouge = Infraction au règlement).
* **Règles FRBE vérifiées en temps réel :**
  1. **Plafonds Elo pour les Réservistes :**
     - Division 1 : max 2350 Elo
     - Division 2 : max 2200 Elo
     - Division 3 : max 2050 Elo
     - Division 4 : max 1950 Elo
     - Division 5 : max 1800 Elo
     - Division 6 : max 1700 Elo
  2. **Interdiction de descendre pour les titulaires :** Un joueur ayant le statut de titulaire dans une équipe supérieure (ex: titulaire en Équipe 1) ne peut en aucun cas jouer en Équipe 2 ou inférieure.
  3. **Ordre d'alignement sur la feuille de match :** Tolérance de décalage par rapport à l'ordre théorique des forces des joueurs présents :
     - Div 1 & 2 : décalage max de 3 places.
     - Div 3 : décalage max de 2 places.
     - Div 4, 5, 6 : décalage max de 1 place.
  4. **Spécificités Division 1 :** Minimum 1800 Elo pour tout joueur aligné ; minimum 2000 Elo obligatoire sur les 4 premiers échiquiers.
  5. **Sauvegarde locale :** Les brouillons de composition et statuts de présence sont sauvegardés automatiquement dans le `localStorage` de votre navigateur.

---

### 5. Exports & Feuilles de Match
> **Objectif :** Partager les résultats et préparer les documents physiques du jour de match en un seul clic.

* **Ce que la page affiche :**
  * **Email Récapitulatif d'après-ronde :**
    * Texte rédigé et structuré (victoires, nuls, défaites, scores totaux, détail échiquier par échiquier avec noms, Elo et résultats).
    * Prêt à être collé dans Gmail, Outlook, WhatsApp ou Discord.
    * Sélection partielle de texte autorisée ou copie intégrale via le bouton `Copier le texte`.
  * **Feuille de Match Officielle (Jour J) :**
    * Feuille de composition standardisée pour le capitaine de chaque équipe.
    * Liste pré-remplie avec numéro d'échiquier, matricule officiel, nom, prénom, Elo et emplacement pour la signature du capitaine.
    * Bouton `Imprimer` avec feuille de style optimisée pour l'impression papier ou l'export en PDF propre.

---

## 🏛️ Architecture & Flux de Données

Le projet est conçu avec une séparation stricte entre logique métier pure et composants d'interface :

```text
src/
├── api/                     # Couche réseau & client HTTP
│   ├── frbeClient.ts        # Appels API vers les services FRBE (/anon/icclub, /anon/icseries, /anon/venue)
│   ├── firestoreFallback.ts # Miroir de secours Firestore en cas d'indisponibilité du serveur FRBE
│   └── cache.ts             # Mise en cache en mémoire et sessionStorage
│
├── domain/                  # Logique métier pure (TypeScript standard, 100% testable)
│   ├── rules/
│   │   └── frbeValidator.ts # Moteur complet de validation des règlements officiels FRBE
│   ├── performance.ts       # Calcul des points, pourcentages et TPR FIDE
│   ├── standings.ts         # Calcul des classements, points de match et départages
│   ├── scouting.ts          # Analyse prédictive des compos adverses et deltas Elo
│   ├── matches.ts           # Extraction des matchs récents échiquier par échiquier
│   └── exporters.ts         # Générateurs de texte pour mails et feuilles imprimables
│
├── context/                 # État global React (persistance localStorage)
│   ├── ClubContext.tsx      # Club sélectionné (Leuze 541 par défaut, modifiable via modal)
│   └── SimulatorContext.tsx # Gestion des disponibilités, paramètres joueurs et compos brouillon
│
├── hooks/
│   └── useClubData.ts       # Hook orchestrateur principal (chargement, mise à jour, fallback)
│
├── components/              # Composants graphiques React (Tailwind CSS v4)
│   ├── layout/              # Navbar, sélecteur de club, en-tête
│   ├── standings/           # Composants de l'onglet Classements
│   ├── players/             # Composants de l'onglet Performances
│   ├── scouting/            # Composants de l'onglet Scouting
│   ├── simulator/           # Simulateur, deck des joueurs, modale de configuration
│   └── exports/             # Modèles d'export et feuilles imprimables
│
└── App.tsx                  # Composant racine
```

---

## 🚀 Installation & Démarrage

### Prérequis
* [Node.js](https://nodejs.org/) version 18 ou supérieure
* [npm](https://www.npmjs.com/)

### Étapes d'installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-compte/interclub-dashboard.git
cd interclub-dashboard/interclub-dashboard

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application est accessible localement à l'adresse : **`http://localhost:5173`**.

---

## ☁️ Déploiement en Production (Vercel)

L'application est prête à être déployée gratuitement sur **Vercel** sans nécessiter de serveur dédié :

1. Poussez votre code sur votre dépôt **GitHub**.
2. Rendez-vous sur [Vercel](https://vercel.com/) et connectez votre compte GitHub.
3. Importez le projet et cliquez sur **Deploy**.
4. **Gestion du CORS :** Le fichier `vercel.json` inclus à la racine configure automatiquement une réécriture de proxy (`/api/v1/interclubs/:match*` vers `https://www.frbe-kbsb-ksb.be/api/v1/interclubs/:match*`), garantissant un chargement fluide des données officielles sans blocage de sécurité de navigateur.

---
---

# English 🇬🇧

## 📌 Overview

The **Interclub Director Dashboard** is a comprehensive management and scouting tool built for chess club directors and team captains competing in the Belgian National Interclubs championship (**FRBE / KBSB**).

It enables clubs to track all team standings in real time, evaluate individual player performance, scout upcoming opponents, build compliant team lineups with an automated FRBE rules engine, and generate one-click post-round newsletters and official match sheets.

The application features a modern dark spatial aesthetic (Antigravity glassmorphism, ambient glows, and clean typography).

---

## 🖥️ Pages Breakdown & How It Works

### 1. Team Standings
> **Goal:** Monitor the competitive status of every club team across Belgian national and regional divisions.

* **What it displays:**
  * **Summary cards:** High-level cards for each team (Team 1, 2, 3...) showing division, match points, board points, and current ranking.
  * **Click & Smooth-Scroll:** Clicking any team card automatically expands its division table and scrolls the viewport directly down to the full standings.
  * **Detailed division table:** Official standing table featuring match points, board points, games played, tie-breaks, and highlighted club position.
  * **Latest round match details:** Collapsible accordion displaying the latest team encounter with individual board-by-board outcomes (player names, ratings, colors, and game results 1-0, ½-½, 0-1).
* **How it works under the hood:**
  * Queries official FRBE API endpoints (`/anon/icclub/{id}` and `/anon/icseries?round={r}`).
  * Matches pairing numbers to determine Home vs Away fixtures and encounter winners.
  * Cross-references player IDs with an internal directory to display real names and official assigned ratings.

---

### 2. Player Performance & TPR
> **Goal:** Assess the form, consistency, and statistical contribution of every club member who played interclub games this season.

* **What it displays:**
  * **Player summary table:** Games played, wins, draws, losses, total points, and win rate percentage.
  * **FIDE Tournament Performance Rating (TPR):** Official performance metric computed from the average rating of opponents faced and the score achieved.
  * **Estimated Elo delta:** Seasonal rating points gain or loss estimate.
  * **"In-form" badge (🔥):** Automatically highlights players significantly exceeding their starting rating.
  * **Interactive match history:** Hovering or clicking a player opens a detailed breakdown listing every opponent faced, their Elo rating, color played (White/Black), and result.
* **How it works under the hood:**
  * Uses the official FIDE performance formula: opponent average rating combined with rating differences ($\Delta R$) from the standard FIDE conversion table.
  * Forfeits and unplayed boards are excluded to maintain statistical accuracy.

---

### 3. Scouting & Next Match
> **Goal:** Anticipate upcoming fixtures, assess match balance, and tactically optimize team rosters.

* **What it displays:**
  * **Fixture banner:** Next opponent name, round number, venue (Home / Away), and playing hall address.
  * **Matchup difficulty indicator:**
    * 🟢 **Favorite (+50 Elo or higher):** On-paper advantage.
    * 🟡 **Balanced (-50 to +50 Elo):** Close match expected.
    * 🔴 **Underdog / Alert (-50 Elo or lower):** Visual warning for the director (reinforcements needed!).
  * **Average Elo comparison:** Projected average rating of our lineup vs opponent lineup.
  * **Opponent lineup tendencies:** Board-by-board analysis of the players most frequently deployed by the opponent on boards 1, 2, 3, etc., including appearances count and ratings.
* **How it works under the hood:**
  * Identifies the scheduled opponent through division pairing schedules.
  * Aggregates game records from all previous rounds played by the opposing team to generate probabilistic lineup predictions.

---

### 4. Lineup Simulator & FRBE Rules Engine
> **Goal:** Interactively draft team compositions while enforcing full compliance with official FRBE interclub regulations.

* **What it displays:**
  * **Player Deck (left column):**
    * Full club roster sorted by Elo rating.
    * **Round availability switcher:** Available (🟢), Tentative / Unsure (🟡), Absent (🔴). Absent players stay visible at the bottom of the deck (with a red tint) so their status can be restored at any time.
    * **Visual eligibility cues:** When a team is selected, players allowed to play in that division maintain a green accent. Ineligible players (too high Elo, titular in a higher division team, or < 1800 Elo in Div 1) are dimmed in grayscale with a red border and an `INÉLIGIBLE` badge.
    * **Smart auto-scroll:** Selecting a team automatically scrolls the deck to the first eligible player under FRBE rules.
    * **⚙️ "Config" Button (Season Roster Settings):** Searchable modal to mark inactive players/children as "Ignored" or assign permanent reserves ("Toujours Réserve").
  * **Board Lineup Builder (right column):**
    * Team navigation tabs (Team 1, 2, 3...).
    * **Click-to-Assign:** Click a player card in the deck, then click a board slot to place or swap them.
    * **Universal anti-duplication:** Placing a player automatically removes them from any other board in any team.
    * **"Auto-fill" magic wand:** Automatically fills empty boards with the highest-Elo available, non-ignored, unassigned players.
    * **Compliance banner:** Real-time feedback on team validity (Green = Valid, Yellow = Warnings, Red = Rule violation).
* **FRBE Rules Checked in Real Time:**
  1. **Reserve Elo limits per division:**
     - Division 1: max 2350 Elo
     - Division 2: max 2200 Elo
     - Division 3: max 2050 Elo
     - Division 4: max 1950 Elo
     - Division 5: max 1800 Elo
     - Division 6: max 1700 Elo
  2. **Titular protection:** Titular players from higher teams (e.g. Team 1) are strictly prohibited from playing in lower teams.
  3. **Board strength order tolerance:** Permissible deviation from theoretical rating order among aligned players:
     - Div 1 & 2: maximum 3 spots deviation.
     - Div 3: maximum 2 spots deviation.
     - Div 4, 5, 6: maximum 1 spot deviation.
  4. **Division 1 specific constraints:** Minimum 1800 Elo for all players; minimum 2000 Elo required on boards 1 through 4.
  5. **Persistence:** Compositions, player settings, and availability are safely saved in browser `localStorage`.

---

### 5. Exports & Match Sheets
> **Goal:** Effortlessly communicate results and prepare official game-day paperwork.

* **What it displays:**
  * **Post-Round Email Recap:**
    * Formatted text report containing match wins, draws, losses, overall points, and board-by-board details.
    * Ready to copy and paste into email clients, WhatsApp, or Discord.
    * Supports partial text selection or one-click complete copying.
  * **Official Match Day Sheet ("Jour J"):**
    * Standardized lineup sheet for team captains on match day.
    * Pre-filled with board numbers, official registration numbers (matricules), names, Elo ratings, and captain signature fields.
    * Dedicated `Print` button with print-specific CSS for paper or PDF export.

---

## 🏛️ Architecture & Data Flow

```text
src/
├── api/                     # Network layer & HTTP client
│   ├── frbeClient.ts        # API calls to FRBE services (/anon/icclub, /anon/icseries, /anon/venue)
│   ├── firestoreFallback.ts # Fallback mirror if official FRBE servers are down
│   └── cache.ts             # In-memory and sessionStorage cache
│
├── domain/                  # Pure business domain (Pure TypeScript, 100% testable)
│   ├── rules/
│   │   └── frbeValidator.ts # Official FRBE tournament rules validation engine
│   ├── performance.ts       # Points, percentages, and FIDE TPR calculations
│   ├── standings.ts         # Division standings, match points, and tie-breaks
│   ├── scouting.ts          # Predictive opponent lineup analytics
│   ├── matches.ts           # Game-by-game match extraction
│   └── exporters.ts         # Formatted text generators for emails and print sheets
│
├── context/                 # Global React state (localStorage persistence)
│   ├── ClubContext.tsx      # Active club selector (default 541 Leuze)
│   └── SimulatorContext.tsx # Draft compositions, availability, and player flags
│
├── hooks/
│   └── useClubData.ts       # Central data orchestrator hook
│
├── components/              # UI Components (React + Tailwind CSS v4)
│   ├── layout/              # Navbar, Club Modal, Shell
│   ├── standings/           # Standings tab components
│   ├── players/             # Performance tab components
│   ├── scouting/            # Scouting tab components
│   ├── simulator/           # Simulator, deck, player settings modal
│   └── exports/             # Export models & printable match sheets
│
└── App.tsx                  # Root application component
```

---

## 🚀 Setup & Local Development

### Prerequisites
* [Node.js](https://nodejs.org/) v18+
* [npm](https://www.npmjs.com/)

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/your-username/interclub-dashboard.git
cd interclub-dashboard/interclub-dashboard

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at: **`http://localhost:5173`**.

---

## ☁️ Production Deployment (Vercel)

The app is fully optimized for one-click deployment on **Vercel** with zero backend infrastructure needed:

1. Push your repository to **GitHub**.
2. Connect to [Vercel](https://vercel.com/) and import your repository.
3. Click **Deploy**.
4. **CORS Handling:** The included `vercel.json` file automatically configures a proxy rewrite (`/api/v1/interclubs/:match*` -> `https://www.frbe-kbsb-ksb.be/api/v1/interclubs/:match*`), ensuring seamless live data fetching without browser CORS restrictions.