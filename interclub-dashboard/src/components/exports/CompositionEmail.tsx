import React, { useState, useEffect, useMemo } from 'react';
import { ClubFrbe, VenueFrbe } from '../../modelsFRBE';
import { NextMatchScout } from '../../domain/scouting';
import { fetchVenues } from '../../api/frbeClient';
import { Mail, Copy, Check } from 'lucide-react';

interface Props {
  club: ClubFrbe;
  scouting: NextMatchScout[];
  draftCompositions: Record<number, Record<number, number | null>>;
}

export const CompositionEmail: React.FC<Props> = ({ club, scouting, draftCompositions }) => {
  const [copied, setCopied] = useState(false);
  const [venuesMap, setVenuesMap] = useState<Record<number, VenueFrbe[]>>({});
  const [selectedVenues, setSelectedVenues] = useState<Record<number, number>>({});
  
  const [introText, setIntroText] = useState(
    'Bonjour,\nVoici les compositions pour ce dimanche.'
  );
  
  const [teamTexts, setTeamTexts] = useState<Record<number, string>>({});

  useEffect(() => {
    const clubIds = new Set<number>();
    clubIds.add(club.idclub);
    scouting.forEach(s => {
      if (s.opponentClubId > 0) clubIds.add(s.opponentClubId);
    });

    const loadVenues = async () => {
      const newVenues: Record<number, VenueFrbe[]> = {};
      for (const cid of clubIds) {
        const v = await fetchVenues(cid);
        newVenues[cid] = v;
      }
      setVenuesMap(newVenues);
    };
    loadVenues();
  }, [club.idclub, scouting]);

  const handleVenueChange = (teamNum: number, venueIndex: number) => {
    setSelectedVenues(prev => ({ ...prev, [teamNum]: venueIndex }));
  };

  const handleTeamTextChange = (teamNum: number, text: string) => {
    setTeamTexts(prev => ({ ...prev, [teamNum]: text }));
  };

  const generatedEmail = useMemo(() => {
    let email = introText ? introText.trim() + '\n\n' : '';

    const teams = club.teams || [];
    
    // Check if any team plays at home
    const hasHomeMatches = teams.some(team => {
      const scout = scouting.find(s => s.ourTeamName === team.name);
      return scout && scout.isHome && !scout.opponentTeamName.toUpperCase().includes('BYE');
    });

    if (hasHomeMatches) {
      email += `On joue à domicile donc début des parties à 14h au club.\n\n`;
    }
    
    teams.forEach((team, idx) => {
      const tNum = idx + 1;
      const scout = scouting.find(s => s.ourTeamName === team.name);
      if (!scout) return;

      const isBye = scout.opponentTeamName.toUpperCase().includes('BYE');
      if (isBye) return;

      const isHome = scout.isHome;
      const oppName = scout.opponentTeamName;
      const locationClubId = isHome ? club.idclub : scout.opponentClubId;
      
      const availableVenues = venuesMap[locationClubId] || [];
      const venueIdx = selectedVenues[tNum] || 0;
      const venue = availableVenues[venueIdx];

      let header = '';
      if (isHome) {
        header = `Equipe ${tNum} à domicile vs ${oppName}`;
      } else {
        header = `Equipe ${tNum} à ${oppName}`;
      }

      email += `${header}\n`;
      
      // Only include address line for away matches
      if (!isHome && venue) {
        email += `Adresse : ${venue.address || ''}, ${venue.postalcode || ''} ${venue.city || ''}`.trim() + '\n';
      }

      const defaultText = isHome
        ? ''
        : 'RDV au club à 12h30 pour covoiturage (ou sur place à 13h45)';

      const customText = teamTexts[tNum] !== undefined ? teamTexts[tNum] : defaultText;
      if (customText && customText.trim()) {
        email += `${customText.trim()}\n`;
      }

      const draft = draftCompositions[tNum] || {};
      const boardCount = scout.boardCount;
      const boardLines: string[] = [];
      
      for (let b = 1; b <= boardCount; b++) {
        const pid = draft[b];
        const p = pid ? club.players?.find(x => x.idnumber === pid) : null;
        if (p) {
          boardLines.push(`Éch. ${b}: ${p.last_name} ${p.first_name} (${p.assignedrating || 'NC'})`);
        } else {
          boardLines.push(`Éch. ${b}: [À déterminer]`);
        }
      }

      email += boardLines.join('\n');
      email += '\n\n';
    });

    email += `Bon match à tous !\n`;
    return email;
  }, [introText, club, scouting, venuesMap, selectedVenues, teamTexts, draftCompositions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col justify-between bg-white border border-slate-200/70 rounded-xl shadow-sm p-6">
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-xs">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
              Email de Composition (Pré-ronde)
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold font-mono rounded-lg shadow-xs transition-all cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copié !' : "Copier l'email"}</span>
          </button>
        </div>

        <p className="mt-3 text-xs font-mono text-slate-500">
          Générez un brouillon d'e-mail avec les compositions du simulateur et les adresses des locaux.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Texte d'introduction</label>
              <textarea
                className="w-full text-xs p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 custom-scrollbar min-h-[70px] transition-colors"
                value={introText}
                onChange={e => setIntroText(e.target.value)}
              />
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {(club.teams || []).map((team, idx) => {
                const tNum = idx + 1;
                const scout = scouting.find(s => s.ourTeamName === team.name);
                if (!scout || scout.opponentTeamName.toUpperCase().includes('BYE')) return null;
                
                const isHome = scout.isHome;
                const locationClubId = isHome ? club.idclub : scout.opponentClubId;
                const availableVenues = venuesMap[locationClubId] || [];
                
                const defaultText = isHome ? '' : 'RDV au club à 12h30 pour covoiturage (ou sur place à 13h45)';
                const currentText = teamTexts[tNum] !== undefined ? teamTexts[tNum] : defaultText;

                return (
                  <div key={team.name} className="bg-white border border-slate-200/70 rounded-xl p-3.5 shadow-xs">
                    <div className="font-bold text-slate-900 text-sm mb-2 flex items-center justify-between">
                      <span>Équipe {tNum} - vs {scout.opponentTeamName}</span>
                      <span className={`text-[10px] px-2 py-0.5 font-mono uppercase font-bold rounded-md border ${
                        isHome 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isHome ? '🏠 Domicile (14h au club)' : '🚗 Extérieur'}
                      </span>
                    </div>
                    
                    {!isHome && availableVenues.length > 1 && (
                      <div className="mb-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Local (plusieurs disponibles)</label>
                        <select 
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                          value={selectedVenues[tNum] || 0}
                          onChange={e => handleVenueChange(tNum, parseInt(e.target.value))}
                        >
                          {availableVenues.map((v, i) => (
                            <option key={i} value={i}>
                              {v.address}, {v.postalcode} {v.city}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        {isHome ? 'Message équipe (optionnel)' : 'Message équipe / Heure RDV'}
                      </label>
                      <input 
                        type="text"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                        value={currentText}
                        onChange={e => handleTeamTextChange(tNum, e.target.value)}
                        placeholder={isHome ? "Optionnel..." : "Ex: RDV à 12h30 pour covoiturage..."}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Aperçu du mail</span>
            </div>
            <pre className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto bg-slate-50/70 p-4 text-xs leading-relaxed font-mono text-slate-800 border border-slate-200/70 rounded-xl whitespace-pre-wrap select-text custom-scrollbar">
              {generatedEmail}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
