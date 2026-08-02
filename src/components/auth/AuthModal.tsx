import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { Key, ShieldCheck, Sparkles, Copy, Check, Lock, ExternalLink, RefreshCw } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    showAuthModal, 
    setShowAuthModal, 
    loginWithExtension, 
    loginWithNsec, 
    createAccount 
  } = useNostr();

  const [mode, setMode] = useState<'options' | 'nsec' | 'create'>('options');
  const [nsecInput, setNsecInput] = useState('');
  const [newKeys, setNewKeys] = useState<{ nsec: string; npub: string; skHex: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  const handleCreateAccount = () => {
    const keys = createAccount();
    setNewKeys(keys);
    setMode('create');
  };

  const handleCopyNsec = () => {
    if (newKeys?.nsec) {
      navigator.clipboard.writeText(newKeys.nsec);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNsecLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsecInput.trim()) return;
    setLoading(true);
    const success = loginWithNsec(nsecInput);
    setLoading(false);
    if (success) {
      setNsecInput('');
      setMode('options');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
          <button 
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors"
          >
            ✕
          </button>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Entrar no Tribe</h2>
          <p className="text-blue-100 text-sm mt-1">Sua rede social livre de censura no protocolo Nostr</p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {mode === 'options' && (
            <div className="space-y-4">
              {/* Opção 1: Extensão Nostr */}
              <button
                onClick={async () => {
                  setLoading(true);
                  await loginWithExtension();
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Conectar via Extensão Nostr</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Usar extensão do navegador (Alby, nos2x ou similar - NIP-07)</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>

              {/* Opção 2: Chave nsec */}
              <button
                onClick={() => setMode('nsec')}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Entrar com Chave Privada (nsec)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Inserir sua chave nsec1... ou formato hexadecimal</p>
                  </div>
                </div>
                <Lock className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-800 px-3 text-slate-400 font-medium">Ou criar conta</span></div>
              </div>

              {/* Opção 3: Criar Conta Nova */}
              <button
                onClick={handleCreateAccount}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Criar Nova Conta no Nostr
              </button>
            </div>
          )}

          {/* Formulario NSEC */}
          {mode === 'nsec' && (
            <form onSubmit={handleNsecLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Sua Chave Privada (nsec1... ou hex)
                </label>
                <input
                  type="password"
                  placeholder="nsec1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={nsecInput}
                  onChange={(e) => setNsecInput(e.target.value)}
                  className="w-full p-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  required
                />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Sua chave permanece salva apenas no seu navegador e não é enviada para nenhum servidor central.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('options')}
                  className="flex-1 py-3 px-4 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || !nsecInput.trim()}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Entrar na Conta
                </button>
              </div>
            </form>
          )}

          {/* Modal de Nova Conta Criada */}
          {mode === 'create' && newKeys && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
                <h4 className="font-bold flex items-center gap-2 text-base mb-1">
                  <Check className="w-5 h-5 text-emerald-600" />
                  Sua conta Nostr foi criada com sucesso!
                </h4>
                <p>Guarde sua chave <strong>nsec</strong> em um local seguro. Ela é a sua senha única e insubstituível para acessar o Tribe em qualquer lugar.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Sua Chave Privada (nsec):</label>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs break-all text-slate-800 dark:text-slate-200">
                  <span className="flex-1 select-all">{newKeys.nsec}</span>
                  <button
                    onClick={handleCopyNsec}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0 flex items-center gap-1 text-xs font-sans font-bold"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Seu Endereço Público (npub):</label>
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 break-all select-all">
                  {newKeys.npub}
                </div>
              </div>

              <button
                onClick={() => {
                  if (newKeys) loginWithNsec(newKeys.nsec);
                  setShowAuthModal(false);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Concluído - Entrar no Tribe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
