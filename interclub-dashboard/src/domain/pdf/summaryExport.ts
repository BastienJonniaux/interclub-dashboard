import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { sanitizeText } from './matchSheetPdf';

export interface SummaryBoardData {
  board: number;
  playerName: string | null;
  playerRating: number | null;
}

export interface SummaryTeamData {
  teamNumber: number;
  teamName: string;
  divisionLabel: string;
  isHome?: boolean;
  opponentTeamName?: string;
  opponentAverageElo?: number;
  ourAverageElo: number | null;
  boardCount: number;
  boards: SummaryBoardData[];
}

export interface SummaryExportOptions {
  clubName: string;
  roundNumber: number;
  roundDateFormatted?: string;
  teams: SummaryTeamData[];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncateToFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Renders a crisp, high-DPI (2x) PNG Canvas summarizing all team compositions,
 * missing boards, and average Elo comparisons — ready for SMS/WhatsApp sharing.
 */
export function renderSummaryToCanvas(options: SummaryExportOptions): HTMLCanvasElement {
  const { clubName, roundNumber, roundDateFormatted, teams } = options;

  const scale = 2;
  const cols = teams.length <= 1 ? 1 : 2;
  const paddingX = 28;
  const paddingTop = 28;
  const paddingBottom = 24;
  const colGap = 20;
  const rowGap = 20;
  const cardWidth = cols === 1 ? 520 : 420;
  const logicalWidth = paddingX * 2 + cols * cardWidth + (cols - 1) * colGap;

  const headerHeight = 76;
  const cardHeaderHeight = 76;
  const boardRowHeight = 28;
  const cardPaddingBottom = 16;

  // Group teams into rows so each row height adapts to the tallest team in that row
  const rows: SummaryTeamData[][] = [];
  for (let i = 0; i < teams.length; i += cols) {
    rows.push(teams.slice(i, i + cols));
  }

  const rowHeights = rows.map((row) => {
    const maxBoards = Math.max(...row.map((t) => t.boardCount), 4);
    return cardHeaderHeight + maxBoards * boardRowHeight + cardPaddingBottom;
  });

  const totalCardsHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rows.length - 1) * rowGap;
  const footerHeight = 32;
  const logicalHeight = paddingTop + headerHeight + totalCardsHeight + footerHeight + paddingBottom;

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Header Banner
  const totalAssigned = teams.reduce(
    (sum, t) => sum + t.boards.filter((b) => b.playerName !== null).length,
    0
  );
  const totalBoards = teams.reduce((sum, t) => sum + t.boardCount, 0);
  const missingTotal = totalBoards - totalAssigned;

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`${clubName} — Compositions Ronde ${roundNumber}`, paddingX, paddingTop + 24);

  ctx.fillStyle = '#475569';
  ctx.font = '500 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const subText = roundDateFormatted ? `${roundDateFormatted}  •  ` : '';
  ctx.fillText(
    `${subText}${teams.length} équipe${teams.length > 1 ? 's' : ''}  •  ${totalAssigned}/${totalBoards} échiquiers assignés`,
    paddingX,
    paddingTop + 48
  );

  // Global status pill on top right
  const statusLabel =
    missingTotal === 0
      ? 'COMPLET'
      : `${missingTotal} ÉCHIQUIER${missingTotal > 1 ? 'S' : ''} MANQUANT${missingTotal > 1 ? 'S' : ''}`;
  ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const pillW = ctx.measureText(statusLabel).width + 24;
  const pillX = logicalWidth - paddingX - pillW;
  const pillY = paddingTop + 12;
  drawRoundedRect(ctx, pillX, pillY, pillW, 26, 13);
  ctx.fillStyle = missingTotal === 0 ? '#dcfce7' : '#fef2f2';
  ctx.fill();
  ctx.strokeStyle = missingTotal === 0 ? '#86efac' : '#fecaca';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = missingTotal === 0 ? '#166534' : '#b91c1c';
  ctx.fillText(statusLabel, pillX + 12, pillY + 17);

  // Draw Rows & Cards
  let currentY = paddingTop + headerHeight;

  rows.forEach((row, rIdx) => {
    const rHeight = rowHeights[rIdx];

    row.forEach((team, cIdx) => {
      const cardX = paddingX + cIdx * (cardWidth + colGap);
      const cardY = currentY;
      const missingInTeam = team.boardCount - team.boards.filter((b) => b.playerName !== null).length;

      // Card shadow & container
      drawRoundedRect(ctx, cardX, cardY, cardWidth, rHeight, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = missingInTeam > 0 ? '#fca5a5' : '#cbd5e1';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Card Top Bar
      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardWidth, 38, 12);
      ctx.clip();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cardX, cardY, cardWidth, 38);
      ctx.restore();
      // Square off bottom corners of top bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cardX, cardY + 26, cardWidth, 12);

      // Team title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`Équipe ${team.teamNumber} (${team.divisionLabel})`, cardX + 14, cardY + 24);

      // Venue & Missing badge inside top bar
      const venueStr = team.isHome === undefined ? '' : team.isHome ? 'Domicile' : 'Extérieur';
      const rightHeaderStr =
        missingInTeam > 0
          ? `${missingInTeam} manquant${missingInTeam > 1 ? 's' : ''}`
          : venueStr;

      if (rightHeaderStr) {
        ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const tagW = ctx.measureText(rightHeaderStr).width + 16;
        const tagX = cardX + cardWidth - 12 - tagW;
        drawRoundedRect(ctx, tagX, cardY + 9, tagW, 20, 6);
        ctx.fillStyle = missingInTeam > 0 ? '#ef4444' : '#334155';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(rightHeaderStr, tagX + 8, cardY + 23);
      }

      // Matchup / Average Elo Subheader
      const subY = cardY + 38;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(cardX + 1, subY, cardWidth - 2, 30);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 1, subY + 30);
      ctx.lineTo(cardX + cardWidth - 1, subY + 30);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = '600 11.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const oppLabel = team.opponentTeamName ? `vs ${team.opponentTeamName}` : 'Adversaire NC';
      ctx.fillText(truncateToFit(ctx, oppLabel, cardWidth * 0.48), cardX + 14, subY + 19);

      // Averages on right of subheader
      const ourAvgStr = team.ourAverageElo ? `${team.ourAverageElo}` : 'NC';
      const oppAvgStr = team.opponentAverageElo ? `${team.opponentAverageElo}` : 'NC';
      const avgText = `Moy: ${ourAvgStr} vs ${oppAvgStr} Elo`;
      ctx.font = 'bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      const avgW = ctx.measureText(avgText).width;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(avgText, cardX + cardWidth - 14 - avgW, subY + 19);

      // Boards List
      let bY = subY + 38;
      team.boards.forEach((b, bIdx) => {
        const isMissing = !b.playerName;
        const rowX = cardX + 10;
        const rowW = cardWidth - 20;
        const rowH = boardRowHeight - 4;

        if (isMissing) {
          drawRoundedRect(ctx, rowX, bY, rowW, rowH, 6);
          ctx.fillStyle = '#fef2f2';
          ctx.fill();
          ctx.strokeStyle = '#fecaca';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (bIdx % 2 === 1) {
          drawRoundedRect(ctx, rowX, bY, rowW, rowH, 6);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
        }

        // Board number
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = isMissing ? '#dc2626' : '#64748b';
        ctx.fillText(`#${b.board}`, rowX + 8, bY + 16);

        // Player name or Missing label
        ctx.font = isMissing
          ? 'italic 600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          : '600 12.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = isMissing ? '#b91c1c' : '#0f172a';
        const displayName = isMissing ? 'Échiquier manquant' : truncateToFit(ctx, b.playerName!, rowW - 95);
        ctx.fillText(displayName, rowX + 36, bY + 16);

        // Rating
        if (!isMissing) {
          const eloStr = b.playerRating ? `${b.playerRating}` : 'NC';
          ctx.font = 'bold 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = '#334155';
          const eloW = ctx.measureText(eloStr).width;
          ctx.fillText(eloStr, rowX + rowW - 8 - eloW, bY + 16);
        } else {
          const missTag = 'LIBRE';
          ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = '#dc2626';
          const tagW = ctx.measureText(missTag).width;
          ctx.fillText(missTag, rowX + rowW - 8 - tagW, bY + 16);
        }

        bY += boardRowHeight;
      });
    });

    currentY += rHeight + rowGap;
  });

  // Footer watermark
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Généré via Interclub Dashboard', paddingX, logicalHeight - 12);

  return canvas;
}

