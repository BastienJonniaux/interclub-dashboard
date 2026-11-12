# ADR-002 : Proxy FRBE, Cache `sessionStorage` et Miroir Firestore REST

- **Statut** : Accepté
- **Périmètre** : `interclub-dashboard/vercel.json`, `interclub-dashboard/vite.config.ts`, `src/api/frbeClient.ts`, `src/api/firestoreFallback.ts`, `src/api/cache.ts`, `src/api/fideClient.ts`, `src/frbeGatewayCalls.ts`

---

## Contexte

L'application dépend de l'API publique non versionnée de la FRBE/KBSB (`https://www.frbe-kbsb-ksb.be/api/v1/interclubs/...`), qui :
1. Bloque les appels directs depuis un autre domaine dans le navigateur (en-têtes **CORS**).
2. Subit parfois des indisponibilités (erreurs 502 ou timeouts, notamment les dimanches de ronde).
3. Ne fournit ni historique FIDE complet ni endpoint unique consolidé pour toutes les rondes.

Par ailleurs, un miroir communautaire/externe existe sur Cloud Firestore (`interclub-668f3`), et l'API publique de Lichess expose les profils et historiques FIDE (`https://lichess.org/api/fide/player`).

---

## Décision

1. **Contournement CORS par Proxy/Rewrite léger (sans backend dédié FRBE)** :
   - En local : proxy Vite dans `vite.config.ts` redirigeant `/api` vers `https://www.frbe-kbsb-ksb.be` (`changeOrigin: true`, `secure: false`).
   - En production : rewrite Vercel dans `vercel.json` mappant `/api/v1/interclubs/:match*` vers la FRBE.
2. **Miroir Firestore sans SDK Firebase** (`src/api/firestoreFallback.ts`) :
   - En cas d'échec ou timeout (`10000 ms`) sur `anon/icclub/{clubId}` ou `anon/icseries?round={round}`, `frbeClient.ts` interroge l'API REST Firestore via `fetch` et décode manuellement le format typé Firestore (`stringValue`, `integerValue`, `mapValue`, `arrayValue`) via `decodeFirestoreDocument` / `decodeFirestoreValue`.
3. **Cache client TTL en `sessionStorage`** (`src/api/cache.ts`) :
   - Préfixe `frbe_cache_` avec TTL fixe de 15 minutes (`DEFAULT_TTL_MS = 15 * 60 * 1000`).
4. **Enrichissement FIDE via Lichess + matching flou** (`src/api/fideClient.ts`) :
   - Recherche multi-requêtes (nom/prénom inversés, nom seul) puis score pondéré (`matchBestCandidate` avec distance de Levenshtein `<= 1`, bonus fédération `BEL` et proximité Elo `±60 pts`), avec cache mémoire + `sessionStorage` (`fide_v3_`).

---

## Conséquences

### Positives
- **Coût serveur FRBE nul** : Vercel agit comme simple reverse-proxy statique sans consommer de temps de calcul sur Render.
- **Économie massive de bundle** : le décodeur REST Firestore (~30 lignes) évite d'embarquer le SDK `firebase/firestore` (+300 KB minifiés).
- **Tolérance aux pannes** : l'utilisateur continue de consulter classements et résultats même si le site FRBE renvoie une erreur 502.

### Négatives
- **Dépendance forte au projet Vercel** : si le frontend est déployé ailleurs (Netlify, GitHub Pages, Render static) sans recréer les règles de rewrite, tous les appels `/api/v1/interclubs/*` échoueront (et dans `vite.config.ts`, `secure: false` désactive la vérification TLS en dev).
- **Modèle Firestore couplé à un millésime fixe** : `FIRESTORE_BASE` pointe en dur vers `.../years/2026`.

---

## Analyse Critique & Améliorations Possibles

1. **Variable globale mutable `isFallbackMode` (`src/api/frbeClient.ts:11`)** :
   - *Critique* : `export let isFallbackMode = false` est partagé au niveau module. Si `fetchClub` réussit sur la FRBE mais que `fetchRoundSeries` bascule sur Firestore (ou inversement), l'état reflète uniquement le dernier appel et n'est pas encapsulé dans un retour typé `{ data, source: 'frbe' | 'firestore' }`.
   - *Amélioration* : Retourner explicitement la provenance des données par requête.
2. **Code mort / doublon `src/frbeGatewayCalls.ts` et `src/models/`** :
   - *Critique* : `src/frbeGatewayCalls.ts` (qui appelle directement `https://www.frbe-kbsb-ksb.be/...` sans passer par `/api`) n'est importé nulle part dans `src/`. De même, sur tout le dossier `src/models/`, seul `ResultEnum.ts` est encore importé par `firestoreFallback.ts`, le reste étant remplacé par `src/modelsFRBE.ts`.
   - *Amélioration* : Supprimer `frbeGatewayCalls.ts` et nettoyer `src/models/` pour éviter toute confusion lors des maintenances futures.
3. **Cache `sessionStorage` trop uniforme et non synchronisé** :
   - *Critique* :
     - Les rondes déjà jouées il y a plusieurs semaines ne changent quasiment plus mais expirent au bout de 15 min, générant jusqu'à 11 appels réseau à chaque nouvel onglet.
     - `fetchVenues()` avale toutes les erreurs (`catch { return []; }`) sans fallback Firestore ni signalement d'erreur.
     - `fetchPlayerDirectory()` ne récupère que les joueurs présents dans la ronde 1 de Firestore (`extractPlayersFromFirestoreRound(1)`), manquant les joueurs entrés en cours de saison ou n'ayant pas joué la ronde 1 (hors joueurs du club courant).
     - `clearCache()` efface `frbe_cache_*` mais ignore `fide_v3_*`.
   - *Amélioration* : Appliquer un TTL long (ex: 24h) pour les rondes passées clôturées et court (5–15 min) pour la ronde active ; enrichir le dictionnaire joueurs sur l'ensemble des rondes chargées.
4. **Risque d'homonymie sur `fideClient.ts`** :
   - Le matching flou sur `lichess.org/api/fide/player` est ingénieux mais reste heuristique en l'absence d'ID FIDE fourni directement dans `PlayerFrbe`. Un badge indiquant que l'historique FIDE est un rapprochement automatique limiterait les confusions sur les homonymes.
