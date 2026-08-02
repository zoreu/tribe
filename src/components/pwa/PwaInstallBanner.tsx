import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const { triggerPwaInstall, isMobile, pwaInstalled } = useNostr();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('tribe_pwa_install_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('tribe_pwa_install_dismissed', '1');
    } catch {}
  };

  // Exibe apenas em dispositivos móveis e enquanto o app não estiver
  // instalado ou o banner não tiver sido dispensado (persistido no storage).
  if (!isMobile || pwaInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white p-4 rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <span>Instalar Tribe no Celular</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h4>
            <p className="text-xs text-blue-100 leading-relaxed">
              Tenha a experiência completa de aplicativo com notificações, acesso rápido e navegação sem barras do navegador.
            </p>
            <button
              onClick={triggerPwaInstall}
              className="mt-2 py-2 px-4 bg-white hover:bg-blue-50 text-blue-700 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicativo PWA</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-white/80 hover:text-white hover:bg-black/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