export function downloadPngFromCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generates a compact 1-page A4 Portrait PDF summary of all teams,
 * missing boards, and average Elo comparisons.
 */
export async function generateSummaryPdf(options: SummaryExportOptions): Promise<Uint8Array> {
  const { clubName, roundNumber, roundDateFormatted, teams } = options;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 Portrait
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const marginX = 28;
  const colGap = 16;
  const cols = teams.length <= 1 ? 1 : 2;
  const cardWidth = cols === 1 ? pageWidth - marginX * 2 : (pageWidth - marginX * 2 - colGap) / 2;

  const colorDark = rgb(0.06, 0.09, 0.16);
  const colorMuted = rgb(0.35, 0.4, 0.48);
  const colorBorder = rgb(0.8, 0.84, 0.88);
  const colorRed = rgb(0.75, 0.12, 0.12);
  const colorRedBg = rgb(0.99, 0.94, 0.94);
  const colorSlateBg = rgb(0.95, 0.96, 0.98);

  let y = pageHeight - 36;

  // Title
  page.drawText(sanitizeText(`${clubName} - Compositions Ronde ${roundNumber}`), {
    x: marginX,
    y,
    size: 16,
    font: fontBold,
    color: colorDark,
  });

  y -= 16;
  const totalAssigned = teams.reduce(
    (sum, t) => sum + t.boards.filter((b) => b.playerName !== null).length,
    0
  );
  const totalBoards = teams.reduce((sum, t) => sum + t.boardCount, 0);
  const datePart = roundDateFormatted ? `${roundDateFormatted}  |  ` : '';
  page.drawText(
    sanitizeText(`${datePart}${teams.length} equipe(s)  |  ${totalAssigned}/${totalBoards} echiquiers assignes`),
    {
      x: marginX,
      y,
      size: 9.5,
      font: fontRegular,
      color: colorMuted,
    }
  );

  y -= 20;

  // Group into rows of 2
  const rows: SummaryTeamData[][] = [];
  for (let i = 0; i < teams.length; i += cols) {
    rows.push(teams.slice(i, i + cols));
  }

  const rowHeightBase = 52;
  const boardRowH = 16;

  for (const row of rows) {
    const maxBoards = Math.max(...row.map((t) => t.boardCount), 4);
    const cardHeight = rowHeightBase + maxBoards * boardRowH + 8;

    // If needed, add another page if overflowing
    if (y - cardHeight < 30) {
      break; // Keep compact 1-page summary
    }

    row.forEach((team, cIdx) => {
      const cardX = marginX + cIdx * (cardWidth + colGap);
      const cardTopY = y;
      const missingInTeam = team.boardCount - team.boards.filter((b) => b.playerName !== null).length;

      // Outer box
      page.drawRectangle({
        x: cardX,
        y: cardTopY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        borderColor: missingInTeam > 0 ? colorRed : colorBorder,
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });

      // Dark Header bar
      const headerH = 22;
      page.drawRectangle({
        x: cardX,
        y: cardTopY - headerH,
        width: cardWidth,
        height: headerH,
        color: colorDark,
      });

      page.drawText(sanitizeText(`Equipe ${team.teamNumber} (${team.divisionLabel})`), {
        x: cardX + 8,
        y: cardTopY - 15,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      const statusText =
        missingInTeam > 0
          ? `${missingInTeam} manquant(s)`
          : team.isHome === undefined
          ? ''
          : team.isHome
          ? 'Domicile'
          : 'Exterieur';
      if (statusText) {
        const sW = fontBold.widthOfTextAtSize(sanitizeText(statusText), 8);
        page.drawText(sanitizeText(statusText), {
          x: cardX + cardWidth - 8 - sW,
          y: cardTopY - 14,
          size: 8,
          font: fontBold,
          color: missingInTeam > 0 ? rgb(1, 0.65, 0.65) : rgb(0.85, 0.9, 0.95),
        });
      }

      // Matchup bar
      const subH = 20;
      const subY = cardTopY - headerH - subH;
      page.drawRectangle({
        x: cardX + 0.5,
        y: subY,
        width: cardWidth - 1,
        height: subH,
        color: colorSlateBg,
      });

      const oppStr = sanitizeText(team.opponentTeamName ? `vs ${team.opponentTeamName}` : 'Adversaire NC');
      page.drawText(oppStr.length > 26 ? oppStr.slice(0, 23) + '...' : oppStr, {
        x: cardX + 8,
        y: subY + 6,
        size: 8.5,
        font: fontBold,
        color: colorDark,
      });

      const ourAvgStr = team.ourAverageElo ? `${team.ourAverageElo}` : 'NC';
      const oppAvgStr = team.opponentAverageElo ? `${team.opponentAverageElo}` : 'NC';
      const avgStr = sanitizeText(`Moy: ${ourAvgStr} vs ${oppAvgStr}`);
      const avgW = fontBold.widthOfTextAtSize(avgStr, 8.5);
      page.drawText(avgStr, {
        x: cardX + cardWidth - 8 - avgW,
        y: subY + 6,
        size: 8.5,
        font: fontBold,
        color: colorMuted,
      });

      // Boards
      let bY = subY - 14;
      team.boards.forEach((b, bIdx) => {
        const isMissing = !b.playerName;
        if (isMissing) {
          page.drawRectangle({
            x: cardX + 4,
            y: bY - 3,
            width: cardWidth - 8,
            height: boardRowH - 2,
            color: colorRedBg,
          });
        } else if (bIdx % 2 === 1) {
          page.drawRectangle({
            x: cardX + 4,
            y: bY - 3,
            width: cardWidth - 8,
            height: boardRowH - 2,
            color: colorSlateBg,
          });
        }

        page.drawText(`#${b.board}`, {
          x: cardX + 8,
          y: bY + 1,
          size: 8.5,
          font: fontBold,
          color: isMissing ? colorRed : colorMuted,
        });

        const nameTxt = sanitizeText(isMissing ? 'Echiquier manquant' : b.playerName!);
        const truncatedName = nameTxt.length > 28 ? nameTxt.slice(0, 25) + '...' : nameTxt;
        page.drawText(truncatedName, {
          x: cardX + 28,
          y: bY + 1,
          size: 8.5,
          font: isMissing ? fontBold : fontRegular,
          color: isMissing ? colorRed : colorDark,
        });

        const rightTxt = isMissing ? 'LIBRE' : `${b.playerRating || 'NC'}`;
        const rW = fontBold.widthOfTextAtSize(rightTxt, 8.5);
        page.drawText(rightTxt, {
          x: cardX + cardWidth - 8 - rW,
          y: bY + 1,
          size: 8.5,
          font: fontBold,
          color: isMissing ? colorRed : colorDark,
        });

        bY -= boardRowH;
      });
    });

    y -= cardHeight + 14;
  }

  return await pdfDoc.save();
}
