# ADR-004 : Authentification par Clé Partagée (`DIRECTOR_KEY`) et Confidentialité

- **Statut** : Accepté et Renforcé (Novembre 2026)
- **Périmètre** : `server/src/middleware/auth.ts`, `server/src/routes/api.ts`, `server/src/controllers/`, `server/prisma/schema.prisma`, `interclub-dashboard/src/api/backendClient.ts`, `interclub-dashboard/src/components/common/DirectorAuthModal.tsx`

---

## Contexte

L'application sert deux profils distincts :
1. **Le Directeur des Interclubs (et éventuellement le Président)** : doit pouvoir modifier et sauvegarder les compositions, marquer les présences/disponibilités des joueurs et verrouiller officiellement une ronde.
2. **Les membres du club et capitaines** : doivent pouvoir consulter librement les résultats passés, les classements, les feuilles de match et les statistiques TPR en lecture seule, sans avoir à créer de compte utilisateur.

Par ailleurs, les disponibilités des joueurs pour une **ronde à venir** sont des informations tactiques sensibles qui ne doivent pas fuiter aux clubs adverses avant le match.

---

## Décision

1. **Mécanisme d'authentification par clé secrète partagée renforcée** :
   - Variable d'environnement `DIRECTOR_KEY` configurée sur le serveur.
   - En environnement de production (`NODE_ENV === 'production'`), le serveur refuse de démarrer si `DIRECTOR_KEY` est indéfini ou trop court (< 8 caractères). Aucun mot de passe par défaut n'est toléré en production.
   - Transmission sécurisée uniquement via l'en-tête HTTP `x-director-key` ou `Authorization: Bearer <clé>`. Tout passage de la clé dans les paramètres d'URL (query string) est formellement rejeté avec une erreur HTTP 400.
   - Comparaison en temps constant (`crypto.timingSafeEqual`) pour immuniser contre les attaques temporelles (*timing attacks*).
   - Le middleware `requireDirectorAuth` (`server/src/middleware/auth.ts`) bloque toute écriture non authentifiée (`POST /rounds/:roundNumber/drafts`, `POST /rounds/:roundNumber/lock`, `PUT /rounds/:roundNumber/attendances`).
2. **Limitation de débit (*Rate Limiting*) anti force-brute** :
   - L'endpoint `POST /api/auth/verify` est protégé par `express-rate-limit` (maximum 10 tentatives par tranche de 15 minutes par IP).
3. **Herméticité CORS** :
   - Le middleware CORS rejette explicitement toute requête dont l'origine ne figure pas dans la liste blanche (`allowedOrigins`), protégeant ainsi l'API contre les requêtes forgées cross-origin non autorisées.
4. **Traçabilité et Audit (`savedBy`)** :
   - Ajout du champ `savedBy String?` dans les modèles Prisma PostgreSQL `Round` et `TeamDraft`.
   - L'auteur peut saisir son identifiant/nom (ex: Bastien, Président) dans `DirectorAuthModal.tsx`, qui est transmis lors des écritures et affiché dans la barre de synchronisation du simulateur.
5. **Règle de confidentialité des rondes à venir** :
   - Les fonctions `isRoundInPast` comparent la date et l'heure actuelle avec le calendrier officiel FRBE (dimanche 20h00 heure de Bruxelles).
   - Si la ronde est future et que la requête ne contient pas une clé directeur valide, l'API masque les disponibilités et les compositions en attente (`403 Forbidden` avec `isRestricted: true, isUpcoming: true`).

---

## Conséquences

### Positives
- **Simplicité préservée** : aucun système lourd de base d'utilisateurs ou de confirmation par e-mail nécessaire pour un club amateur.
- **Sécurité et robustesse accrues** : immunité contre le brute-force, protection contre les fuites de clés dans les URLs et logs, et protection contre les attaques temporelles.
- **Transparence d'équipe** : le directeur et le président voient immédiatement qui a procédé à la dernière modification d'une composition.
- **CORS hermétique** : seuls les domaines explicitement configurés peuvent interagir avec l'API.

### Négatives & Limites acceptées
- **Secret partagé unique** : si la clé fuit en dehors du comité, elle doit être changée sur le serveur d'hébergement. Le rate-limiting limite toutefois drastiquement le risque de compromission par force brute.
