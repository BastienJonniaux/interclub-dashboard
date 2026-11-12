# ADR-004 : Authentification par Clé Partagée (`DIRECTOR_KEY`) et Confidentialité

- **Statut** : Accepté (À renforcer)
- **Périmètre** : `server/src/middleware/auth.ts`, `server/src/routes/api.ts`, `server/src/controllers/`, `interclub-dashboard/src/api/backendClient.ts`, `interclub-dashboard/src/components/common/DirectorAuthModal.tsx`

---

## Contexte

L'application sert deux profils distincts :
1. **Le Directeur des Interclubs (et éventuellement le Président)** : doit pouvoir modifier et sauvegarder les compositions, marquer les présences/disponibilités des joueurs et verrouiller officiellement une ronde.
2. **Les membres du club et capitaines** : doivent pouvoir consulter librement les résultats passés, les classements, les feuilles de match et les statistiques TPR en lecture seule, sans avoir à créer de compte utilisateur.

Par ailleurs, les disponibilités des joueurs pour une **ronde à venir** sont des informations tactiques sensibles qui ne doivent pas fuiter aux clubs adverses avant le match.

---

## Décision

1. **Mécanisme d'authentification par clé secrète partagée** :
   - Variable d'environnement `DIRECTOR_KEY` configurée sur le serveur.
   - Transmission via le header HTTP `x-director-key` (ou le paramètre d'URL `directorKey`).
   - Le middleware `requireDirectorAuth` (`server/src/middleware/auth.ts`) bloque toute écriture (`POST /rounds/:roundNumber/drafts`, `POST /rounds/:roundNumber/lock`, `PUT /rounds/:roundNumber/attendances`) en retournant un code HTTP 401 ou 403 si la clé est absente ou invalide.
2. **Persistance côté navigateur** :
   - Le directeur saisit son mot de passe dans `DirectorAuthModal.tsx`.
   - La clé est validée via `POST /api/auth/verify` puis stockée dans le `localStorage` sous la clé `interclub_director_key`.
3. **Règle de confidentialité des rondes à venir** :
   - Les fonctions `isRoundInPast` comparent la date et l'heure actuelle avec le calendrier officiel FRBE (dimanche 20h00 heure de Bruxelles).
   - Si la ronde est future et que la requête ne contient pas une clé directeur valide, l'API masque les disponibilités et les compositions en attente (`403 Forbidden` avec `isRestricted: true, isUpcoming: true`).

---

## Conséquences

### Positives
- **Simplicité maximale pour les utilisateurs** : aucun parcours complexe d'inscription, d'e-mail de confirmation ou de gestion de mot de passe oublié pour les membres du club.
- **Protection immédiate des données tactiques** : les adversaires ne peuvent pas espionner les disponibilités des joueurs avant la rencontre.
- **Mémorisation fluide** : le directeur ne saisit son mot de passe qu'une seule fois par appareil.

### Négatives
- **Absence d'audit et d'identité individuelle** : impossible de distinguer si une modification a été effectuée par le directeur, par le président ou lors d'un test.
- **Partage non révocable unitairement** : si la clé est compromise, elle doit être changée pour tout le monde dans les variables d'environnement du serveur.

---

## Analyse Critique & Améliorations Possibles

1. **Absence de traçabilité de l'auteur (`updatedBy`)** :
   - *Critique* : Les tables `Round`, `TeamDraft` et `PlayerAttendance` possèdent des timestamps `updatedAt`, mais aucune information sur l'auteur de l'enregistrement. En cas de doute (ex: "est-ce moi ou le président qui a envoyé cette compo ?"), l'historique ne permet pas de trancher.
   - *Amélioration* : Ajouter un champ `savedBy` / `authorRole` (ex: `"Directeur"`, `"Président"`, ou un prénom) saisi ou déduit, stocké dans les tables `TeamDraft` et `Round`.
2. **Vulnérabilité de la clé par défaut (`director1234`)** :
   - *Critique* :
     - Si `process.env.DIRECTOR_KEY` n'est pas défini, le serveur utilise `'director1234'` par défaut (`server/src/middleware/auth.ts:4`, `api.ts:34`).
     - Côté frontend, `backendClient.ts:110` valide même `'director1234'` en mode hors-ligne sans contacter le serveur.
   - *Amélioration* : Rendre `DIRECTOR_KEY` obligatoire au démarrage en production (`if (process.env.NODE_ENV === 'production' && !process.env.DIRECTOR_KEY) throw new Error(...)`), et refuser tout mot de passe par défaut.
3. **Passage de la clé en query string (`req.query.directorKey`)** :
   - *Critique* : L'acceptation de la clé dans les paramètres d'URL expose le secret dans les logs d'accès HTTP d'éventuels reverse-proxies, l'historique du navigateur et les en-têtes `Referer`.
   - *Amélioration* : Restreindre strictement l'authentification au header `x-director-key` ou au header standard `Authorization: Bearer <key>`.
4. **Absence de limitation de débit (*Rate Limiting*)** :
   - *Critique* : `POST /api/auth/verify` n'est protégé par aucun rate-limiter, permettant des attaques par force brute pour deviner la clé.
   - *Amélioration* : Installer `express-rate-limit` (ex: maximum 5 tentatives erronées par minute par IP).
5. **Faille de configuration CORS (`server/src/index.ts:24`)** :
   - *Critique* : La ligne `return callback(null, true);` dans le validateur CORS autorise toutes les requêtes de tous les domaines, annulant le filtrage de `allowedOrigins`.
   - *Amélioration* : Retourner `callback(new Error('CORS Not Allowed'))` lorsque l'origine ne figure pas dans `allowedOrigins`.
