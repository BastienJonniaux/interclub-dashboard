import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface MatchSheetPlayer {
  idnumber: number;
  first_name: string;
  last_name: string;
  assignedrating?: number;
  fiderating?: number;
}

export interface MatchSheetBoard {
  boardNumber: number;
  player?: MatchSheetPlayer | null;
}

export interface MatchSheetPdfData {
  teamNumber: number;
  teamName: string;
  divisionLabel: string;
  divisionNumber: number;
  boardCount: number;
  isHome: boolean;
  opponentTeamName: string;
  opponentClubId?: number;
  venueAddressFormatted: string;
  boards: MatchSheetBoard[];
}

export interface MatchSheetPdfOptions {
  clubId: number;
  clubName: string;
  roundNumber: number;
  roundDateFormatted: string;
}

/**
 * Sanitizes text to be strictly encodable in standard PDF WinAnsi / Latin-1 font encodings.
 * Replaces bullets, smart quotes, em-dashes, and special symbols while preserving standard French accents.
 */
export function sanitizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u2022\u2219]/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\u00BD/g, '1/2')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

/**
 * Helper to truncate text to fit a max visual width based on character estimate
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 3) + '...';
}

/**
 * Draws a single match sheet onto an A4 Landscape page (841.89 x 595.28 points)
 */
