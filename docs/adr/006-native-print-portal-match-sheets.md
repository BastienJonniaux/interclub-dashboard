# ADR-006 : Génération des Feuilles de Match via `@media print` et `createPortal`

- **Statut** : Accepté
- **Périmètre** : `interclub-dashboard/src/components/simulator/MatchSheetModal.tsx`, `src/index.css`

---

## Contexte

Le dimanche de match, le directeur ou les capitaines d'équipe doivent imprimer la feuille de match officielle pour chaque équipe engagée. Cette feuille doit respecter des contraintes précises :
- **Format A4 Paysage strict** : exactement 1 page par équipe (pas de saut de page intempestif ni de page blanche résiduelle).
- **Pré-remplissage complet de notre équipe** : échiquiers, noms et prénoms, matricules FRBE et cotes Elo officielles calculées.
- **Espaces prévus pour l'adversaire** : lignes vierges pour renseigner la composition adverse, les résultats par échiquier et le score final.
- **Informations de rencontre & salle** : date, ronde, division, et adresse de la salle de jeu (avec choix interactif de la salle lorsque le club dispose de plusieurs locaux).
- **Blocs administratifs épurés** : suppression des sections superflues pour les divisions 3 à 6 (pas d'arbitre fédéral ni de case contrôle de licences `C*`), signature des capitaines et personnalisation du club (*"Echiquier Leuzois"*).

Deux approches étaient envisageables :
1. Intégrer une librairie de génération PDF binaire (`jsPDF`, `pdfmake`, `@react-pdf/renderer`).
2. Utiliser le moteur de rendu HTML/CSS natif du navigateur via `@media print` et `window.print()`.

---

## Décision

- **Moteur d'impression natif du navigateur** : rendu direct en HTML/CSS, déclenché via `window.print()`.
- **Isolation du flux d'impression via `ReactDOM.createPortal`** :
  - Le conteneur d'impression (`#printable-match-sheets`) est téléporté directement sous `document.body` hors de l'arborescence DOM du modal.
  - En mode écran (`@media screen`), le conteneur est masqué par `display: none !important`.
  - En mode impression (`@media print`), tous les autres éléments du DOM sont masqués (`body > *:not(#printable-match-sheets) { display: none !important; }`), éliminant tout effet de superposition ou de transparence parasite.
- **Maîtrise de la pagination A4 Paysage** :
  - `@page { size: A4 landscape; margin: 8mm; }`.
  - Remplacement de la règle classique `page-break-after: always` par le sélecteur d'adjacence `.match-sheet-page + .match-sheet-page { break-before: page !important; }`, ce qui supprime définitivement la page blanche finale générée par Chromium.
  - Surcharge de `html, body` en `min-height: 0 !important; height: auto !important;` pour neutraliser la classe Tailwind `min-h-screen` appliquée sur le `body`.
- **Prévisualisation interactive par onglets** : le modal écran permet de feuilleter les équipes une par une, de choisir la salle de jeu via un menu déroulant, et de choisir entre imprimer une seule feuille ou toutes les feuilles en un clic.

---

## Conséquences

### Positives
- **Poids de bundle nul (0 KB ajouté)** : aucune lourde dépendance externe (`pdfmake` pèse ~400 KB, `@react-pdf/renderer` dépasse 800 KB).
- **Rendu vectoriel parfait** : polices nettes, traits de tableau précis et fidélité typographique assurée par le moteur de rendu natif du navigateur.
- **Maintenance et itérations rapides** : la mise en page se modifie directement en HTML/Tailwind classique sans devoir apprendre l'API d'un moteur PDF tiers.

### Négatives
- **Dépendance aux options d'impression du navigateur** : l'utilisateur peut avoir activé par mégarde les en-têtes/pieds de page Chrome (imprimant l'URL et la date) ou désactivé l'option "Graphiques d'arrière-plan".
- **Pas de fichier `.pdf` généré programmatiquement** : impossible de générer un fichier PDF en pièce jointe d'un e-mail automatique sans intervention manuelle de l'utilisateur (qui doit choisir "Enregistrer au format PDF" dans la boîte de dialogue système).

---

## Analyse Critique & Améliorations Possibles

1. **Suppression des en-têtes et pieds de page par défaut du navigateur** :
   - *Critique* : Selon les navigateurs, l'URL de la page ou l'heure d'impression peut s'imprimer dans la marge si l'utilisateur ne décoche pas l'option.
   - *Amélioration* : La directive CSS `@page { margin: 8mm; }` minimise ce problème sur Chrome/Edge récents. L'ajout d'une notice explicative dans l'en-tête du modal (*"Astuce : décochez 'En-têtes et pieds de page' dans la boîte d'impression"*) garantit un rendu professionnel sur tous les navigateurs.
2. **Besoin futur d'export direct en fichier `.pdf` pour l'envoi par e-mail** :
   - *Critique* : Si le club souhaite un jour envoyer automatiquement les feuilles de match par e-mail aux capitaines sans passer par la boîte de dialogue d'impression, l'approche `window.print()` est insuffisante.
   - *Amélioration* : Si ce besoin apparaît, utiliser `html2canvas` + `jspdf` ou `@react-pdf/renderer` chargé **en import dynamique lazy** (`await import(...)`) sur le clic d'un bouton dédié "Télécharger PDF", afin de ne pas pénaliser le temps de chargement initial des autres utilisateurs.
3. **Harmonisation des logos et en-têtes de club** :
   - *Critique* : Le bas de page porte en dur la mention *"Feuille de match officielle • Echiquier Leuzois"*. Si un autre club utilise l'application, cette mention reste associée à Leuze.
   - *Amélioration* : Dynamiser le libellé avec le nom du club issu de `ClubContext` (`clubName || 'Interclubs FRBE'`).
