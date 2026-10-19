import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TeamStanding, getDivisionBadgeStyle } from '../../domain/standings';
import { Swords, Home, Plane, Trophy, Users } from 'lucide-react';

interface Props {
  team: TeamStanding;
  divisionLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export const TeamHoverCard: React.FC<Props> = ({
  team,
  divisionLabel,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placeAbove: boolean;
    maxHeight: string;
  }>({
    top: 0,
    left: 0,
    placeAbove: true,
    maxHeight: '440px',
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 360;
    const idealHeight = 380;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const placeAbove = spaceAbove >= idealHeight || spaceAbove >= spaceBelow;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    const availableSpace = placeAbove ? rect.top - 16 : window.innerHeight - rect.bottom - 16;
    const maxHeight = `${Math.max(200, Math.floor(availableSpace))}px`;

    setCoords({ top, left, placeAbove, maxHeight });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    openTimerRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
    }, 220);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-block ${className}`}
      >
        {children}
      </span>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={() => {
              if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              maxHeight: coords.maxHeight,
              zIndex: 99999,
            }}
            className="w-[360px] bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-4 flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden text-left"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  {divisionLabel && (
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-md ${getDivisionBadgeStyle(parseInt((divisionLabel.match(/\d+/) || ['0'])[0], 10))}`}>
                      {divisionLabel}
                    </span>
                  )}
                  {team.isOurClub && (
                    <span className="bg-emerald-600 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded shadow-xs">
                      Notre Club
                    </span>
                  )}
                </div>
                <h4 className="mt-1 font-bold tracking-tight text-base text-slate-900 truncate">
                  {team.teamName}
                </h4>
              </div>

              {/* Rank Pill */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shrink-0 font-mono tabular-nums">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">
                  #{team.rank}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-1.5 py-2.5 border-b border-slate-100 bg-slate-50 -mx-4 px-4 text-center shrink-0 font-mono tabular-nums">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Bilan</div>
                <div className="text-xs font-bold text-slate-800">
                  <span className="text-emerald-600">{team.won}V</span>{' '}
                  <span className="text-slate-500">{team.drawn}N</span>{' '}
                  <span className="text-rose-600">{team.lost}D</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Pts Match</div>
                <div className="text-xs font-bold text-slate-900">
                  {team.matchPoints}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Pts Éch.</div>
                <div className="text-xs font-bold text-slate-900">
                  {team.boardPoints}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Moy. Elo</div>
                <div className="text-xs font-bold text-slate-900">
                  {team.seasonAvgElo > 0 ? team.seasonAvgElo : 'NC'}
                </div>
              </div>
            </div>

            {/* Opponent Elo Facing Bar */}
            <div className="py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums shrink-0">
              <span className="text-slate-500 flex items-center gap-1 font-sans">
                <Users className="h-3 w-3 text-slate-700" /> Moy. Elo affronté :
              </span>
              <span className="font-bold text-slate-900">
                {team.seasonOppAvgElo > 0 ? `${team.seasonOppAvgElo} Elo` : 'NC'}
              </span>
            </div>

            {/* Match History List */}
            <div className="mt-2.5 flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1 font-sans">
                <Swords className="h-3 w-3" />
                Historique des Rencontres
              </div>

              {team.matchHistory && team.matchHistory.length > 0 ? (
                team.matchHistory.map((m) => {
                  const isWin = m.matchOutcome === 'win';
                  const isDraw = m.matchOutcome === 'draw';

                  return (
                    <div
                      key={m.round}
                      className="border border-slate-200/80 rounded-xl p-2.5 hover:bg-slate-50 transition-colors bg-white flex flex-col gap-1.5 shadow-xs"
                    >
                      {/* Top match line: Round, Location, Result */}
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded">
                            R{m.round}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            {m.isHome ? (
                              <>
                                <Home className="h-3 w-3 text-slate-700" /> Dom.
                              </>
                            ) : (
                              <>
                                <Plane className="h-3 w-3 text-slate-500" /> Ext.
                              </>
                            )}
                          </span>
                        </div>

                        {/* Match Outcome Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                            isWin
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDraw
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isWin ? 'Victoire' : isDraw ? 'Nul' : 'Défaite'} ({m.teamScore} - {m.oppScore})
                        </span>
                      </div>

                      {/* Opponent & Elo Details */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="font-semibold text-slate-800 truncate max-w-[190px]" title={m.opponentTeamName}>
                          vs {m.opponentTeamName}
                        </span>
                        <div className="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
                          <span className="font-bold text-slate-900">{m.teamAvgElo || 'NC'}</span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span>{m.oppAvgElo || 'NC'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  Aucun match encore joué cette saison.
                </div>
              )}
            </div>

            {/* Footer tip */}
            <div className="pt-2 mt-2 border-t border-slate-100 text-[9px] text-slate-500 font-mono tabular-nums flex items-center justify-between shrink-0">
              <span className="font-sans">Moy. Elo calculée sur échiquiers joués</span>
              <span className="font-bold text-slate-800">{team.played} match(s)</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
