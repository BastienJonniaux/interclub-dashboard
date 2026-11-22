# ADR-013 : Génération et téléchargement direct de feuilles de match en PDF binaire (pdf-lib)

- **Statut** : Accepté & Implémenté
- **Périmètre** : `src/domain/pdf/matchSheetPdf.ts`, `src/components/simulator/MatchSheetModal.tsx`
- **Complète et étend** : [ADR-006](./006-native-print-portal-match-sheets.md)
- **Référence Architecture** : Section 4, Point 9 (`[RÉSOLU]`)

---

## Contexte

La génération initiale des feuilles de match reposait sur l'impression native du navigateur (`window.print()` et `@media print`), documentée dans l'ADR-006. Bien qu'efficace pour une impression immédiate sur papier, cette approche présentait plusieurs inconvénients majeurs en production :
1. **Dépendance critique aux réglages du navigateur** : selon les options sélectionnées par le capitaine dans la boîte de dialogue système (en-têtes/pieds de page Chromium imprimant l'URL, case "Graphiques d'arrière-plan" décochée, marges d'imprimante variables), la mise en page pouvait être altérée ou décalée.
2. **Absence de fichier PDF téléchargeable en un clic** : aucun fichier `.pdf` autonome n'était généré côté client. L'utilisateur devait obligatoirement ouvrir la boîte de dialogue d'impression, changer la destination en « Enregistrer au format PDF », puis valider le chemin de téléchargement.
3. **Impossibilité d'archivage ou d'envoi par e-mail direct** : les capitaines et directeurs ne pouvaient pas sauvegarder d'un coup l'ensemble des feuilles de match de toutes les équipes engagées pour les transmettre par messagerie.
4. **Nom du club codé en dur** : le pied de page affichait en dur la mention *"Echiquier Leuzois"* au lieu de s'adapter dynamiquement au club configuré.

L'ADR-006 (section 5.2 et 5.3) avait explicitement anticipé cette évolution comme étape future.

---

## Décision

1. **Adoption de la bibliothèque `pdf-lib`** :
   - Sélection de `pdf-lib` en tant que moteur de génération vectorielle de PDF.
   - Raisons du choix :
     - Bibliothèque pure JavaScript/TypeScript sans dépendance native ni canvas.
     - Isomorphe : exécutable à la fois dans le navigateur et sous Node.js (ce qui permet d'écrire des tests unitaires automatisés dans Vitest sans émulation DOM lourde).
     - Poids maîtrisé et intégration propre dans le bundle de production Vite.
2. **Utilisation des polices PDF standard (Helvetica / Helvetica-Bold)** :
   - Exploitation des polices intégrées à la spécification PDF 14 (`StandardFonts.Helvetica` et `StandardFonts.HelveticaBold`).
   - Avantage décisif : **0 KB de police embarquée** dans le binaire généré, vitesse de génération instantanée (< 50 ms pour un document multi-pages).
3. **Assainissement WinAnsi et préservation des accents français (`sanitizeText`)** :
   - Les polices standard utilisent l'encodage WinAnsi / Latin-1. Les caractères typographiques spéciaux hors Latin-1 (puces `•`, tirets longs `—`, guillemets courbes, espaces insécables) provoquent des exceptions d'encodage.
   - Création d'une fonction de filtrage pure `sanitizeText(text)` :
     - Remplacement des puces (`•`) et tirets cadratins (`—`, `–`) par des tirets standards `-`.
     - Remplacement des guillemets courbes par des guillemets simples/doubles standards.
     - Remplacement de `½` par `1/2`.
     - Préservation intégrale de tous les caractères accentués français (é, è, ê, à, â, ç, etc., parfaitement pris en charge par WinAnsi).
4. **Mise en page vectorielle A4 Paysage fidèle aux feuilles officielles FRBE** :
   - Dimensions A4 Paysage strictes : `841.89 x 595.28` points à 72 DPI.
   - En-tête officiel : Titre « FEUILLE DE MATCH OFFICIELLE », sous-titre bilingue officiel FRBE / KBSB.
   - Bloc métadonnées : Date, Lieu de la rencontre (avec adresse formatée du local ou de la salle adverse), Division, Ronde.
   - Double colonne d'alignement (largeur 388 pt chacune) :
     - Colonne gauche : Club Domicile (blancs aux échiquiers impairs).
     - Colonne droite : Club Visiteur (blancs aux échiquiers pairs).
     - Prise en charge dynamique de 4, 6 ou 8 échiquiers par équipe selon le niveau de division.
     - Remplissage automatique des joueurs alignés (Nom, Prénom, Matricule, cote Elo officielle FRBE/FIDE).
     - Lignes d'échiquiers vierges avec cases carrées réservées à l'inscription manuscrite des scores individuels.
   - Pied de page réglementaire :
     - Cadre « SCORE FINAL : [ _____ - _____ ] ».
     - Deux blocs de signatures distincts pour les capitaines d'équipes Domicile et Visiteur.
     - Ligne de traçabilité dynamique mentionnant la date de génération et le nom du club (`clubName || 'Interclubs FRBE'`).
5. **Double modalité d'export et téléchargement direct (`MatchSheetModal.tsx`)** :
   - **Téléchargement individuel** : bouton « Télécharger PDF (cette équipe) » générant une feuille isolée pour l'équipe sélectionnée.
   - **Téléchargement global** : bouton « Télécharger PDF (toutes) » générant un document multi-pages réunissant toutes les équipes du club pour la ronde en cours.
   - Téléchargement déclenché en un clic via `downloadPdfBlob` (`Blob` + `URL.createObjectURL`), sans jamais solliciter la boîte d'impression du navigateur.

---

## Conséquences

### Positives
- **Autonomie totale** : le rendu visuel est strictement garanti au pixel près, indépendant des marges, du zoom ou des réglages d'impression de l'OS.
- **Gain de temps pour les directeurs d'interclubs** : génération immédiate de fichiers PDF prêts pour diffusion par e-mail ou archivage numérique.
- **Compatibilité multi-clubs** : le nom du club organisateur est injecté dynamiquement dans toutes les métadonnées.
- **Couverture de tests automatisés** : le service est testé unitairement par Vitest (`matchSheetPdf.test.ts`), vérifiant l'intégrité binaire, les dimensions A4 et le décompte de pages.

### Négatives / Mitigations
- *Empreinte de bundle* : l'ajout de `pdf-lib` augmente la taille du bundle compilé d'environ 300 KB. Ce compromis reste optimal au vu de la valeur ajoutée et de l'absence de toute dépendance canvas lourde.
