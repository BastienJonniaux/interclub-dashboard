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
    let email = introText ? introText + '\n\n' : '';

    const teams = club.teams || [];
    
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

      const locationName = isHome ? club.name : oppName;
      let header = `Equipe ${tNum} ${isHome ? 'au' : 'à'} ${locationName}`;

      email += `${header}\n`;
      
      if (venue) {
        email += `Adresse : ${venue.address || ''}, ${venue.postalcode || ''} ${venue.city || ''}`.trim() + '\n';
      }

      const customText = teamTexts[tNum] !== undefined ? teamTexts[tNum] : (isHome ? 'RDV au club à 12h30, je peux prendre tout le monde' : 'RDV sur place à 13h45');
      if (customText) {
        email += `${customText}\n`;
      }

      const draft = draftCompositions[tNum] || {};
      const boardCount = scout.boardCount || 4;

      for (let b = 1; b <= boardCount; b++) {
        const playerId = draft[b];
        const p = playerId ? club.players?.find(pl => pl.idnumber === playerId) : null;
        if (p) {
          email += `${b} | ${p.idnumber} | ${p.last_name} ${p.first_name} | ${p.assignedrating || 'NC'} |\n`;
        } else {
          email += `${b} | | A désigner | NC |\n`;
        }
      }
      
      email += '\n';
    });

    return email.trim();
  }, [introText, teamTexts, club, scouting, draftCompositions, venuesMap, selectedVenues]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col justify-between chess-panel p-6 bg-white border border-[#E2DFD8]">
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-[#E2DFD8] gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-[#1A1918] bg-[#F9F8F6]">
              <Mail className="h-5 w-5 text-[#1A1918]" />
            </div>
            <h3 className="font-bold font-serif text-[#1A1918] text-lg">
              Email de Composition (Pré-ronde)
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 bg-[#1E5E3A]/10 border border-[#1E5E3A]/30 px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider text-[#1E5E3A] hover:bg-[#1E5E3A] hover:text-white transition-all duration-300"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copié !' : "Copier l'email"}</span>
          </button>
        </div>

        <p className="mt-4 text-xs font-mono text-[#6E6A64]">
          Générez un brouillon d'e-mail avec les compositions du simulateur et les adresses des locaux.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#6E6A64] mb-1">Texte d'introduction</label>
              <textarea
                className="w-full text-xs p-2 border border-[#E2DFD8] bg-[#F9F8F6] focus:outline-none focus:border-[#1A1918] custom-scrollbar min-h-[60px]"
                value={introText}
                onChange={e => setIntroText(e.target.value)}
              />
            </div>

            <div className="space-y-4 border-t border-[#E2DFD8] pt-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {(club.teams || []).map((team, idx) => {
                const tNum = idx + 1;
                const scout = scouting.find(s => s.ourTeamName === team.name);
                if (!scout || scout.opponentTeamName.toUpperCase().includes('BYE')) return null;
                
                const isHome = scout.isHome;
                const locationClubId = isHome ? club.idclub : scout.opponentClubId;
                const availableVenues = venuesMap[locationClubId] || [];
                
                const defaultText = isHome ? 'RDV au club à 12h30, je peux prendre tout le monde' : 'RDV sur place à 13h45';
                const currentText = teamTexts[tNum] !== undefined ? teamTexts[tNum] : defaultText;

                return (
                  <div key={team.name} className="bg-white border border-[#E2DFD8] p-3">
                    <div className="font-bold font-serif text-[#1A1918] text-sm mb-2">
                      Équipe {tNum} {isHome ? '(Domicile)' : '(Extérieur)'} - vs {scout.opponentTeamName}
                    </div>
                    
                    {availableVenues.length > 1 && (
                      <div className="mb-2">
                        <label className="block text-[10px] uppercase font-bold text-[#6E6A64] mb-1">Local (plusieurs disponibles)</label>
                        <select 
                          className="w-full text-xs p-1.5 border border-[#E2DFD8] bg-[#F9F8F6]"
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
                      <label className="block text-[10px] uppercase font-bold text-[#6E6A64] mb-1">Message équipe</label>
                      <input 
                        type="text"
                        className="w-full text-xs p-1.5 border border-[#E2DFD8] bg-[#F9F8F6] focus:outline-none focus:border-[#1A1918]"
                        value={currentText}
                        onChange={e => handleTeamTextChange(tNum, e.target.value)}
                        placeholder="Ex: RDV à 13h..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-bold text-[#6E6A64]">Aperçu du mail</span>
            </div>
            <pre className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto bg-[#F9F8F6] p-4 text-[11px] leading-relaxed font-mono text-[#1A1918] border border-[#E2DFD8] whitespace-pre-wrap select-text custom-scrollbar">
              {generatedEmail}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
