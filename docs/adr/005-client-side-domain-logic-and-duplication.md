# ADR-005 : Logique Métier et Validation FRBE côté Client

- **Statut** : Accepté
- **Périmètre** : `interclub-dashboard/src/domain/rules/frbeValidator.ts`, `src/domain/performance.ts`, `src/domain/scouting.ts`, `src/domain/calendar.ts`, `src/season.ts`, `server/src/utils/calendar.ts`

---

## Contexte

Le championnat d'interclubs de la FRBE (Fédération Royale Belge des Échecs) impose un ensemble complexe de règles administratives strictes pour homologuer les feuilles de match :
1. **Nombre d'échiquiers** imposé par division (8 en D1, 6 en D2/D3, 4 en D4/D5/D6).
2. **Interdiction de descente des titulaires** : un joueur titulaire d'une équipe supérieure ne peut pas jouer dans une équipe inférieure (`TITULAR_PLAYING_DOWN`).
3. **Plafonds Elo pour les réservistes** : selon la division (D1: 2350, D2: 2200, D3: 2050, D4: 1950, D5: 1800, D6: 1700 Elo).
4. **Règles spécifiques Division 1** : interdiction d'aligner sous 1800 Elo, et minimum 2000 Elo sur les échiquiers 1 à 4.
5. **Ordre des échiquiers par force Elo** : décalage maximum autorisé par rapport au classement théorique (`maxDiff` de 3 en D1/D2, 2 en D3, 1 en D4/D5/D6).
6. **Règle de hiérarchie des moyennes croisées** : la moyenne Elo d'une équipe doit être supérieure ou égale à celle de l'équipe suivante (sauf si les deux équipes évoluent en D4, D5 ou D6).
7. **Calculs statistiques** : performances TPR (Tournoi FIDE), différentiels Elo, détection des conflits de dates avec le championnat de France (FFE N1 à N4).

---

## Décision

- **Exécution 100 % côté client** : l'ensemble des règles et calculs est implémenté dans des fonctions pures en TypeScript dans `interclub-dashboard/src/domain/`.
- **Validation réactive temps réel** : à chaque clic, permutation ou assignation de joueur dans `SimulatorTab`, le validateur recalcul immédiatement les statuts `isValid`, `hasWarnings` et la liste des `RuleViolation`, projetant des pastilles d'erreur rouges ou d'avertissement jaunes sur chaque échiquier.
- **Scoring et TPR normalisés** : gestion stricte de l'inversion Domicile / Déplacement dans `performance.ts` (`formatBoardResult`, `getPlayerScoreFromFrbeResult`) pour toujours présenter le résultat du point de vue du joueur du club.

---

## Conséquences

### Positives
- **Expérience utilisateur instantanée** : feedback à 60 fps sans latence réseau, crucial pour le directeur qui teste plusieurs combinaisons d'alignement.
- **Fonctionnement hors-ligne complet** : le simulateur reste pleinement opérationnel dans le train ou sur le lieu de rencontre même en cas de mauvaise connexion 4G.
- **Zéro charge CPU sur le backend gratuit** : évite de consommer la mémoire et le CPU limités de l'instance Render.

### Négatives
- **Sécurité et intégrité absentes côté serveur** : l'API Express enregistre n'importe quel tableau d'échiquiers sans revalider les règles FRBE.
- **Duplication du calendrier** : les dates de rondes et la détection du statut des matchs sont implémentées en double (front et back).

---

## Analyse Critique & Améliorations Possibles

1. **Absence totale de validation côté API (`POST /rounds/:roundNumber/drafts`)** :
   - *Critique* : Le backend ne vérifie pas si un même joueur est assigné en double, si un joueur dépasse le plafond de réserve, ou si la composition viole les règles FRBE. Une requête HTTP malformée ou un script externe peut insérer des compositions invalides dans PostgreSQL.
   - *Amélioration* : Partager `frbeValidator.ts` entre front et back (ex: via un sous-dossier partagé `packages/domain` ou un module npm interne), ou au minimum valider le schéma des données avec **Zod** côté Express (format des échiquiers, unicité des `playerId`).
2. **Duplication du calendrier et des dates de rondes** :
   - *Critique* : Les 11 dates officielles de la saison 2026-2027 sont déclarées à la fois dans `interclub-dashboard/src/season.ts` (`ROUND_DATES`) et dans `server/src/utils/calendar.ts` (`ROUND_DATES_2026_2027`). Tout ajustement de date (ex: report de ronde par la FRBE) nécessite de modifier deux dépôts/fichiers distincts avec un risque de désynchronisation.
   - *Amélioration* : Stocker les dates de rondes dans la table PostgreSQL `Round.date` et les exposer via l'API, ou partager le fichier de configuration.
3. **Absence de tests unitaires sur la logique métier critique** :
   - *Critique* : Les règles FRBE (`validateTeamComposition`, `validateCrossTeamAverages`) et les calculs de score inversés (`getPlayerScoreFromFrbeResult`) constituent le cœur de valeur du projet mais ne disposent d'aucun test unitaire automatisé. Une régression sur la gestion des forfaits (FF) ou des nulles peut fausser les classements et le TPR.
   - *Amélioration* : Mettre en place **Vitest** et écrire des jeux de tests couvrant les cas limites (forfaits 1-0 FF, descente de titulaire, tie-break d'ordre d'échiquier).
4. **Départage d'ordre théorique basé sur le nom alphabétique en cas d'égalité Elo** :
   - *Critique* : Dans `frbeValidator.ts:134`, en cas d'égalité stricte d'Elo, le tri utilise `localeCompare` sur le nom. Or, la FRBE attribue un numéro d'ordre officiel figé sur la liste de force déposée en début de saison.
   - *Amélioration* : Intégrer l'indice d'ordre officiel FRBE quand il est disponible dans les données du club.
