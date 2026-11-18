# ADR-003 : Backend Express + Prisma + PostgreSQL (Neon / Render)

- **Statut** : Accepté
- **Périmètre** : `server/` (`package.json`, `prisma/schema.prisma`, `src/index.ts`, `src/controllers/`, `Dockerfile`), `docker-compose.yml`, `DEPLOYMENT.md`

---

## Contexte

Dans sa première version, le simulateur stockait les compositions uniquement dans le `localStorage` du navigateur du directeur. Cela posait deux limites bloquantes pour un usage réel en club :
1. **Pas de collaboration ni de diffusion** : le directeur ne pouvait pas publier les compositions vers le président, les capitaines ou les joueurs sans passer par un copier-coller manuel.
2. **Volatilité des données** : vider le cache du navigateur ou changer d'ordinateur effaçait les brouillons, notes et disponibilités de toute la saison.

Le besoin était donc d'ajouter une persistance centralisée accessible par API, tout en restant dans un cadre d'hébergement gratuit sans frais récurrents pour le club.

---

## Décision

- **Framework API** : Node.js 20 + **Express 4 (`^4.21.0`)** écrit en TypeScript, packagé sous forme de conteneur Docker multi-stage (`node:20-slim`).
- **ORM & Base de données** : **Prisma (`^5.20.0`)** connecté à une base **PostgreSQL** :
  - En local : PostgreSQL 16 Alpine via `docker-compose.yml`.
  - En production : instance serverless PostgreSQL gratuite sur **Neon.tech** (région Frankfurt).
- **Modèle relationnel** (`server/prisma/schema.prisma`) :
  - `Season` (`id`, `year`, `isCurrent`)
  - `Round` (`id`, `seasonId`, `roundNumber`, `isLocked`, `lockedAt`, contrainte `@@unique([seasonId, roundNumber])`)
  - `TeamDraft` (`id`, `roundId`, `teamNumber`, `divisionLabel`, contrainte `@@unique([roundId, teamNumber])`)
  - `BoardAssignment` (`id`, `teamDraftId`, `boardNumber`, `playerId`, `playerName`, `playerRating`, contrainte `@@unique([teamDraftId, boardNumber])`)
  - `PlayerAttendance` (`id`, `roundId`, `playerId`, `playerName`, `status`, `note`, contrainte `@@unique([roundId, playerId])`)
- **Résilience côté client** (`src/api/backendClient.ts`) : le frontend continue de fonctionner en consultation FRBE et avec les brouillons `localStorage` si l'API backend est indisponible ou hors ligne.

---

## Conséquences

### Positives
- **Hébergement 100 % gratuit** : combinaison Render Free Web Service + Neon Free Postgres.
- **Portabilité et indépendance** : pas de dépendance propriétaire (ni Firebase SDK, ni Supabase lock-in) ; l'API peut être migrée chez n'importe quel hébergeur Docker ou Node.js.
- **Intégrité transactionnelle** : `saveRoundDrafts` exécute la mise à jour des échiquiers d'une équipe dans une transaction Prisma atomique (`prisma.$transaction`), garantissant qu'une sauvegarde partielle ne corrompt pas la composition.

### Négatives
- **Cold start Render Free** : le conteneur s'endort après 15 minutes d'inactivité, générant un délai de 30 à 50 secondes au réveil.
- **Schéma relationnel mono-club** : absence de colonne `clubId` dans la base.

---

## Analyse Critique & Améliorations Possibles

1. **Absence critique de `clubId` dans le schéma PostgreSQL** :
   - *Critique* : Le frontend supporte le changement de club via `ClubSelectorModal` (`ClubContext`), mais les tables Prisma `Round`, `TeamDraft` et `PlayerAttendance` n'ont aucun champ `clubId`. Si deux clubs utilisent le dashboard sur la même URL d'API, leurs compositions s'écraseront mutuellement.
   - *Amélioration* :
     - Ajouter `clubId Int` sur le modèle `Round`.
     - Remplacer `@@unique([seasonId, roundNumber])` par `@@unique([seasonId, clubId, roundNumber])`.
     - Faire évoluer les endpoints en `/api/clubs/:clubId/rounds/:roundNumber/...`.
2. **Incompatibilité entre le cold start de Render et les timeouts frontend** :
   - *Critique* : `backendClient.ts` applique des timeouts stricts (`4000 ms` pour `/api/health`, `5000 ms` pour `fetchRoundDrafts`). Lors d'un cold start sur Render (30–50 s), les requêtes échouent systématiquement par timeout, faisant croire au directeur que la base est déconnectée.
   - *Amélioration* : Augmenter le timeout de la première requête de healthcheck, afficher une notification claire *"Démarrage du serveur cloud en cours (~30s)..."*, ou configurer un ping cron gratuit (ex: cron-job.org) les dimanches matins de ronde.
3. **Absence d'historique de migrations versionné** :
   - *Critique* : Le projet utilise `prisma db push` sans dossier `prisma/migrations/`. Le `Dockerfile` n'exécute pas de migration automatique au démarrage, ce qui oblige à une intervention manuelle lors de modifications du schéma.
   - *Amélioration* : Initialiser `prisma migrate dev` et ajouter `npx prisma migrate deploy` dans le script d'entrée du conteneur.
4. **Duplication du service de saison côté backend** :
   - *Critique* : La fonction `getOrCreateSeason` et la constante `DEFAULT_SEASON = '2026-2027'` sont copiées-collées à l'identique dans `draftsController.ts` et `attendancesController.ts`.
   - *Amélioration* : Extraire un service centralisé `server/src/services/seasonService.ts`.
