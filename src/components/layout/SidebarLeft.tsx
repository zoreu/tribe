import React from 'react';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Home, 
  Users, 
  Film, 
  Users as GroupIcon, 
  User, 
  Radio, 
  ShieldCheck, 
  Lock, 
  PlusCircle, 
  Zap,
  Bookmark
} from 'lucide-react';

interface SidebarLeftProps {
  onOpenNewPost: () => void;
  onOpenRelaysModal: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ onOpenNewPost, onOpenRelaysModal }) => {
  const { activeTab, setActiveTab, auth, groups, joinedGroupIds, setSelectedGroupId, setShowAuthModal, totalUnreadMessages } = useNostr();
  const { t } = useLanguage();

  // Apenas os grupos nos quais o usuário realmente entrou aparecem em "Seus Grupos"
  const myGroups = groups.filter(g => joinedGroupIds.includes(g.id));

  return (
    <aside className="w-64 shrink-0 hidden lg:block space-y-4 sticky top-20 self-start">
      
      {/* Card do Usuário Logado */}
      <div 
        onClick={() => auth.pubkey ? setActiveTab('profile') : setShowAuthModal(true)}
        className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 group"
      >
        <img
          src={auth.profile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
          alt="Avatar"
          className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/20 group-hover:border-blue-500 transition-colors"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {auth.profile?.name || (auth.pubkey ? 'Meu Perfil' : 'Visitante')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {auth.pubkey ? (auth.profile?.nip05 || `${auth.npub.slice(0, 12)}...`) : 'Clique para entrar'}
          </p>
        </div>
      </div>

      {/* Botão Novo Post */}
      <button
        onClick={onOpenNewPost}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        <span>{t('publishOnTribe')}</span>
      </button>

      {/* Menu Principal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
        <button
          onClick={() => setActiveTab('feed')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'feed'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <Home className="w-5 h-5 text-blue-500" />
          <span>{t('mainFeed')}</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'friends'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>{t('friendsChat')}</span>
          </div>
          {totalUnreadMessages > 0 && (
            <span className="bg-rose-500 text-white font-extrabold text-xs px-2 py-0.5 rounded-full animate-pulse shadow-sm">
              {totalUnreadMessages}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'reels'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <Film className="w-5 h-5 text-pink-500" />
          <span>Reels & Vídeos</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'groups'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <GroupIcon className="w-5 h-5 text-emerald-500" />
          <span>{t('groupCommunities')}</span>
        </button>

        <button
          onClick={onOpenRelaysModal}
          className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        >
          <Radio className="w-5 h-5 text-amber-500" />
          <span>{t('relayManager')}</span>
        </button>
      </div>

      {/* Atalhos para Grupos (apenas os que o usuário entrou) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>{t('myGroups')}</span>
          <button onClick={() => setActiveTab('groups')} className="text-blue-500 hover:underline">{t('viewAll')}</button>
        </div>

        {myGroups.length === 0 ? (
          <div className="p-3 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl">
            <p className="text-[11px] text-slate-400 font-semibold leading-tight">
              {t('noGroupsJoined')}
            </p>
            <button
              onClick={() => setActiveTab('groups')}
              className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              {t('exploreGroups')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {myGroups.slice(0, 3).map(g => (
              <div
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setActiveTab('groups');
                }}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
              >
                <img src={g.picture} alt={g.name} className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 truncate">
                  {g.name}
                </span>
              </div>
            ))}
            {myGroups.length > 3 && (
              <button
                onClick={() => setActiveTab('groups')}
                className="text-[11px] text-blue-500 font-bold hover:underline pl-1"
              >
                Ver todos ({myGroups.length}) →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selo Anti-censura Nostr */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>{t('antiCensorshipGuarantee')}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {t('antiCensorshipDesc')}
        </p>
      </div>

    </aside>
  );
};




