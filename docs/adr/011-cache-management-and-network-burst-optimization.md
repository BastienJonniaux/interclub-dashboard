# ADR-011 : Stratégie de mise en cache, persistance différentielle et annulation des requêtes réseau

- **Statut** : Accepté & Implémenté
- **Périmètre** : `src/hooks/useClubData.ts`, `src/api/cache.ts`, `src/api/frbeClient.ts`, `src/api/fideClient.ts`, `src/api/firestoreFallback.ts`
- **Référence Architecture** : Section 4, Point 7 (`[RÉSOLU]`)

---

## Contexte

Lors du chargement initial du tableau de bord ou lors du changement de club sélectionné (`clubId`), l'application déclenche la récupération de l'ensemble des rondes jouées jusqu'à la ronde courante (`1..maxRound`). Plusieurs limites architecturales critiques avaient été identifiées :
1. **Rafale réseau concurrente non annulable** : `useClubData` lançait en parallèle jusqu'à 11 requêtes via `Promise.all(seriesPromises)` sans associer d'instance `AbortController`. En cas de changement rapide de club ou de démontage de composant, les requêtes en vol continuaient de s'exécuter, risquant d'écraser l'état avec des données désuètes (*race condition*). De plus, le `.catch(() => [])` interceptait toutes les erreurs, masquant les annulations.
2. **Variable globale mutable exportée (`export let isFallbackMode`)** : Dans `frbeClient.ts`, le statut de bascule vers le miroir de secours Firestore était géré par une variable globale réassignée directement au sein du module. Cet anti-pattern ES Module violait l'encapsulation, empêchait les tests unitaires isolés et compromettait la réactivité React.
3. **Invalidation de cache incomplète** : La fonction `clearCache()` ne scannait que `sessionStorage` pour les clés préfixées par `frbe_cache_*`. Les profils de joueurs FIDE stockés sous `fide_v3_*` ainsi que le cache mémoire `memoryCache` interne de `fideClient.ts` étaient totalement ignorés et restaient vivants.
4. **Perte et expiration des rondes historiques immuables** : Toutes les données étaient stockées indistinctement en `sessionStorage` avec un TTL court de 15 minutes (`DEFAULT_TTL_MS`). À la fermeture de l'onglet ou après 15 minutes, les résultats des rondes passées (pourtant définitifs et officiellement validés) expiraient, provoquant des requêtes répétitives et inutiles vers l'API FRBE.

---

## Décision

1. **Annulation des requêtes en vol via `AbortController` et `AbortSignal`** :
   - Dans `useClubData.ts`, chaque cycle de chargement instancie un `AbortController` dédié. La fonction de nettoyage du `useEffect` invoque immédiatement `controller.abort()`.
   - L'argument `signal?: AbortSignal` est propagé à l'ensemble de la chaîne d'appels : `fetchClub`, `fetchRoundSeries`, `fetchVenues`, `fetchPlayerDirectory` et les fallbacks Firestore (`fetchFirestoreClub`, `fetchFirestoreRound`).
   - Un utilitaire `combineSignals` combine le signal d'annulation externe avec les signaux d'expiration temporelle (`AbortSignal.timeout`) via `AbortSignal.any` (ou contrôleur combiné de repli).
   - Dans le gestionnaire d'erreurs de `useClubData`, les rejets liés à `AbortError` sont silencieusement ignorés sans altérer l'état ni lever d'alerte visuelle erronée.
2. **Encapsulation stricte du mode dégradé Firestore** :
   - Suppression définitive de `export let isFallbackMode`.
   - Remplacement par des accesseurs de module : `getIsFallbackMode()`, `setFallbackMode(val: boolean)` et `resetFallbackMode()`.
   - `useClubData` consomme `getIsFallbackMode()`, garantissant une lecture immuable et un typage strict.
3. **Invalidation exhaustive multi-stockage (`clearCache`)** :
   - `clearCache()` parcourt et purge l'ensemble des clés débutant par `frbe_cache_` et `fide_` (couvrant `fide_` et `fide_v3_`) à la fois dans `sessionStorage` et dans `localStorage`.
   - Export et exécution de `clearFideMemoryCache()` depuis `fideClient.ts` pour réinitialiser le cache en mémoire RAM.
4. **Stratégie de persistance différentielle (15 min vs 30 jours)** :
   - Introduction de l'interface `CacheOptions { ttlMs?: number; persistent?: boolean; }` et de la constante `COMPLETED_ROUND_TTL_MS = 30 * 24 * 60 * 60 * 1000` (30 jours).
   - Les rondes historiques clôturées (`round < defaultRound(ACTIVE_SEASON)`) sont stockées dans `localStorage` avec un TTL de 30 jours : elles survivent au rafraîchissement et à la fermeture du navigateur.
   - Les rondes actives/en cours restent dans `sessionStorage` avec un TTL de 15 minutes.
   - En cas de modification officielle rétroactive par la fédération, le bouton « Rafraîchir » du tableau de bord appelle `clearCache()` qui vide simultanément les deux stockages.

---

## Conséquences

### Positives
- **Éradication des race conditions** : le changement d'onglet ou de club annule instantanément les flux réseau en vol.
- **Réduction drastique du trafic réseau** : les données immuables des rondes passées sont lues instantanément depuis le stockage local sans solliciter le serveur FRBE.
- **Encapsulation propre et testabilité** : absence de mutation globale inter-modules, testabilité complète sous Vitest.
- **Cohérence des profils FIDE** : réinitialisation complète et déterministe lors du vidage de cache.

### Négatives / Mitigations
- *Espace de stockage local* : le stockage des séries complètes de rondes passées dans `localStorage` consomme environ 50 à 150 KB, ce qui reste négligeable par rapport au quota navigateur standard (5 à 10 MB).