export async function drawMatchSheetPage(
  pdfDoc: PDFDocument,
  sheet: MatchSheetPdfData,
  options: MatchSheetPdfOptions
): Promise<void> {
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 Landscape dimensions
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const marginX = 25;
  const contentWidth = pageWidth - marginX * 2; // ~791.89

  const colorBlack = rgb(0.08, 0.08, 0.08);
  const colorMuted = rgb(0.38, 0.42, 0.46);
  const colorBorder = rgb(0.12, 0.12, 0.12);
  const colorLightBorder = rgb(0.72, 0.75, 0.78);
  const bgHeader = rgb(0.94, 0.95, 0.97);
  const bgSubheader = rgb(0.97, 0.98, 0.99);

  // 1. TOP HEADER BANNER (y: 575 -> 535)
  const headerTop = 575;
  const subHeaderTitle = sanitizeText(
    'FEDERATION ROYALE BELGE DES ECHECS - KONINKLIJKE BELGISCHE SCHAAKBOND'
  );
  const subWidth = fontBold.widthOfTextAtSize(subHeaderTitle, 8);
  page.drawText(subHeaderTitle, {
    x: (pageWidth - subWidth) / 2,
    y: headerTop,
    size: 8,
    font: fontBold,
    color: colorMuted,
  });

  const mainTitle = sanitizeText('FEUILLE DE MATCH OFFICIELLE');
  const mainWidth = fontBold.widthOfTextAtSize(mainTitle, 15);
  page.drawText(mainTitle, {
    x: (pageWidth - mainWidth) / 2,
    y: headerTop - 18,
    size: 15,
    font: fontBold,
    color: colorBlack,
  });

  // 2. METADATA ROW (y: 542 -> 507, height 35)
  const metaY = 507;
  const metaHeight = 35;
  page.drawRectangle({
    x: marginX,
    y: metaY,
    width: contentWidth,
    height: metaHeight,
    borderWidth: 1.5,
    borderColor: colorBorder,
    color: rgb(1, 1, 1),
  });

  const colDateWidth = 150;
  const colDivisionWidth = 130;
  const colRoundWidth = 110;
  const colVenueWidth = contentWidth - (colDateWidth + colDivisionWidth + colRoundWidth);

  // Column 1: Date
  page.drawText('DATE', { x: marginX + 8, y: metaY + 22, size: 7.5, font: fontRegular, color: colorMuted });
  page.drawText(sanitizeText(options.roundDateFormatted), {
    x: marginX + 8,
    y: metaY + 8,
    size: 10,
    font: fontBold,
    color: colorBlack,
  });
  page.drawLine({
    start: { x: marginX + colDateWidth, y: metaY },
    end: { x: marginX + colDateWidth, y: metaY + metaHeight },
    thickness: 1,
    color: colorBorder,
  });

  // Column 2: Venue
  const venueX = marginX + colDateWidth;
  page.drawText('LIEU DE LA RENCONTRE', { x: venueX + 8, y: metaY + 22, size: 7.5, font: fontRegular, color: colorMuted });
  const venueSanitized = truncateText(sanitizeText(sheet.venueAddressFormatted), 68);
  page.drawText(venueSanitized, {
    x: venueX + 8,
    y: metaY + 8,
    size: 9.5,
    font: fontBold,
    color: colorBlack,
  });
  page.drawLine({
    start: { x: venueX + colVenueWidth, y: metaY },
    end: { x: venueX + colVenueWidth, y: metaY + metaHeight },
    thickness: 1,
    color: colorBorder,
  });

  // Column 3: Division
  const divX = venueX + colVenueWidth;
  page.drawText('DIVISION', { x: divX + 8, y: metaY + 22, size: 7.5, font: fontRegular, color: colorMuted });
  page.drawText(sanitizeText(sheet.divisionLabel), {
    x: divX + 8,
    y: metaY + 8,
    size: 10,
    font: fontBold,
    color: colorBlack,
  });
  page.drawLine({
    start: { x: divX + colDivisionWidth, y: metaY },
    end: { x: divX + colDivisionWidth, y: metaY + metaHeight },
    thickness: 1,
    color: colorBorder,
  });

  // Column 4: Ronde
  const roundX = divX + colDivisionWidth;
  page.drawText('RONDE', { x: roundX + 8, y: metaY + 22, size: 7.5, font: fontRegular, color: colorMuted });
  page.drawText(`Ronde ${options.roundNumber}`, {
    x: roundX + 8,
    y: metaY + 8,
    size: 10,
    font: fontBold,
    color: colorBlack,
  });

  // 3. MAIN TWO-COLUMN ROSTER (Domicile vs Visiteur)
  // Dimensions
  const gap = 15;
  const colWidth = (contentWidth - gap) / 2; // ~388
  const rosterTop = metaY - 12; // ~495
  const rosterHeight = 350;
  const rosterBottom = rosterTop - rosterHeight; // ~145

  // Team names & matricules
  const homeClubName = sheet.isHome ? sheet.teamName : sheet.opponentTeamName;
  const homeClubMatricule = sheet.isHome ? options.clubId.toString() : (sheet.opponentClubId?.toString() || 'Adverse');
  const awayClubName = sheet.isHome ? sheet.opponentTeamName : sheet.teamName;
  const awayClubMatricule = sheet.isHome ? (sheet.opponentClubId?.toString() || 'Adverse') : options.clubId.toString();

  const drawTeamColumn = (
    startX: number,
    isHomeCol: boolean,
    teamLabel: string,
    teamName: string,
    matricule: string
  ) => {
    // Outer box
    page.drawRectangle({
      x: startX,
      y: rosterBottom,
      width: colWidth,
      height: rosterHeight,
      borderWidth: 1.5,
      borderColor: colorBorder,
      color: rgb(1, 1, 1),
    });

    // Column Header Box (height 38)
    const headerH = 38;
    const colHeaderY = rosterTop - headerH;
    page.drawRectangle({
      x: startX,
      y: colHeaderY,
      width: colWidth,
      height: headerH,
      color: bgHeader,
      borderWidth: 1.5,
      borderColor: colorBorder,
    });

    page.drawText(teamLabel.toUpperCase(), {
      x: startX + 8,
      y: colHeaderY + 24,
      size: 7.5,
      font: fontBold,
      color: colorMuted,
    });

    const teamTitle = `${truncateText(sanitizeText(teamName), 28)} (Matr. ${sanitizeText(matricule)})`;
    page.drawText(teamTitle, {
      x: startX + 8,
      y: colHeaderY + 8,
      size: 10.5,
      font: fontBold,
      color: colorBlack,
    });

    // Score input block in header
    const scoreBoxW = 75;
    const scoreBoxH = 22;
    page.drawRectangle({
      x: startX + colWidth - scoreBoxW - 8,
      y: colHeaderY + 8,
      width: scoreBoxW,
      height: scoreBoxH,
      borderWidth: 1,
      borderColor: colorBorder,
      color: rgb(1, 1, 1),
    });
    page.drawText('Score : ____', {
      x: startX + colWidth - scoreBoxW - 2,
      y: colHeaderY + 14,
      size: 8.5,
      font: fontBold,
      color: colorBlack,
    });

    // Table Column Headers (height 18)
    const tableHeaderY = colHeaderY - 18;
    page.drawRectangle({
      x: startX,
      y: tableHeaderY,
      width: colWidth,
      height: 18,
      color: bgSubheader,
      borderWidth: 1,
      borderColor: colorBorder,
    });

    // Sub-columns: Ech (28) | C. (24) | Nom et Prenom (180) | Matricule (55) | Elo (45) | R. (remainder ~56)
    const wEch = 28;
    const wCol = 24;
    const wNom = 180;
    const wMatr = 55;
    const wElo = 45;
    const wRes = colWidth - (wEch + wCol + wNom + wMatr + wElo);

    let curX = startX;
    page.drawText('Ech.', { x: curX + 5, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });
    curX += wEch;
    page.drawLine({ start: { x: curX, y: tableHeaderY }, end: { x: curX, y: tableHeaderY + 18 }, thickness: 0.8, color: colorLightBorder });

    page.drawText('C.', { x: curX + 7, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });
    curX += wCol;
    page.drawLine({ start: { x: curX, y: tableHeaderY }, end: { x: curX, y: tableHeaderY + 18 }, thickness: 0.8, color: colorLightBorder });

    page.drawText('Nom et Prenom', { x: curX + 8, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });
    curX += wNom;
    page.drawLine({ start: { x: curX, y: tableHeaderY }, end: { x: curX, y: tableHeaderY + 18 }, thickness: 0.8, color: colorLightBorder });

    page.drawText('Matricule', { x: curX + 6, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });
    curX += wMatr;
    page.drawLine({ start: { x: curX, y: tableHeaderY }, end: { x: curX, y: tableHeaderY + 18 }, thickness: 0.8, color: colorLightBorder });

    page.drawText('Elo', { x: curX + 12, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });
    curX += wElo;
    page.drawLine({ start: { x: curX, y: tableHeaderY }, end: { x: curX, y: tableHeaderY + 18 }, thickness: 0.8, color: colorLightBorder });

    page.drawText('R.', { x: curX + 20, y: tableHeaderY + 5, size: 7.5, font: fontBold, color: colorMuted });

    // Board rows:
    const boardCount = sheet.boardCount;
    const availableHeightForBoards = tableHeaderY - rosterBottom;
    const rowHeight = availableHeightForBoards / boardCount;

    for (let b = 1; b <= boardCount; b++) {
      const rowY = tableHeaderY - b * rowHeight;
      const boardItem = sheet.boards.find((item) => item.boardNumber === b);
      const isOurTeamInThisCol = isHomeCol ? sheet.isHome : !sheet.isHome;
      const player = isOurTeamInThisCol ? boardItem?.player : null;

      // Color piece:
      // Home column: odd boards = White ('B'), even boards = Black ('N')
      // Visiteur column: odd boards = Black ('N'), even boards = White ('B')
      const isWhite = isHomeCol ? b % 2 !== 0 : b % 2 === 0;
      const colorChar = isWhite ? 'B' : 'N';

      // Row divider
      if (b > 1) {
        page.drawLine({
          start: { x: startX, y: rowY + rowHeight },
          end: { x: startX + colWidth, y: rowY + rowHeight },
          thickness: 0.8,
          color: colorLightBorder,
        });
      }

      // Vertical column lines in row
      let rowColX = startX;
      // Ech.
      page.drawText(`${b}`, {
        x: rowColX + 10,
        y: rowY + rowHeight / 2 - 3,
        size: 9.5,
        font: fontBold,
        color: colorBlack,
      });
      rowColX += wEch;
      page.drawLine({ start: { x: rowColX, y: rowY }, end: { x: rowColX, y: rowY + rowHeight }, thickness: 0.8, color: colorLightBorder });

      // Color
      page.drawText(colorChar, {
        x: rowColX + 8,
        y: rowY + rowHeight / 2 - 3,
        size: 9.5,
        font: fontBold,
        color: colorBlack,
      });
      rowColX += wCol;
      page.drawLine({ start: { x: rowColX, y: rowY }, end: { x: rowColX, y: rowY + rowHeight }, thickness: 0.8, color: colorLightBorder });

      // Player Name
      if (player) {
        const fullName = sanitizeText(`${player.last_name} ${player.first_name}`.trim());
        page.drawText(truncateText(fullName, 30), {
          x: rowColX + 6,
          y: rowY + rowHeight / 2 - 3,
          size: 9,
          font: fontBold,
          color: colorBlack,
        });
      } else {
        // Dotted line for handwriting
        page.drawText('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', {
          x: rowColX + 4,
          y: rowY + rowHeight / 2 - 4,
          size: 7,
          font: fontRegular,
          color: colorLightBorder,
        });
      }
      rowColX += wNom;
      page.drawLine({ start: { x: rowColX, y: rowY }, end: { x: rowColX, y: rowY + rowHeight }, thickness: 0.8, color: colorLightBorder });

      // Matricule
      if (player && player.idnumber) {
        page.drawText(`${player.idnumber}`, {
          x: rowColX + 8,
          y: rowY + rowHeight / 2 - 3,
          size: 9,
          font: fontRegular,
          color: colorBlack,
        });
      }
      rowColX += wMatr;
      page.drawLine({ start: { x: rowColX, y: rowY }, end: { x: rowColX, y: rowY + rowHeight }, thickness: 0.8, color: colorLightBorder });

      // Elo
      const eloVal = player ? (player.assignedrating || player.fiderating || 0) : 0;
      if (eloVal > 0) {
        page.drawText(`${eloVal}`, {
          x: rowColX + 8,
          y: rowY + rowHeight / 2 - 3,
          size: 9,
          font: fontBold,
          color: colorBlack,
        });
      }
      rowColX += wElo;
      page.drawLine({ start: { x: rowColX, y: rowY }, end: { x: rowColX, y: rowY + rowHeight }, thickness: 0.8, color: colorLightBorder });

      // Result square box
      const boxW = 22;
      const boxH = 16;
      page.drawRectangle({
        x: rowColX + (wRes - boxW) / 2,
        y: rowY + (rowHeight - boxH) / 2,
        width: boxW,
        height: boxH,
        borderWidth: 0.8,
        borderColor: colorLightBorder,
        color: rgb(1, 1, 1),
      });
    }
  };

  // Draw Left Column (Club Domicile)
  drawTeamColumn(marginX, true, 'Club Domicile (Blancs aux echiquiers impairs)', homeClubName, homeClubMatricule);

  // Draw Right Column (Club Visiteur)
  drawTeamColumn(marginX + colWidth + gap, false, 'Club Visiteur (Blancs aux echiquiers pairs)', awayClubName, awayClubMatricule);

  // 4. FOOTER SECTION (y: 135 -> 25)
  const scoreFinalY = rosterBottom - 26; // ~119
  page.drawRectangle({
    x: marginX,
    y: scoreFinalY,
    width: contentWidth,
    height: 22,
    borderWidth: 1.5,
    borderColor: colorBorder,
    color: bgHeader,
  });

  const scoreFinalText = 'SCORE FINAL : [  _____  -  _____  ]';
  const sfWidth = fontBold.widthOfTextAtSize(scoreFinalText, 10.5);
  page.drawText(scoreFinalText, {
    x: (pageWidth - sfWidth) / 2,
    y: scoreFinalY + 6,
    size: 10.5,
    font: fontBold,
    color: colorBlack,
  });

  // Captain Signatures Box (y: 90 -> 45, height 45)
  const sigY = scoreFinalY - 48; // ~71
  const sigHeight = 44;
  page.drawRectangle({
    x: marginX,
    y: sigY,
    width: contentWidth,
    height: sigHeight,
    borderWidth: 1.5,
    borderColor: colorBorder,
    color: rgb(1, 1, 1),
  });

  // Vertical divider between captains
  page.drawLine({
    start: { x: marginX + contentWidth / 2, y: sigY },
    end: { x: marginX + contentWidth / 2, y: sigY + sigHeight },
    thickness: 1,
    color: colorBorder,
  });

  // Home Captain
  page.drawText('CAPITAINE EQUIPE DOMICILE', {
    x: marginX + 10,
    y: sigY + 30,
    size: 7.5,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText('Nom : _________________________   Signature : ___________________', {
    x: marginX + 10,
    y: sigY + 12,
    size: 8.5,
    font: fontRegular,
    color: colorBlack,
  });

  // Away Captain
  const awaySigX = marginX + contentWidth / 2 + 10;
  page.drawText('CAPITAINE EQUIPE VISITEUSE', {
    x: awaySigX,
    y: sigY + 30,
    size: 7.5,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText('Nom : _________________________   Signature : ___________________', {
    x: awaySigX,
    y: sigY + 12,
    size: 8.5,
    font: fontRegular,
    color: colorBlack,
  });

  // Bottom Metadata Bar (y: 15)
  const todayFormatted = new Intl.DateTimeFormat('fr-BE').format(new Date());
  const metaLeft = sanitizeText(`Interclubs Nationaux FRBE - Edition officielle generee le ${todayFormatted}`);
  const metaRight = sanitizeText(`Feuille de match officielle - ${options.clubName || 'Interclubs FRBE'}`);

  page.drawText(metaLeft, {
    x: marginX,
    y: 15,
    size: 7,
    font: fontRegular,
    color: colorMuted,
  });

  const rightWidth = fontRegular.widthOfTextAtSize(metaRight, 7);
  page.drawText(metaRight, {
    x: marginX + contentWidth - rightWidth,
    y: 15,
    size: 7,
    font: fontRegular,
    color: colorMuted,
  });
}

/**
 * Generates a standalone single-team PDF match sheet binary
 */
export async function generateSingleMatchSheetPdf(
  sheet: MatchSheetPdfData,
  options: MatchSheetPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  await drawMatchSheetPage(pdfDoc, sheet, options);
  return pdfDoc.save();
}

/**
 * Generates a multi-page PDF document containing match sheets for all teams
 */
export async function generateAllMatchSheetsPdf(
  sheets: MatchSheetPdfData[],
  options: MatchSheetPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (const sheet of sheets) {
    await drawMatchSheetPage(pdfDoc, sheet, options);
  }
  return pdfDoc.save();
}

/**
 * Triggers a direct browser download of the generated PDF binary
 */
export function downloadPdfBlob(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
