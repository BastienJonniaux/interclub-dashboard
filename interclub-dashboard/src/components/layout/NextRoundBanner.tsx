import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ROUND_DATES } from '../../season';

export const NextRoundBanner: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number } | null>(null);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);

  useEffect(() => {
    let upcomingDate: Date | null = null;
    let upcomingRound: number | null = null;
    const now = new Date();

    for (let i = 0; i < ROUND_DATES.length; i++) {
      const dateStr = ROUND_DATES[i];
      const [year, month, day] = dateStr.split('-').map(Number);
      // Interclubs start at 14:00 (2 PM) in Belgium
      const roundDate = new Date(year, month - 1, day, 14, 0, 0);
      
      if (roundDate > now) {
        upcomingDate = roundDate;
        upcomingRound = i + 1;
        break;
      }
    }

    setNextDate(upcomingDate);
    setRoundNumber(upcomingRound);
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
    <div 
      className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 shadow-xs" 
      title={`Ronde ${roundNumber} : ${nextDate.toLocaleDateString('fr-BE')}`}
    >
      <div className="flex items-center gap-1.5 text-slate-800">
        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-700">
          Ronde {roundNumber}
        </span>
      </div>
      <div className="w-px h-3.5 bg-slate-200"></div>
      <div className="flex items-center gap-1.5 text-slate-800">
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-mono tabular-nums text-xs font-bold text-slate-800">
          {timeLeft.days}j {timeLeft.hours.toString().padStart(2, '0')}h {timeLeft.mins.toString().padStart(2, '0')}m
        </span>
      </div>
    </div>
  );
};
