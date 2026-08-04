import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Sparkles, Key, PlusCircle, Lock, Radio, Copy, Check, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { loginWithExtension, loginWithNsec, createAccount } = useNostr();
  const { t } = useLanguage();

  const [nsecInput, setNsecInput] = useState('');
  const [showNsecInput, setShowNsecInput] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para modal de conta gerada na hora
  const [createdKeys, setCreatedKeys] = useState<{ nsec: string; npub: string; skHex: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);

  const handleExtensionLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    const ok = await loginWithExtension();
    setLoading(false);
    if (!ok) {
      setErrorMessage(t('extensionNotDetected'));
    }
  };

  const handleNsecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsecInput.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    const ok = loginWithNsec(nsecInput.trim());
    setLoading(false);
    if (!ok) {
      setErrorMessage('Chave inválida. Certifique-se de que é uma chave nsec (ex: nsec1...) ou 64 caracteres hexadecimais.');
    }
  };

  const handleCreateNewAccount = () => {
    const keys = createAccount();
    setCreatedKeys(keys);
  };

  const handleCopyNsec = () => {
    if (createdKeys) {
      navigator.clipboard.writeText(createdKeys.nsec);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyNpub = () => {
    if (createdKeys) {
      navigator.clipboard.writeText(createdKeys.npub);
      setCopiedNpub(true);
      setTimeout(() => setCopiedNpub(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Container Principal Centralizado estilo Facebook */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
        
        {/* Coluna da Esquerda: Marca e Proposta de Valor */}
        <div className="flex-1 text-center lg:text-left space-y-4 max-w-xl">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <span className="font-black text-2xl lg:text-4xl tracking-tighter">T</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-blue-600 dark:text-blue-500">
              tribe
            </h1>
          </div>

          <p className="text-xl lg:text-2xl font-medium text-slate-700 dark:text-slate-300 leading-snug">
            {t('heroText')}
          </p>

          <div className="pt-4 hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-blue-600 mb-1" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t('noCentralPasswords')}</h4>
              <p className="text-[11px] text-slate-500">{t('yourKeyUnique')}</p>
            </div>

            <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <Radio className="w-5 h-5 text-indigo-600 mb-1" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t('zeroCensorship')}</h4>
              <p className="text-[11px] text-slate-500">{t('multiRelays')}</p>
            </div>

            <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
              <Lock className="w-5 h-5 text-emerald-600 mb-1" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t('e2eePrivacy')}</h4>
              <p className="text-[11px] text-slate-500">{t('e2eeMessages')}</p>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Card de Login e Cadastro estilo Facebook */}
        <div className="w-full max-w-md shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 relative">
            
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('loginTribe')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Escolha como deseja se conectar à sua conta Nostr</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* Opção 1: Extensão do Navegador (Alby, nos2x, NIP-07) */}
            <button
              onClick={handleExtensionLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 text-blue-200 group-hover:rotate-12 transition-transform" />
              <span>{t('loginExtension')}</span>
            </button>

            {/* Divider */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              <span className="absolute bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                ou
              </span>
            </div>

            {/* Opção 2: Login com Chave Privada (nsec) */}
            {!showNsecInput ? (
              <button
                onClick={() => setShowNsecInput(true)}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-slate-500" />
                <span>Entrar com Chave Privada (nsec...)</span>
              </button>
            ) : (
              <form onSubmit={handleNsecSubmit} className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('yourPrivateKey')}</label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
                  >
                    {showPasswordText ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasswordText ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>

                <input
                  type={showPasswordText ? 'text' : 'password'}
                  placeholder="Cole sua chave nsec1... ou Hex de 64 digitos"
                  value={nsecInput}
                  onChange={(e) => setNsecInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNsecInput(false)}
                    className="flex-1 py-2 px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !nsecInput.trim()}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* Divider */}
            <div className="w-full border-t border-slate-200 dark:border-slate-800 my-1"></div>

            {/* Opção 3: Botão Verde Grande estilo Facebook "Criar Nova Conta" */}
            <div className="text-center pt-1">
              <button
                onClick={handleCreateNewAccount}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t('createNewAccountTribe')}</span>
              </button>
            </div>

          </div>

          {/* Subtext explicativo */}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
            <strong className="text-slate-700 dark:text-slate-300">{t('createOneClick')}</strong> {t('orUseYourKey')}
          </p>
        </div>

      </div>

      {/* Modal de Criação de Conta Nova com Visualização da Chave */}
      {createdKeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{t('accountCreated')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('keepKeySafe')}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{t('yourPrivateKey')}</label>
              <div className="font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 break-all">
                {createdKeys.nsec}
              </div>

              <button
                onClick={handleCopyNsec}
                className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t('keyCopied') : t('copyPrivateKey')}</span>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{t('yourPublicKey')}</label>
              <div className="font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 break-all">
                {createdKeys.npub}
              </div>

              <button
                onClick={handleCopyNpub}
                className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedNpub ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedNpub ? t('publicKeyCopied') : t('copyPublicKey')}</span>
              </button>
            </div>

            <button
              onClick={() => {
                loginWithNsec(createdKeys.nsec);
                setCreatedKeys(null);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-colors"
            >
              {t('enterNow')}
            </button>
          </div>
        </div>
      )}

      {/* Rodapé estilo Facebook com Links e Copyright */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start font-medium border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <span className="text-slate-800 dark:text-slate-200 font-bold">Português (Brasil)</span>
            <span>English (US)</span>
            <span>Español</span>
            <span>Français</span>
            <span>Deutsch</span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start text-[11px] text-slate-400">
            <span>{t('protocolNostr')}</span>
            <span>{t('relaysWebSocket')}</span>
            <span>{t('nip07Ext')}</span>
            <span>{t('nip04Nip44')}</span>
            <span>{t('openSource')}</span>
            <span>{t('developers')}</span>
            <span>{t('tribeCopyright')}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
