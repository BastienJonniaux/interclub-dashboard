# Interclub Director Dashboard 🏆♟️

Tableau de bord complet pour directeurs et capitaines d'interclubs d'échecs en Belgique (FRBE / KBSB).

Conçu avec **React 19**, **TypeScript**, **Tailwind CSS v4** et **Vite**.

---

## 🌟 Fonctionnalités

1. **Classements de toutes les équipes du club :**
   - Vue consolidée de toutes les équipes (Leuze 1, 2, 3, 4, 5...) dans leurs divisions respectives.
   - Pts Match, Pts Échiquier, Rang, et tableaux détaillés dépliables.
2. **Performance des joueurs & TPR :**
   - Tableau individuel complet avec calcul automatique de la Performance Tournoi FIDE (**TPR**), différentiel d'Elo et divisions jouées.
   - Badge "En forme" (flamme) pour les joueurs performants.
3. **Scouting & Préparation du prochain match :**
   - Détection de l'adversaire de la prochaine ronde (Domicile / Extérieur).
   - Analyse des tendances adverses (qui joue habituellement aux échiquiers 1, 2, 3...).
   - **Indicateur de préparation tricolore :**
     - 🟢 **Vert :** Favori (+50 Elo ou plus)
     - 🟡 **Jaune :** Match équilibré
     - 🔴 **Rouge :** En danger (-50 Elo ou moins) $\rightarrow$ alerte pour le directeur (besoin de renforts !).
4. **Simulateur de Composition & Validateur des Règles FRBE :**
   - Gestionnaire de disponibilité des joueurs (Disponible, Incertain, Indisponible).
   - Placement interactif des joueurs sur chaque échiquier avec moyenne Elo dynamique.
   - **Vérificateur automatique des règles FRBE :**
     - Alerte si un titulaire d'équipe supérieure joue dans une équipe inférieure (*jouer vers le bas est interdit*).
     - Alerte en cas de non-respect de l'ordre décroissant des forces (Elo) avec tolérance paramétrée (100 pts max).
     - Alerte en cas de joueur assigné en double ou d'échiquier vide.
   - Sauvegarde automatique locale (`localStorage`) pour ne jamais perdre son brouillon.
5. **Exports en 1 clic :**
   - **Générateur d'e-mail d'après-ronde :** Texte prêt à copier-coller (résultats de toutes les équipes, détails par échiquier, bilan victoires/nuls/défaites) pour envoi aux membres du club.
   - **Feuille de match officielle (Jour J) :** Feuille propre et imprimable pour le capitaine avec matricules, noms, Elo et signature.

---

## 🏗️ Architecture du Projet

Le code est structuré de façon modulaire pour être maintenable dans le temps **sans agent IA** :

```text
src/
├── api/                     # Couche Réseau (Requêtes FRBE + Cache TTL)
│   ├── frbeClient.ts        # Appels vers /anon/icclub, /anon/icseries, /anon/venue
│   └── cache.ts             # Cache mémoire et sessionStorage (15 min)
│
├── domain/                  # Logique Métier pure (SANS React, 100% testable)
│   ├── rules/
│   │   └── frbeValidator.ts # Moteur de vérification des règlements officiels FRBE
│   ├── performance.ts       # Calcul des points, parties valides et TPR FIDE
│   ├── standings.ts         # Calcul des classements et départages de division
│   ├── scouting.ts          # Analyse des compositions adverses et calcul du delta Elo
│   └── exporters.ts         # Générateur de texte email et feuilles imprimables
│
├── context/                 # État Global (Sauvegardé en localStorage)
│   ├── ClubContext.tsx      # Club actif (541 par défaut) avec sélecteur
│   └── SimulatorContext.tsx # Disponibilités et compositions brouillons
│
├── hooks/                   # Hooks React d'accès aux données
│   └── useClubData.ts       # Orchestre le chargement, les calculs et le rafraîchissement
│
├── components/              # Interface Utilisateur (React + Tailwind CSS)
│   ├── layout/              # Navbar et Modal de changement de club
│   ├── standings/           # Onglet 1: Classements
│   ├── players/             # Onglet 2: Performance Joueurs & TPR
│   ├── scouting/            # Onglet 3: Scouting Prochain Match
│   ├── simulator/           # Onglet 4: Simulateur & Règles FRBE
│   └── exports/             # Onglet 5: Exports & Mails
│
└── App.tsx                  # Coquille principale
```

---

## 🚀 Démarrage Rapide

Dans le dossier `interclub-dashboard` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application s'ouvre sur `http://localhost:5173`.

---

## 🌐 Déploiement Gratuit (Vercel ou Cloudflare Pages)

Ce projet ne nécessite **aucun serveur backend** ni carte bancaire.

### Déploiement sur Vercel :
1. Poussez votre dossier sur GitHub.
2. Connectez-vous sur [Vercel](https://vercel.com) avec votre compte GitHub.
3. Importez le projet et cliquez sur **Deploy**.
4. C'est tout !

