import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { fetchFidePlayer, FidePlayerDetails, FideRatingPoint } from '../../api/fideClient';
import { ExternalLink, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface Props {
  playerName: string;
  expectedElo?: number;
  children: React.ReactNode;
  className?: string;
  underline?: boolean;
}

export const PlayerHoverCard: React.FC<Props> = ({
  playerName,
  expectedElo,
  children,
  className = '',
  underline = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FidePlayerDetails | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placeAbove: boolean;
    maxHeight: string;
  }>({
    top: 0,
    left: 0,
    placeAbove: true,
    maxHeight: '400px',
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const idealHeight = 360;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Place above if there is enough space (>= 360px) or if space above exceeds space below
    const placeAbove = spaceAbove >= idealHeight || spaceAbove >= spaceBelow;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    // Anchoring:
    // If placeAbove: top is set to (rect.top - 8) and CSS translates Y by -100%.
    // Its bottom will ALWAYS be strictly 8px above the trigger's top edge.
    // If placeBelow: top is set to (rect.bottom + 8) and CSS translates 0.
    // Its top will ALWAYS be strictly 8px below the trigger's bottom edge.
    // This GUARANTEES the popover never overlaps the trigger element or the mouse cursor!
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    const availableSpace = placeAbove ? rect.top - 16 : window.innerHeight - rect.bottom - 16;
    const maxHeight = `${Math.max(160, Math.floor(availableSpace))}px`;

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

    // Open delay 250ms avoids flashing when mouse is swiftly passing over lists
    openTimerRef.current = window.setTimeout(async () => {
      calculatePosition();
      setIsOpen(true);
      if (!data) {
        setLoading(true);
        const details = await fetchFidePlayer(playerName, expectedElo);
        setData(details);
        setLoading(false);
      }
    }, 250);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    // Crisp close delay (80ms)
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 80);
  };

  const handleClick = () => {
    clearTimers();
    setIsOpen(false);
  };

  // Immediate dismissal on scroll, wheel, escape, resize, or outside click
  useEffect(() => {
    const handleDismissImmediate = () => {
      clearTimers();
      if (isOpen) {
        setIsOpen(false);
      }
    };

    // Capture = true catches scrolling in nested overflow containers (e.g., simulator deck, tables)
    window.addEventListener('scroll', handleDismissImmediate, true);
    window.addEventListener('wheel', handleDismissImmediate, { passive: true });
    window.addEventListener('touchmove', handleDismissImmediate, { passive: true });
    window.addEventListener('resize', handleDismissImmediate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismissImmediate();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleDismissImmediate, true);
      window.removeEventListener('wheel', handleDismissImmediate);
      window.removeEventListener('touchmove', handleDismissImmediate);
      window.removeEventListener('resize', handleDismissImmediate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        clearTimers();
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const renderSparkline = (points: FideRatingPoint[]) => {
    if (points.length < 2) return null;

    // Take at most the last 36 points (last ~3 years)
    const recent = points.slice(-36);
    const ratings = recent.map(p => p.rating);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const diff = ratings[ratings.length - 1] - ratings[0];

    const width = 280;
    const height = 65;
    const padX = 6;
    const padY = 8;
    const range = maxRating - minRating || 1;

    const coordsArray = recent.map((p, i) => {
      const x = padX + (i / (recent.length - 1)) * (width - 2 * padX);
      const y = height - padY - ((p.rating - minRating) / range) * (height - 2 * padY);
      return { x, y, point: p };
    });

    const pathData = coordsArray.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaData = `${pathData} L ${coordsArray[coordsArray.length - 1].x} ${height} L ${coordsArray[0].x} ${height} Z`;

    const startRating = ratings[0];
    const currentRating = ratings[ratings.length - 1];
    const startDate = recent[0].period;
    const endDate = recent[recent.length - 1].period;

    return (
      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 tabular-nums">
          <span className="text-slate-500 font-semibold flex items-center gap-1 font-sans">
            Progression Elo Standard
          </span>
          <span
            className={`font-bold flex items-center gap-0.5 ${
              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-600'
            }`}
          >
            {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {diff > 0 ? `+${diff}` : `${diff}`} pts
          </span>
        </div>

        <div className="bg-slate-50 p-2 border border-slate-200/80 rounded-xl">
          <svg width={width} height={height} className="overflow-visible block">
            <defs>
              <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Fill Area */}
            <path d={areaData} fill="url(#eloGradient)" />
            {/* Line */}
            <path d={pathData} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* End circle */}
            <circle
              cx={coordsArray[coordsArray.length - 1].x}
              cy={coordsArray[coordsArray.length - 1].y}
              r="3.5"
              fill="#059669"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </svg>

          <div className="flex justify-between items-center text-[9px] font-mono tabular-nums text-slate-500 mt-1 px-1">
            <span>{startDate} ({startRating})</span>
            <span className="font-bold text-slate-900">Max: {maxRating}</span>
            <span>{endDate} ({currentRating})</span>
          </div>
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const profile = data?.profile;
  const age = profile?.year ? currentYear - profile.year : null;

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`inline-block relative cursor-pointer ${
        underline ? 'border-b border-dotted border-[#6E6A64]/60 hover:border-[#1E5E3A]' : ''
      } hover:text-[#1E5E3A] transition-colors ${className}`}
    >
      {children}

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              maxHeight: coords.maxHeight,
              width: 'min(320px, calc(100vw - 24px))',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-4 text-slate-800 font-sans text-xs select-text overflow-y-auto transition-opacity duration-100"
          >
            {/* Invisible hover bridge: covers the 8px gap between trigger and popover so the mouse can transition smoothly */}
            {coords.placeAbove ? (
              <div className="absolute -bottom-2.5 left-0 right-0 h-2.5 bg-transparent pointer-events-auto" />
            ) : (
              <div className="absolute -top-2.5 left-0 right-0 h-2.5 bg-transparent pointer-events-auto" />
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-mono text-slate-500">
                  Chargement profil FIDE...
                </span>
              </div>
            ) : !data || !profile ? (
              <div className="text-center py-4">
                <p className="font-semibold text-xs text-slate-900">{playerName}</p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Aucun profil FIDE associé trouvé sur Lichess.
                </p>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {profile.title && (
                        <span className="bg-amber-600 text-white px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider rounded">
                          {profile.title}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-slate-900 truncate leading-tight tracking-tight">
                        {profile.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono tabular-nums text-slate-500">
                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 font-bold text-slate-800 rounded">
                        {profile.federation || 'BEL'}
                      </span>
                      {age !== null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {age} ans ({profile.year})
                        </span>
                      )}
                      {profile.gender && (
                        <span>• {profile.gender === 'M' ? 'Homme' : 'Femme'}</span>
                      )}
                    </div>
                  </div>

                  <a
                    href={`https://ratings.fide.com/profile/${profile.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-emerald-700 rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0"
                    title="Voir la fiche officielle sur ratings.fide.com"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Ratings Pill Grid */}
                <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center font-mono tabular-nums">
                  <div className="bg-slate-50 p-2 border border-slate-200/80 rounded-xl">
                    <div className="text-[8px] uppercase font-bold text-slate-500 font-sans">Standard</div>
                    <div className="text-xs font-bold text-slate-900">
                      {profile.standard || 'NC'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 border border-slate-200/80 rounded-xl">
                    <div className="text-[8px] uppercase font-bold text-slate-500 font-sans">Rapide</div>
                    <div className="text-xs font-bold text-slate-900">
                      {profile.rapid || 'NC'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 border border-slate-200/80 rounded-xl">
                    <div className="text-[8px] uppercase font-bold text-slate-500 font-sans">Blitz</div>
                    <div className="text-xs font-bold text-slate-900">
                      {profile.blitz || 'NC'}
                    </div>
                  </div>
                </div>

                {/* Sparkline Graph */}
                {renderSparkline(data.ratingsHistory.standard)}

                {/* Footer with FIDE ID */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>FIDE ID : {profile.id}</span>
                  <span className="italic">Source : FIDE / Lichess</span>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
};
