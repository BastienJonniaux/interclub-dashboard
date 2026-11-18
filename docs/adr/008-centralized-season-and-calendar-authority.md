# ADR-008 : Unification de la Saison et Autorité du Calendrier

- **Statut** : Accepté (Novembre 2026)
- **Périmètre** : `server/src/utils/season.ts`, `server/src/utils/calendar.ts`, `server/src/routes/api.ts`, `interclub-dashboard/src/season.ts`, `interclub-dashboard/src/api/firestoreFallback.ts`, `interclub-dashboard/src/api/backendClient.ts`

---

## Contexte

Les championnats interclubs de la Fédération Royale Belge des Échecs (FRBE) s'articulent autour d'une saison annuelle débutant en septembre et se terminant en avril (ex: 2026-2027), rythmée par 11 dates de rondes officielles jouées le dimanche à 14h00.

Dans la version initiale du projet :
1. Les 11 dates étaient dupliquées manuellement à la fois dans le frontend (`interclub-dashboard/src/season.ts`) et dans le backend (`server/src/utils/calendar.ts`).
2. Les notations de saison divergeaient : le frontend utilisait `'2026'` (`ACTIVE_SEASON`) tandis que le backend utilisait `'2026-2027'` (`DEFAULT_SEASON`).
3. L'URL REST du miroir de secours Firestore contenait le millésime `'2026'` codé en dur dans son chemin (`.../documents/years/2026`).

Cette dispersion posait un risque majeur de désynchronisation lors du basculement vers une nouvelle saison en septembre.

---

## Décision

Nous avons adopté l'**Option C (Le Backend comme Autorité + Normalisation Universelle & Fallback Résilient)** :

### 1. Centralisation Backend (`server/src/utils/season.ts`)
- Définition d'un dictionnaire unique des calendriers officiels par saison (`OFFICIAL_SEASON_CALENDARS`).
- Mise à disposition de fonctions utilitaires pures :
  - `normalizeSeasonYear(input)` : convertit uniformément `'2026'`, `'2026-2027'`, `'2026–2027'` et `'2026/2027'` vers le format pivot standard `'2026-2027'`.
  - `getSeasonStartYear(seasonYear)` : extrait l'année de départ (`'2026'`).
  - `getRoundDatesForSeason(seasonYear)` : renvoie les 11 dates officielles.
  - `getCurrentOrUpcomingRound(seasonYear, now)` : calcule la ronde actuelle selon le fuseau horaire de Bruxelles.
- Exposition d'un endpoint public `GET /api/season/current` qui fournit toute la configuration de la saison active (label, startYear, totalRounds, currentRound, roundDates).

### 2. Élimination des duplications
- `server/src/utils/calendar.ts` ne stocke plus son propre tableau de dates : il consomme directement `getRoundDatesForSeason()`.
- `interclub-dashboard/src/api/firestoreFallback.ts` n'a plus `'2026'` en dur : il utilise dynamiquement `${ACTIVE_SEASON}`.
- `interclub-dashboard/src/season.ts` intègre les helpers de normalisation afin que `defaultRound()` fonctionne de manière transparente avec `'2026'` comme avec `'2026-2027'`.

---

## Conséquences

### Positives
- **Source unique de vérité** : Lors d'une nouvelle saison, l'ajout du calendrier se fait au niveau des constantes centralisées sans risque de dérive entre les vérifications de confidentialité du serveur (`isRoundInPast`) et le planning de l'interface.
- **Résilience hors-ligne préservée** : Le frontend conserve un repli local statique dans `season.ts`, ce qui lui permet de continuer à fonctionner même en mode hors-ligne ou pendant le réveil (*cold start*) du serveur Render.
- **Compatibilité des formats** : Fini les erreurs de correspondance de clés étrangères dues à la confusion entre `'2026'` et `'2026-2027'`.

### Tests associés
- `server/src/utils/__tests__/season.test.ts` (11 tests couvrant la normalisation, l'extraction de millésime, le calendrier et `isRoundInPast`).
- `interclub-dashboard/src/domain/__tests__/season.test.ts` (9 tests couvrant la compatibilité des formats et le calcul de la ronde par défaut).
