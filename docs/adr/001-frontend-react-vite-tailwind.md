# ADR-001 : Stack Frontend SPA (React 19, Vite 8, Tailwind v4, React Contexts)

- **Statut** : Accepté
- **Périmètre** : `interclub-dashboard/` (`package.json`, `vite.config.ts`, `src/context/`, `src/hooks/useClubData.ts`)

---

## Contexte

L'application est un tableau de bord analytique et décisionnel destiné à un directeur d'interclubs d'échecs et aux membres d'un club. Elle agrège de nombreuses vues interactives (classements, statistiques TPR, calendrier, scouting, simulateur de compositions avec validation en temps réel, exports) sans exigence forte de référencement SEO sur des pages dynamiques.

L'équipe devait choisir entre :
1. Un meta-framework SSR/SSG (Next.js, Remix).
2. Une Single Page Application (SPA) légère avec Vite + React + Tailwind CSS et des Contexts natifs.
3. L'ajout de briques d'état/fetching externes (Redux Toolkit, Zustand, TanStack Query) et d'une bibliothèque UI complète (MUI, Ant Design).

---

## Décision

- **Bundler & Runtime** : **Vite 8 (`^8.3.0`)** + **React 19 (`^19.2.8`)** + **TypeScript (`~6.0.2`)** en SPA pure déployée en fichiers statiques (Vercel).
- **Design System** : **Tailwind CSS v4 (`^4.3.3`)** via `@tailwindcss/vite` + icônes `lucide-react` (`^1.48.0`), sans kit de composants tiers.
- **Gestion d'état** :
  - `ClubContext` (`src/context/ClubContext.tsx`) pour le club sélectionné (`clubId` persisté dans `localStorage`, défaut `541` Leuze-En-Hainaut).
  - `SimulatorContext` (`src/context/SimulatorContext.tsx`) pour les brouillons par ronde, disponibilités, historique d'annulation (pile jusqu'à 20 états) et persistance `localStorage` (`interclub_sim_${clubId}`).
  - `useClubData` (`src/hooks/useClubData.ts`) pour orchestrer le chargement et le calcul des données dérivées.
- **Qualité** : `oxlint` (`^1.81.0`) pour un linting ultra-rapide et `tsc -b` au build.

---

## Conséquences

### Positives
- **Déploiement trivial et gratuit** : le build (`dist/`) est purement statique, hébergeable sur Vercel sans fonction serveur Next.js ni cold start front.
- **Démarrage et builds rapides** : Vite + `oxlint` gardent la boucle de développement très réactive.
- **Maîtrise visuelle totale** : Tailwind v4 permet un style glassmorphism sombre cohérent et des règles CSS d'impression très fines sans lutter contre les surcharges d'un framework UI.
- **Zéro dépendance superflue** : très peu de paquets en production (`react`, `react-dom`, `lucide-react`, `tailwindcss`).

### Négatives
- **Absence de routeur URL** : la navigation repose sur l'état d'onglet dans `App.tsx`, ce qui empêche de partager un lien direct vers un onglet ou un joueur précis (deep-linking).
- **Couplage dans `useClubData` et `SimulatorContext`** : `SimulatorContext.tsx` dépasse 540 lignes et mêle état React, auto-fill algorithmique, historique undo et sérialisation `localStorage`.

---

## Analyse Critique & Améliorations Possibles

1. **Ajouter une suite de tests (Vitest)** :
   - *Constat* : Aucun framework de test n'est installé dans `interclub-dashboard/package.json`.
   - *Amélioration* : Introduire `vitest` pour couvrir la logique pure (`src/domain/`) sans toucher immédiatement aux composants UI.
2. **Remplacer le fetching manuel de `useClubData` par TanStack Query** :
   - *Constat* : `useClubData` gère manuellement `loading`, `error`, le cache `sessionStorage` et lance `Promise.all` sur les rondes sans `AbortController` en cas de changement rapide de `clubId` (risque de *race condition*).
   - *Amélioration* : `@tanstack/react-query` offrirait déduplication des requêtes, annulation automatique et rafraîchissement en arrière-plan (`stale-while-revalidate`).
3. **Aligner les versions TypeScript front/back** :
   - *Constat* : Le frontend utilise `typescript ~6.0.2` tandis que `server/` utilise `^5.6.2`.
   - *Amélioration* : Harmoniser les versions pour éviter des divergences de comportement du compilateur.
4. **Découper `SimulatorContext` et ajouter un mini-routing par hash/query** :
   - Extraire l'algorithme d'`autoFillAllTeams` vers `src/domain/` pour le rendre testable unitairement, et synchroniser l'onglet actif / la ronde sélectionnée dans les paramètres d'URL.
