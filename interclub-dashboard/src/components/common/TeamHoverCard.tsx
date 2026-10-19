import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TeamStanding, getDivisionBadgeStyle } from '../../domain/standings';
import { Swords, Home, Plane, Trophy, Users, Shield } from 'lucide-react';

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

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

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
        className={`inline-block cursor-help transition-colors ${className}`}
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
            className="w-[360px] bg-white border border-[#1A1918] shadow-2xl p-4 flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden text-left"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E2DFD8] pb-3 shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  {divisionLabel && (
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase ${getDivisionBadgeStyle(parseInt((divisionLabel.match(/\d+/) || ['0'])[0], 10))}`}>
                      {divisionLabel}
                    </span>
                  )}
                  {team.isOurClub && (
                    <span className="bg-[#1E5E3A] text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Notre Club
                    </span>
                  )}
                </div>
                <h4 className="mt-1 font-serif font-bold text-base text-[#1A1918] truncate">
                  {team.teamName}
                </h4>
              </div>

              {/* Rank Pill */}
              <div className="flex items-center gap-1 bg-[#F9F8F6] border border-[#E2DFD8] px-2.5 py-1 shrink-0">
                <Trophy className="h-3.5 w-3.5 text-[#B45309]" />
                <span className="text-xs font-mono font-bold text-[#1A1918]">
                  #{team.rank}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-1.5 py-2.5 border-b border-[#E2DFD8] bg-[#F9F8F6] -mx-4 px-4 text-center shrink-0">
              <div>
                <div className="text-[9px] uppercase font-bold text-[#6E6A64]">Bilan</div>
                <div className="text-xs font-mono font-bold text-[#1A1918]">
                  <span className="text-[#1E5E3A]">{team.won}V</span>{' '}
                  <span className="text-[#6E6A64]">{team.drawn}N</span>{' '}
                  <span className="text-[#B91C1C]">{team.lost}D</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-[#6E6A64]">Pts Match</div>
                <div className="text-xs font-mono font-bold text-[#1A1918]">
                  {team.matchPoints}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-[#6E6A64]">Pts Éch.</div>
                <div className="text-xs font-mono font-bold text-[#1A1918]">
                  {team.boardPoints}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-[#6E6A64]">Moy. Elo</div>
                <div className="text-xs font-mono font-bold text-[#1A1918]">
                  {team.seasonAvgElo > 0 ? team.seasonAvgElo : 'NC'}
                </div>
              </div>
            </div>

            {/* Opponent Elo Facing Bar */}
            <div className="py-2 border-b border-[#E2DFD8] flex items-center justify-between text-[11px] font-mono shrink-0">
              <span className="text-[#6E6A64] flex items-center gap-1">
                <Users className="h-3 w-3 text-[#1A1918]" /> Moy. Elo affronté :
              </span>
              <span className="font-bold text-[#1A1918]">
                {team.seasonOppAvgElo > 0 ? `${team.seasonOppAvgElo} Elo` : 'NC'}
              </span>
            </div>

            {/* Match History List */}
            <div className="mt-2.5 flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6E6A64] flex items-center gap-1">
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
                      className="border border-[#E2DFD8] p-2 hover:bg-[#F9F8F6] transition-colors bg-white flex flex-col gap-1.5"
                    >
                      {/* Top match line: Round, Location, Result */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] bg-[#1A1918] text-white px-1.5 py-0.2">
                            R{m.round}
                          </span>
                          <span className="text-[10px] font-mono text-[#6E6A64] flex items-center gap-0.5">
                            {m.isHome ? (
                              <>
                                <Home className="h-3 w-3 text-[#1A1918]" /> Dom.
                              </>
                            ) : (
                              <>
                                <Plane className="h-3 w-3 text-[#6E6A64]" /> Ext.
                              </>
                            )}
                          </span>
                        </div>

                        {/* Match Outcome Badge */}
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 border ${
                            isWin
                              ? 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/25'
                              : isDraw
                              ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25'
                              : 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/25'
                          }`}
                        >
                          {isWin ? 'Victoire' : isDraw ? 'Nul' : 'Défaite'} ({m.teamScore} - {m.oppScore})
                        </span>
                      </div>

                      {/* Opponent & Elo Details */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E2DFD8]/60">
                        <span className="font-semibold text-[#1A1918] truncate max-w-[190px]" title={m.opponentTeamName}>
                          vs {m.opponentTeamName}
                        </span>
                        <div className="text-[10px] font-mono text-[#6E6A64] shrink-0">
                          <span className="font-bold text-[#1A1918]">{m.teamAvgElo || 'NC'}</span>
                          <span className="mx-1 text-[#E2DFD8]">/</span>
                          <span>{m.oppAvgElo || 'NC'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-[#6E6A64] italic bg-[#F9F8F6] border border-dashed border-[#E2DFD8]">
                  Aucun match encore joué cette saison.
                </div>
              )}
            </div>

            {/* Footer tip */}
            <div className="pt-2 mt-2 border-t border-[#E2DFD8] text-[9px] text-[#6E6A64] font-mono flex items-center justify-between shrink-0">
              <span>Moy. Elo calculée sur échiquiers joués</span>
              <span className="font-bold text-[#1A1918]">{team.played} match(s)</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
