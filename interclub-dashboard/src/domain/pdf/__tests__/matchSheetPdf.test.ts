import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  generateSingleMatchSheetPdf,
  generateAllMatchSheetsPdf,
  sanitizeText,
  MatchSheetPdfData,
  MatchSheetPdfOptions,
} from '../matchSheetPdf';

describe('Match Sheet PDF Generation (pdf-lib)', () => {
  const dummySheet1: MatchSheetPdfData = {
    teamNumber: 1,
    teamName: 'Leuze 1',
    divisionLabel: 'Division 3C',
    divisionNumber: 3,
    boardCount: 6,
    isHome: true,
    opponentTeamName: 'Namur 2',
    opponentClubId: 901,
    venueAddressFormatted: 'Rue du Moulin 12, 7900 Leuze',
    boards: [
      { boardNumber: 1, player: { idnumber: 12345, first_name: 'Frédéric', last_name: 'Dupont', assignedrating: 2050 } },
      { boardNumber: 2, player: { idnumber: 23456, first_name: 'Benoît', last_name: 'Lambert', fiderating: 1980 } },
      { boardNumber: 3, player: null },
      { boardNumber: 4, player: null },
      { boardNumber: 5, player: null },
      { boardNumber: 6, player: null },
    ],
  };

  const dummySheet2: MatchSheetPdfData = {
    teamNumber: 2,
    teamName: 'Leuze 2',
    divisionLabel: 'Division 4A',
    divisionNumber: 4,
    boardCount: 4,
    isHome: false,
    opponentTeamName: 'Tournai 1',
    opponentClubId: 401,
    venueAddressFormatted: 'Place de Lille 5, 7500 Tournai',
    boards: [
      { boardNumber: 1, player: { idnumber: 34567, first_name: 'Jean', last_name: 'Martin', assignedrating: 1750 } },
      { boardNumber: 2, player: null },
      { boardNumber: 3, player: null },
      { boardNumber: 4, player: null },
    ],
  };

  const options: MatchSheetPdfOptions = {
    clubId: 541,
    clubName: 'Echiquier Leuzois',
    roundNumber: 3,
    roundDateFormatted: '15/11/2026',
  };

  it('sanitizes special characters without corrupting French WinAnsi accents', () => {
    expect(sanitizeText('Feuille • ronde 1 — test')).toBe('Feuille - ronde 1 - test');
    expect(sanitizeText('Hélène & Benoît à Bruxelles')).toBe('Hélène & Benoît à Bruxelles');
    expect(sanitizeText('Cité des Géants : Ath – Tournai')).toBe('Cité des Géants : Ath - Tournai');
    expect(sanitizeText('Echiquier ½ point')).toBe('Echiquier 1/2 point');
  });

  it('generates a valid single-page PDF binary for one team', async () => {
    const bytes = await generateSingleMatchSheetPdf(dummySheet1, options);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF-1."
    const header = String.fromCharCode(...bytes.slice(0, 7));
    expect(header).toMatch(/^%PDF-1\./);

    // Reload with pdf-lib to verify page count and dimensions
    const pdfDoc = await PDFDocument.load(bytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    expect(Math.round(width)).toBe(842); // A4 Landscape width
    expect(Math.round(height)).toBe(595); // A4 Landscape height
  });

  it('generates a valid multi-page PDF document for multiple teams', async () => {
    const bytes = await generateAllMatchSheetsPdf([dummySheet1, dummySheet2], options);
    expect(bytes).toBeInstanceOf(Uint8Array);

    const pdfDoc = await PDFDocument.load(bytes);
    expect(pdfDoc.getPageCount()).toBe(2);

    const page1 = pdfDoc.getPage(0);
    const page2 = pdfDoc.getPage(1);
    expect(Math.round(page1.getSize().width)).toBe(842);
    expect(Math.round(page2.getSize().width)).toBe(842);
  });
});
