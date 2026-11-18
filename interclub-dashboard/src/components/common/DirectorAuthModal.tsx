import React, { useState } from 'react';
import {
  getStoredDirectorKey,
  setStoredDirectorKey,
  getStoredAuthorName,
  setStoredAuthorName,
  verifyDirectorKey,
} from '../../api/backendClient';
import { ShieldCheck, KeyRound, User, X, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DirectorAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [keyInput, setKeyInput] = useState(getStoredDirectorKey() || '');
  const [authorInput, setAuthorInput] = useState(getStoredAuthorName() || '');
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
      const result = await verifyDirectorKey(keyInput.trim());
      if (result.valid) {
        setStoredDirectorKey(keyInput.trim());
        setStoredAuthorName(authorInput.trim() || null);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setError(result.message || 'Clé Directeur incorrecte. Accès refusé.');
      }
    } catch {
      setError('Erreur de communication avec le serveur backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleForget = () => {
    setStoredDirectorKey(null);
    setStoredAuthorName(null);
    setKeyInput('');
    setAuthorInput('');
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/80 max-w-md w-full p-6 shadow-2xl rounded-2xl animate-in fade-in duration-150">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Accès Directeur des Interclubs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Renseignez le mot de passe / clé secrète du Directeur pour autoriser
          l'enregistrement et le verrouillage officiel des compositions en base de données.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold mb-1.5">
              Mot de passe / Clé secrète
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Entrez votre clé directeur..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-emerald-600 font-mono transition-colors"
                autoFocus
              />
            </div>
            {import.meta.env.DEV && (
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded border border-amber-200/60">
                <span>Mode dev local : clé par défaut <code className="font-mono font-bold">director1234</code></span>
                <button
                  type="button"
                  onClick={() => setKeyInput('director1234')}
                  className="text-amber-800 hover:underline font-semibold cursor-pointer"
                >
                  Remplir
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold mb-1.5">
              Votre nom / identifiant (optionnel)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                placeholder="ex: Bastien, Laurent (Directeur)..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-emerald-600 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Permet de savoir qui a enregistré ou verrouillé la composition en base de données.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
              <Check className="h-4 w-4 shrink-0" />
              <span>Authentification réussie !</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {getStoredDirectorKey() ? (
              <button
                type="button"
                onClick={handleForget}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Oublier la clé
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
