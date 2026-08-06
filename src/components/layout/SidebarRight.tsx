import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useNostr } from '../../context/NostrContext';
import { UserProfile } from '../../types';
import { Radio, UserPlus, Check, Copy, ExternalLink, Activity, ShieldAlert, Users } from 'lucide-react';

interface SidebarRightProps {
  onOpenRelaysModal: () => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({ onOpenRelaysModal }) => {
  const { relays, profiles, addFriend, isFriend } = useNostr();
  const { t } = useLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeProfiles: UserProfile[] = Object.values(profiles);

  const handleCopyNpub = (pubkey: string, npub: string) => {
    navigator.clipboard.writeText(npub);
    setCopiedKey(pubkey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <aside className="w-80 shrink-0 hidden xl:block space-y-4 sticky top-20 self-start">
      
      {/* Relays Conectados */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t('relayNetwork')}</h3>
          </div>
          <button 
            onClick={onOpenRelaysModal}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {t('manage')}
          </button>
        </div>

        <div className="space-y-2">
          {relays.slice(0, 4).map((relay, idx) => (
            <div 
              key={relay.url}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{relay.url.replace('wss://', '')}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full shrink-0">
                Ativo
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sugestões de Contatos / Quem Seguir */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t('peopleOnNostr')}</h3>

        {activeProfiles.length === 0 ? (
          <div className="p-4 text-center text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
            <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Rede Limpa</p>
            <p className="text-[11px] text-slate-400">
              Conecte-se com sua chave Nostr para ver usuários em tempo real via WebSocket.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeProfiles.map(profile => (
              <div key={profile.pubkey} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={profile.name}
                    className="w-9 h-9 aspect-square rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{profile.display_name || profile.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{profile.nip05 || profile.npub.slice(0, 10) + '...'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => addFriend(profile.pubkey)}
                    disabled={isFriend(profile.pubkey)}
                    className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 font-bold ${
                      isFriend(profile.pubkey)
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 opacity-80'
                        : 'bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400'
                    }`}
                    title={isFriend(profile.pubkey) ? 'Amigo adicionado' : 'Adicionar amigo'}
                  >
                    {isFriend(profile.pubkey) ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <UserPlus className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleCopyNpub(profile.pubkey, profile.npub)}
                    className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-lg transition-colors text-xs flex items-center gap-1 font-bold"
                    title="Copiar chave pública npub"
                  >
                    {copiedKey === profile.pubkey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Informativo sobre Criptografia & Anti-censura */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Activity className="w-4 h-4 text-blue-500" />
          <span>{t('nipsSupported')}</span>
        </div>
        <p>{t('nipsList')}</p>
      </div>

    </aside>
  );
};

