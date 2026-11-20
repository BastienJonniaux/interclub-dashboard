# ADR-009 : Validation de Schéma Zod et Règles Métier FRBE Côté Serveur

- **Statut** : Accepté (Novembre 2026)
- **Périmètre** : `server/src/validation/schemas.ts`, `server/src/validation/frbeRules.ts`, `server/src/controllers/draftsController.ts`

---

## Contexte

Dans la version initiale, la validation des règles de la Fédération Royale Belge des Échecs (FRBE) reposait exclusivement sur le code exécuté dans le navigateur client (`interclub-dashboard/src/domain/rules/frbeValidator.ts`).

Côté backend, les routes `POST /api/rounds/:roundNumber/drafts` et `POST /api/rounds/:roundNumber/lock` ne procédaient à aucune vérification structurelle en dehors de la présence d'un objet JSON. Cette asymétrie présentait deux risques majeurs :
1. **Intégrité de la base de données** : un appel forgé ou un bogue client pouvait enregistrer des numéros d'échiquiers aberrants (ex: échiquier 42), des doublons d'échiquiers (deux joueurs sur l'échiquier 1), ou assigner un même joueur à deux équipes différentes lors de la même ronde.
2. **Conformité réglementaire** : aucune trace ni alerte côté serveur sur le respect des règles officielles (descente de titulaires, moyennes croisées, limites de réserves, complétude des équipes).

---

## Décision

Nous avons adopté une architecture de validation à deux niveaux :

```text
Requête HTTP entrante
        │
        ▼
[Niveau 1 : Schéma Zod] ──── Échoue ────► HTTP 400 Bad Request immédiat
        │ (Intégrité structurelle,
        │  pas de doublon joueur/échiquier)
        ▼
[Niveau 2 : Règles FRBE]
        ├─ Sauvegarde brouillon (POST /drafts) ──► Enregistrement + Rapport validation informatif
        └─ Verrouillage officiel (POST /lock)  ──► Verrouillage + Avertissement explicite (Option B)
```

### 1. Validation de schéma avec Zod (`server/src/validation/schemas.ts`)
- Définition de `saveDraftsSchema` et `lockRoundSchema`.
- Contrôles stricts :
  - Numéro d'échiquier borné entre 1 et 8.
  - Matricules joueurs entiers positifs.
  - **Refinement 1** : rejet strict de tout doublon d'échiquier au sein d'une même équipe.
  - **Refinement 2** : rejet strict si un joueur est aligné dans plusieurs équipes pour la même ronde.
- En cas de non-respect, l'API renvoie un code HTTP `400 Bad Request` avec le détail des champs invalides.

### 2. Validateur de règles FRBE côté serveur (`server/src/validation/frbeRules.ts`)
- Vérification des contraintes fédérales :
  - Complétude par division (8 échiquiers en Div 1/2, 6 en Div 3, 4 en Div 4/5/6).
  - Interdiction de descente de titulaire (`TITULAR_PLAYING_DOWN`).
  - Plafond Elo des réservistes par division (`RESERVE_ELO_LIMITS`).
  - Plancher de 1800 Elo et seuil des 4 premiers échiquiers à 2000 Elo en Division 1.
  - Ordre des échiquiers avec tolérance de décalage.
  - Règle des moyennes croisées inter-équipes (avec exemption pour les équipes en Div 4/5/6).

### 3. Philosophie de verrouillage (Option B : Avertissement)
- Lors de la sauvegarde d'un brouillon (`POST /drafts`), le serveur ne bloque pas les compositions incomplètes pour permettre au directeur de sauvegarder son travail en cours d'élaboration, mais renvoie un rapport d'évaluation.
- Lors du verrouillage officiel (`POST /lock`), le serveur autorise le verrouillage (pour permettre aux clubs d'assumer un forfait au dernier échiquier si aucun joueur n'est disponible), mais joint un rapport complet d'infractions FRBE pour prévenir le directeur.

---

## Conséquences

### Positives
- **Protection totale de la base PostgreSQL** : impossible d'injecter des données corrompues ou des doublons de joueurs/échiquiers.
- **Transparence pour le directeur** : les erreurs ou warnings sont immédiatement visibles dans les réponses API.
- **Couverture de tests exhaustive** : 15 nouveaux tests unitaires (7 sur les schémas Zod, 8 sur les règles FRBE).
