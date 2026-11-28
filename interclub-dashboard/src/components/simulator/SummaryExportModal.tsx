import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlayerFrbe, TeamFrbe } from '../../modelsFRBE';
import { NextMatchScout, getBoardCountForDivision } from '../../domain/scouting';
import { ROUND_DATES } from '../../season';
import {
  renderSummaryToCanvas,
  downloadPngFromCanvas,
  generateSummaryPdf,
  SummaryTeamData,
} from '../../domain/pdf/summaryExport';
import { downloadPdfBlob } from '../../domain/pdf/matchSheetPdf';
import { X, Copy, Check, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedRound: number;
  clubName: string;
  teams: TeamFrbe[];
  players: PlayerFrbe[];
  draftCompositions: { [teamNumber: number]: { [board: number]: number | null } };
  scouting?: NextMatchScout[];
}

export const SummaryExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedRound,
  clubName,
  teams,
  players,
  draftCompositions,
  scouting = [],
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderedCanvas, setRenderedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const roundDateFormatted = useMemo(() => {
    const raw = ROUND_DATES[selectedRound - 1];
    if (!raw) return undefined;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return undefined;
    return d.toLocaleDateString('fr-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedRound]);

  const summaryTeams: SummaryTeamData[] = useMemo(() => {
    return teams.map((t, idx) => {
      const tNum = idx + 1;
      const bCount = getBoardCountForDivision(t.division);
      const tDraft = draftCompositions[tNum] || {};
      const tScout = scouting.find((s) => s.ourTeamName === t.name);

      const boards = [];
      let totalRating = 0;
      let assignedCount = 0;

      for (let b = 1; b <= bCount; b++) {
        const pid = tDraft[b];
        const p = pid ? players.find((x) => x.idnumber === pid) : null;
        if (p) {
          totalRating += p.assignedrating || 0;
          assignedCount++;
        }
        boards.push({
          board: b,
          playerName: p ? `${p.last_name} ${p.first_name}` : null,
          playerRating: p ? p.assignedrating || 0 : null,
        });
      }

      return {
        teamNumber: tNum,
        teamName: t.name,
        divisionLabel: `Div ${t.division}${t.index}`,
        isHome: tScout?.isHome,
        opponentTeamName: tScout?.opponentTeamName,
        opponentAverageElo: tScout?.opponentAverageElo,
        ourAverageElo: assignedCount > 0 ? Math.round(totalRating / assignedCount) : null,
        boardCount: bCount,
        boards,
      };
    });
  }, [teams, players, draftCompositions, scouting]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = renderSummaryToCanvas({
      clubName,
      roundNumber: selectedRound,
      roundDateFormatted,
      teams: summaryTeams,
    });
    setRenderedCanvas(canvas);
    setPreviewUrl(canvas.toDataURL('image/png'));
    setCopiedImage(false);
    setCopyError(null);
  }, [isOpen, clubName, selectedRound, roundDateFormatted, summaryTeams]);

  if (!isOpen) return null;

  const handleCopyImage = async () => {
    if (!renderedCanvas) return;
    setCopyError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        renderedCanvas.toBlob(resolve, 'image/png')
      );
      if (!blob || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        setCopyError('Copie directe non supportée par ce navigateur — téléchargez le PNG.');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } catch {
      setCopyError('Impossible de copier dans le presse-papier — utilisez "Télécharger PNG".');
    }
  };

  const handleDownloadPng = () => {
    if (!renderedCanvas) return;
    const slug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadPngFromCanvas(renderedCanvas, `compositions-${slug}-ronde-${selectedRound}.png`);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const bytes = await generateSummaryPdf({
        clubName,
        roundNumber: selectedRound,
        roundDateFormatted,
        teams: summaryTeams,
      });
      const slug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadPdfBlob(bytes, `recap-compositions-${slug}-ronde-${selectedRound}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Récapitulatif Visuel — Ronde {selectedRound}
              </h3>
              <p className="text-xs text-slate-500">
                Image nette prête à copier/envoyer par SMS ou WhatsApp, ou à exporter en PDF 1 page.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Copier l'image pour la coller directement dans WhatsApp, Messenger ou SMS"
            >
              {copiedImage ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedImage ? 'Image copiée !' : "Copier l'image"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Télécharger PNG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-rose-600" />
              <span>{isGeneratingPdf ? 'Génération...' : 'PDF (1 page)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {copyError && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-xs font-medium text-amber-800">
            {copyError}
          </div>
        )}

        {/* Preview Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/80 flex justify-center items-start">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Récapitulatif des compositions Ronde ${selectedRound}`}
              className="max-w-full h-auto rounded-xl border border-slate-300/80 shadow-md"
            />
          ) : (
            <div className="py-12 text-sm text-slate-500">Génération de l'aperçu...</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
