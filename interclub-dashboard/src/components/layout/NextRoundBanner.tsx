import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { ROUND_DATES } from '../../season';
import { getFrenchClash } from '../../domain/calendar';

interface Props {
  onClick?: () => void;
}

export const NextRoundBanner: React.FC<Props> = ({ onClick }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number } | null>(null);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [hasFrenchClash, setHasFrenchClash] = useState<boolean>(false);

  useEffect(() => {
    let upcomingDate: Date | null = null;
    let upcomingRound: number | null = null;
    let clash = false;
    const now = new Date();

    for (let i = 0; i < ROUND_DATES.length; i++) {
      const dateStr = ROUND_DATES[i];
      const [year, month, day] = dateStr.split('-').map(Number);
      // Interclubs start at 14:00 (2 PM) in Belgium
      const roundDate = new Date(year, month - 1, day, 14, 0, 0);
      
      if (roundDate > now) {
        upcomingDate = roundDate;
        upcomingRound = i + 1;
        clash = getFrenchClash(dateStr).hasClash;
        break;
      }
    }

    setNextDate(upcomingDate);
    setRoundNumber(upcomingRound);
    setHasFrenchClash(clash);
  }, []);

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
    <button
      onClick={onClick}
      className="hidden md:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs transition-colors cursor-pointer text-left"
      title={`Ronde ${roundNumber} : ${nextDate.toLocaleDateString('fr-BE')} — Cliquez pour voir tout le calendrier et conflits France`}
    >
      <div className="flex items-center gap-1.5 text-slate-800">
        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs font-bold text-slate-800">
          Ronde {roundNumber}
        </span>
      </div>

      <div className="w-px h-3.5 bg-slate-200" />

      <div className="flex items-center gap-1.5 text-slate-800">
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-mono tabular-nums text-xs font-bold text-slate-800">
          {timeLeft.days}j {timeLeft.hours.toString().padStart(2, '0')}h {timeLeft.mins.toString().padStart(2, '0')}m
        </span>
      </div>

      {hasFrenchClash && (
        <>
          <div className="w-px h-3.5 bg-slate-200" />
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
            <AlertTriangle className="h-3 w-3 text-amber-700" />
            <span>Conflit FR</span>
          </span>
        </>
      )}
    </button>
  );
};
