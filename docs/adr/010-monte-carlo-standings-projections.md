# ADR-010 : Moteur de simulation Monte Carlo et projections de classement

## Statut
Accepté & Implémenté

## Contexte
Les capitaines et directeurs d'interclubs ont besoin d'anticiper la fin de saison :
- Qui est le favori pour le titre et la montée ?
- Quelles équipes ont mathématiquement assuré leur maintien (Top 8 en divisions nationales) ?
- Quels sont les risques réels de relégation pour les équipes en difficulté ?

Les règles officielles FRBE (R.O.I. Art. 37) s'appuient sur :
1. Les points de match (Victoire = 2, Nul = 1, Défaite = 0).
2. Le départage aux points d'échiquier individuels (*board points*).
3. Le calendrier officiel déterminé par la table de Berger (`PAIRINGS_12`, `PAIRINGS_10`, `PAIRINGS_6J`).

## Décision

1. **Moteur Monte Carlo haute performance (`src/domain/projections.ts`)** :
   - Exécution de 2 500 itérations stochastiques sur l'ensemble des rencontres restantes du calendrier.
   - Modélisation échiquier par échiquier basée sur la différence Elo des équipes ($\Delta Elo$) et la formule logistique FIDE standard, calibrée avec un taux de nulle réaliste (~28%).
   - Simulation fidèle au départage FRBE : cumul des points d'échiquier pour départager les égalités en points de match.
   - Temps d'exécution : ~15 ms pour une division complète (aucune latence perçue par l'utilisateur).

2. **Bornes mathématiques strictes (Garantie absolue)** :
   - Calcul des points minimum et maximum atteignables par chaque équipe ($\text{minMP} = \text{actuel}$, $\text{maxMP} = \text{actuel} + 2 \times \text{restants}$).
   - **Maintien assuré (`isGuaranteedTop8`)** : vérifié mathématiquement si le pire scénario possible maintient l'équipe au rang 8 ou mieux, même en perdant tous ses matchs restants.
   - **Titre assuré (`isGuaranteedChampion`)** : vérifié si aucune autre équipe ne peut mathématiquement égaler ou dépasser le score actuel du leader.

3. **Interface utilisateur intégrée (`StandingsTab.tsx` & `DivisionProjectionsView.tsx`)** :
   - Vue dédiée alternable avec le classement officiel (*Classement Officiel* / *Projections & Cotes*).
   - Badges d'état : 👑 Favori titre, 🛡️ Maintien assuré (100%), ⚠️ Grand danger, ❌ Relégation mathématique.
   - Micro-histogramme interactif visualisant la distribution probabiliste complète des 12 rangs avec info-bulles au survol.
   - Intégration sur les cartes récapitulatives de nos équipes.

## Conséquences
- Visibilité stratégique inédite pour les capitaines d'équipes et les joueurs du club.
- Aucune dépendance externe lourde : calcul 100% exécuté côté client dans le navigateur.
- Entièrement couvert par des tests unitaires et d'intégration validés sur des divisions réelles.
