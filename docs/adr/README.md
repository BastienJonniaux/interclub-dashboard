# Architecture Decision Records (ADR)

Ce dossier recense les principales décisions d'architecture prises dans le projet **Interclub Director Dashboard**, leur contexte, leurs compromis et une évaluation critique des améliorations envisageables.

| ID | Titre | Statut | Criticité / Dette identifiée |
| :--- | :--- | :--- | :--- |
| [ADR-001](./001-frontend-react-vite-tailwind.md) | Stack Frontend SPA (React 19, Vite 8, Tailwind v4, Contexts) | Accepté | Absence de tests (Vitest) et de TanStack Query pour le fetching |
| [ADR-002](./002-frbe-proxy-cache-and-firestore-fallback.md) | Proxy FRBE, Cache `sessionStorage` et Miroir Firestore REST | Accepté | Variable globale mutable `isFallbackMode`, millésime `2026` en dur, code mort (`frbeGatewayCalls.ts`) |
| [ADR-003](./003-backend-express-prisma-postgresql.md) | Backend Express + Prisma + PostgreSQL (Neon / Render) | Accepté | **Schéma mono-club** (pas de `clubId`), cold start Render vs timeouts courts |
| [ADR-004](./004-director-key-authentication-and-privacy.md) | Authentification par Clé Partagée (`DIRECTOR_KEY`) et Confidentialité | Accepté (à renforcer) | Pas d'audit d'auteur (`updatedBy`), clé par défaut `'director1234'`, pas de rate-limit, CORS permissif |
| [ADR-005](./005-client-side-domain-logic-and-duplication.md) | Logique Métier et Validation FRBE côté Client | Accepté | Duplication du calendrier front/back et absence de validation serveur |
| [ADR-006](./006-native-print-portal-match-sheets.md) | Génération des Feuilles de Match via `@media print` et `createPortal` | Accepté | Dépend des réglages d'impression navigateur ; pas d'export `.pdf` binaire direct |
