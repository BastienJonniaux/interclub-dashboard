import React, { useState } from 'react';
import {
  getStoredDirectorKey,
  setStoredDirectorKey,
  verifyDirectorKey,
} from '../../api/backendClient';
import { ShieldCheck, KeyRound, X, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DirectorAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [keyInput, setKeyInput] = useState(getStoredDirectorKey() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('Veuillez entrer une clé ou mot de passe.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const isValid = await verifyDirectorKey(keyInput.trim());
      if (isValid) {
        setStoredDirectorKey(keyInput.trim());
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setError('Clé Directeur incorrecte. Accès refusé.');
      }
    } catch {
      // If server unreachable, still allow saving locally so user isn't blocked
      setStoredDirectorKey(keyInput.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const handleForget = () => {
    setStoredDirectorKey(null);
    setKeyInput('');
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#1A1918] max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-150">
        <div className="flex items-start justify-between border-b border-[#E2DFD8] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1E5E3A]" />
            <h3 className="font-serif font-bold text-base text-[#1A1918]">
              Accès Directeur des Interclubs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6E6A64] hover:text-[#1A1918] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-[#6E6A64] mt-3">
          Renseignez le mot de passe / clé secrète du Directeur pour autoriser
          l'enregistrement et le verrouillage officiel des compositions en base de données.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1A1918] font-bold mb-1.5">
              Mot de passe / Clé secrète
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6A64]" />
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Entrez votre clé directeur..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2DFD8] bg-[#F9F8F6] focus:bg-white focus:outline-hidden focus:border-[#1E5E3A] font-mono"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[#B91C1C] bg-[#B91C1C]/10 border border-[#B91C1C]/20 p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs text-[#1E5E3A] bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 p-2.5">
              <Check className="h-4 w-4 shrink-0" />
              <span>Authentification réussie !</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#E2DFD8]">
            {getStoredDirectorKey() ? (
              <button
                type="button"
                onClick={handleForget}
                className="text-xs text-[#B91C1C] hover:underline"
              >
                Oublier la clé
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-[#6E6A64] hover:bg-[#F9F8F6] border border-[#E2DFD8] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E5E3A] hover:bg-[#16482C] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Vérification...' : 'Valider'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

