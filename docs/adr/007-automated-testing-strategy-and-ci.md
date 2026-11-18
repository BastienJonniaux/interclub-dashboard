# ADR-007 : Stratégie de Tests Automatisés et Pipeline CI

- **Statut** : Accepté (Novembre 2026)
- **Périmètre** : `interclub-dashboard/src/domain/`, `server/src/middleware/`, `.github/workflows/ci.yml`

---

## Contexte

À mesure que l'application grandit, le risque de régressions critiques augmente sur deux pans majeurs du système :
1. **Les règles fédérales FRBE** (`frbeValidator.ts`) : des contraintes réglementaires strictes (interdiction de faire descendre un titulaire, limites Elo des réserves par division, plancher de 1800 Elo en Div 1, tolérance d'inversion des échiquiers selon le classement Elo, règle des moyennes croisées inter-équipes). Une erreur ou un bug de saisie non détecté expose le club à des forfaits officiels.
2. **La sécurité de l'API backend** (`auth.ts`) : le contrôle d'accès du directeur, la comparaison des clés en temps constant pour éviter les attaques temporelles, et le rejet strict des secrets dans l'URL.

Sans tests automatisés, chaque modification obligeait à retester manuellement l'intégralité du simulateur et des endpoints.

---

## Décision

Nous adoptons une stratégie de test pragmatique inspirée du modèle d'entreprise **Testing Trophy** :

### 1. Frontend : Vitest sur la logique métier pure (*Domain Logic*)
- **Choix de l'outil** : **Vitest** en tant que framework de test frontend.
- **Pourquoi Vitest plutôt que Jest ?**
  - Parfaite intégration avec le pipeline de build Vite déjà en place (partage de la même configuration TypeScript / ESM).
  - Vitesse d'exécution décuplée (temps d'exécution inférieur à 250 ms pour des dizaines de tests).
  - Zéro configuration complexe de transpileurs (Babel, `ts-jest`).
  - Dépendance de développement exclusive (`devDependencies`), impact nul sur le bundle de production (0 Ko).
- **Cible prioritaire des tests** :
  - `src/domain/rules/__tests__/frbeValidator.test.ts` : validation exhaustive des règles FRBE (cas nominaux, cas limites, exemptions).
  - `src/domain/__tests__/performance.test.ts` : vérification de l'inversion des résultats domicile/visiteur, forfaits (1-0 FF), et calcul des scores.

### 2. Backend : Test Runner natif de Node.js (`node:test`)
- **Choix de l'outil** : Module natif `node:test` combiné à `node:assert/strict` exécuté via `tsx --test`.
- **Pourquoi ?**
  - Zéro dépendance tierce à installer sur le serveur Express.
  - Résout les conflits de versions de `@types/node` entre Express 4 et les frameworks de test récents.
  - Exécution instantanée en mémoire.
- **Cible prioritaire des tests** :
  - `server/src/middleware/__tests__/auth.test.ts` : test unitaire de `safeCompareKeys` (constant-time), `extractProvidedKey` (rejet query strings), et les conditions de démarrage en production.

### 3. Automatisation CI : GitHub Actions
- Mise en place du workflow `.github/workflows/ci.yml`.
- Déclenché à chaque `push` et `pull_request` sur la branche `main`.
- Exécute en parallèle sur des machines virtuelles isolées :
  - L'installation des dépendances (`npm ci`).
  - La génération du client Prisma (`prisma generate`).
  - L'exécution des suites de tests unitaires (`npm run test`).
  - La compilation de production (`npm run build`).

---

## Conséquences

### Positives
- **Filet de sécurité immédiat** : tout refactoring ou ajout de fonctionnalité est validé en moins d'une seconde.
- **Règles métier documentées par les tests** : les tests servent de spécification vivante et lisible des règles FRBE.
- **Zéro dégradation de performance** : aucune surcharge de bundle ni de latence au runtime.
- **Standard professionnel** : workflow CI conforme aux exigences des équipes de développement en entreprise.

### Limites acceptées
- Pour l'instant, les composants React d'interface graphique (boutons, formulaires) ne sont pas couverts par des tests de rendu DOM (`@testing-library/react`), la priorité ayant été accordée à la logique métier pure à très haute valeur ajoutée.
