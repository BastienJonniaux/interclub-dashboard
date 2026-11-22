# ADR-012 : Résilience aux démarrages à froid (Cold Start) du serveur Render Free-Tier

- **Statut** : Accepté & Implémenté
- **Périmètre** : `src/api/backendClient.ts`, `src/components/simulator/SimulatorTab.tsx`
- **Référence Architecture** : Section 4, Point 8 (`[RÉSOLU]`)

---

## Contexte

Le backend Express / Prisma / PostgreSQL est hébergé sur le plan gratuit de Render (*Free Web Service*). Ce palier économique impose une mise en veille automatique (*spin-down*) de l'instance après 15 minutes d'inactivité réseau.
Lorsqu'un utilisateur ouvre l'application après une période de veille :
- Le démarrage du conteneur, l'initialisation du runtime Node.js et l'établissement du pool de connexions vers la base PostgreSQL (Neon) nécessitent entre **30 et 50 secondes**.
- Dans la configuration initiale, les fonctions de `backendClient.ts` appliquaient des timeouts agressifs de **4 à 5 secondes** (`AbortSignal.timeout(4000)` pour `/api/health`, `AbortSignal.timeout(5000)` pour `fetchRoundDrafts`).
- En conséquence, les requêtes initiales échouaient immédiatement sur timeout, basculant silencieusement le simulateur en mode « Local (Hors-ligne) », donnant l'illusion trompeuse que le serveur ou la base de données étaient en panne.
- Aucun mécanisme de nouvelle tentative (*retry*) n'était en place : l'application demeurait hors-ligne jusqu'à un rafraîchissement manuel ultérieur par l'utilisateur.

---

## Décision

1. **Allongement calibré des timeouts client** :
   - Définition de constantes architecturales explicites :
     - `COLD_START_TIMEOUT_MS = 50_000` (50 secondes, couvrant le pire cas de réveil du conteneur Render).
     - `PING_TIMEOUT_MS = 8_000` (8 secondes par tentative individuelle de ping sur `/api/health`).
     - `DEFAULT_TIMEOUT_MS = 25_000` (25 secondes pour les opérations courantes telles que la vérification de clé, les sauvegardes et les statistiques d'assiduité).
   - `fetchRoundDrafts` est aligné sur `COLD_START_TIMEOUT_MS` afin de ne pas avorter prématurément lors du premier accès au simulateur.
2. **Boucle de retry automatique avec callback de progression (`checkServerHealth`)** :
   - `checkServerHealth` accepte désormais l'option `HealthCheckOptions { maxWaitMs?: number; onProgress?: (info: { isWakingUp: boolean; elapsedMs: number }) => void; }`.
   - Si la première tentative de connexion à `/api/health` échoue (timeout ou indisponibilité temporaire), la méthode notifie `onProgress({ isWakingUp: true, elapsedMs })`, temporise 2,5 secondes, puis relance automatiquement une nouvelle tentative jusqu'à concurrence de `maxWaitMs` (50 secondes par défaut).
   - Si le serveur répond avec succès, la promesse se résout en `{ online: true, database: true, isWakingUp: false }`.
   - Si le délai maximal est dépassé sans réponse, la promesse conclut formellement à un état hors-ligne.
3. **Feedback visuel distinct dans l'interface utilisateur (`SimulatorTab.tsx`)** :
   - L'état de synchronisation serveur intègre la propriété `isWakingUp: boolean`.
   - Pendant le réveil du conteneur Render, la barre de statut n'affiche plus un faux état « Local (Hors-ligne) », mais un badge ambre explicite animé :
     `<Loader2 className="animate-spin text-amber-600" /> Réveil du serveur Render en cours...`.
   - Dès la confirmation du réveil (`status.online === true`), l'interface passe automatiquement au badge vert `Connectée (PostgreSQL)` et déclenche en tâche de fond le rafraîchissement transparent des brouillons et du verrouillage officiel de la ronde.

---

## Conséquences

### Positives
- **Expérience utilisateur transparente** : l'utilisateur est informé en temps réel du démarrage du serveur distant sans confusion avec une panne d'infrastructure.
- **Auto-rétablissement sans rechargement** : le composant se connecte dès que l'instance Render est prête sans intervention manuelle.
- **Robustesse des opérations critiques** : les requêtes de chargement de brouillons ne tombent plus en échec prématuré.

### Négatives / Mitigations
- *Attente initiale incompressible* : la latence de démarrage à froid de Render Free-Tier (~40s) reste présente lors de la première requête après 15 min d'inactivité. Elle est mitigée par le feedback clair, la conservation du fonctionnement local en mode hors-ligne fluide, et la possibilité d'ajouter un service de ping externe (ex: cron UptimeRobot) si souhaité.
