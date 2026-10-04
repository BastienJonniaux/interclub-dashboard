---
name: chess-interclubs-tactical
description: Hybrid tactile, paper-editorial and high-density UI system engineered specifically for chess team pairings and tournament dashboards.
---

# Chess Tactical System (Belgian Interclubs)

## Design Philosophy
- **Anti-Crypto / Anti-Glow:** Strictly forbid dark-blue/purple glassmorphism, neon glows, cosmic gradients, and floating 3D transforms.
- **Tournament Sheet Feel:** Interfaces should look like a modern, crisp blend of high-end chess journalism (New In Chess) and official tournament scorecards (FRBE/FIDE).
- **Scan-First Density:** A club director must inspect 6 boards across 6 divisions without scrolling across massive paddings.

## Style Foundations
- **Color Palette (Light / Warm Tournament Paper):**
  - Background (canvas): `#F9F8F6` (warm off-white paper)
  - Surface cards: `#FFFFFF`
  - Borders: `#E2DFD8` (crisp 1px solid dividers, no heavy shadows)
  - Text primary: `#1A1918`
  - Text muted: `#6E6A64`
  - Accents:
    - Chessboard Green (success / ready): `#1E5E3A`
    - Clock Amber (warning / FRBE rule alert): `#B45309`
    - Flag Red (illegal lineup / burned player): `#B91C1C`
- **Color Palette (Dark Slate alternative):**
  - Background: `#141517`
  - Surfaces: `#1D1F23`
  - Borders: `#2D3036`
  - Text primary: `#F0EFF0`

## Typography Rules (Crucial Hybrid)
- **Display & Main Headers:** Elegant Serif (`Playfair Display`, `Garamond` or `Gelasio`) for club name, round titles, and trophy headers.
- **Body & Controls:** Crisp Sans-Serif (`Inter` or `Geist`) for player names, team tabs, buttons, and navigation.
- **Scores, Ratings & Board Numbers:** Strict Monospace (`JetBrains Mono`, `Roboto Mono` or tabular figures) applied **exclusively** to Elo values, board numbers, and match scores to ensure columns stay perfectly aligned.

## Component Layout Rules
- **Lineup Rows (Échiquiers):**
  - Must resemble an official match pairing line:
    `[N° Échiquier] [Badge Blanc/Noir] [Joueur Domicile + Elo] [vs] [Joueur Extérieur + Elo] [Statut]`
  - Compact padding: table rows between 36px and 44px height max.
- **Warnings & Alerts:**
  - Flat banner with 1px border and a distinct icon, never a glowing glassmorphism alert card.