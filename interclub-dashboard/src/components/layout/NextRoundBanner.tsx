import React, { useState, useEffect } from 'react';
import { DivisionFrbe } from '../../modelsFRBE';
import { Calendar, Clock } from 'lucide-react';

interface Props {
  divisions: DivisionFrbe[];
}

export const NextRoundBanner: React.FC<Props> = ({ divisions }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number } | null>(null);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!divisions || divisions.length === 0) return;
    
    // Find the next unplayed round across all divisions
    let upcomingDate: Date | null = null;
    let upcomingRound: number | null = null;
    
    const now = new Date();

    // We can just use the first division's rounds as the calendar is the same for all
    const div = divisions[0];
    if (div && div.rounds) {
      for (const r of div.rounds) {
        if (!r.rdate) continue;
        
        // Parse rdate (e.g. "2026-09-27" or "2026-09-27T...")
        const [year, month, day] = r.rdate.slice(0, 10).split('-').map(Number);
        if (!year || !month || !day) continue;
        
        // Interclubs typically start at 14:00 (2 PM) in Belgium
        const roundDate = new Date(year, month - 1, day, 14, 0, 0);
        
        // If the round date is in the future
        if (roundDate > now) {
          upcomingDate = roundDate;
          upcomingRound = r.round;
          break;
        }
      }
    }

    setNextDate(upcomingDate);
    setRoundNumber(upcomingRound);
  }, [divisions]);

  useEffect(() => {
    if (!nextDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = nextDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          mins: Math.floor((difference / 1000 / 60) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // update every minute

    return () => clearInterval(timer);
  }, [nextDate]);

  if (!nextDate || !timeLeft) return null;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-4">
      <div className="bg-[#1A1918] text-white border border-[#1A1918] p-3 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-3">
          <div className="bg-[#E2DFD8]/20 p-2 text-[#E2DFD8]">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#E2DFD8] opacity-80">
              Prochaine Rencontre (Ronde {roundNumber})
            </div>
            <div className="font-serif font-bold text-base mt-0.5 text-white">
              {nextDate.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-4 py-2 border border-white/10">
          <Clock className="h-4 w-4 text-[#E2DFD8]" />
          <div className="flex items-center gap-3 font-mono font-bold text-sm">
            <div className="flex flex-col items-center">
              <span className="text-white text-lg leading-none">{timeLeft.days}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#E2DFD8] opacity-80 mt-1">Jours</span>
            </div>
            <span className="text-white/30 text-lg leading-none pb-2">:</span>
            <div className="flex flex-col items-center">
              <span className="text-white text-lg leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#E2DFD8] opacity-80 mt-1">Hrs</span>
            </div>
            <span className="text-white/30 text-lg leading-none pb-2">:</span>
            <div className="flex flex-col items-center">
              <span className="text-white text-lg leading-none">{timeLeft.mins.toString().padStart(2, '0')}</span>
              <span className="text-[9px] uppercase tracking-wider text-[#E2DFD8] opacity-80 mt-1">Min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

