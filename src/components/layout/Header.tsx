import React, { useState } from 'react';
import { NotificationBell } from './NotificationBell';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Home, 
  Users, 
  Film, 
  Users as GroupIcon, 
  Search, 
  Radio, 
  Download, 
  User, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  Share2
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenRelaysModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery, onOpenRelaysModal }) => {
  const { 
    activeTab, 
    setActiveTab, 
    auth, 
    setShowAuthModal, 
    logout, 
    relays, 
    triggerPwaInstall, 
    pwaPrompt,
    isMobile,
    groups,
    joinedGroupIds,
    setSelectedGroupId
  } = useNostr();
  const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ao clicar no logo Tribe: limpa os parâmetros da URL (deep links como
  // ?group=..., ?note=...) e recarrega a página; se a URL já estiver limpa,
  // apenas volta para o feed.
  const handleLogoClick = () => {
    const cleanUrl = window.location.origin + window.location.pathname;
    if (window.location.href !== cleanUrl) {
      window.location.href = cleanUrl;
    } else {
      setActiveTab('feed');
    }
  };

  const activeRelaysCount = relays.filter(r => r.read || r.write).length;

  // Apenas os grupos nos quais o usuário realmente entrou
  const myGroups = groups.filter(g => joinedGroupIds.includes(g.id));

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Esquerda: Logo Tribe & Busca */}
        <div className="flex items-center gap-3">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="Ir para o início (limpa os parâmetros da URL)"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-xl tracking-tighter">T</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hidden sm:inline">
              Tribe
            </span>
          </div>

          {/* Input de Busca estilo Facebook */}
          <div className="relative hidden md:block w-64 lg:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                title={t('clearSearch')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Centro: Navegação Principal estilo Facebook */}
        <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-2 h-full">
          <button
            onClick={() => setActiveTab('feed')}
            className={`h-full px-5 flex items-center justify-center border-b-2 transition-all relative ${
              activeTab === 'feed'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title={t('titleFeed')}
          >
            <Home className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`h-full px-5 flex items-center justify-center border-b-2 transition-all relative ${
              activeTab === 'friends'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title={t('titleFriends')}
          >
            <Users className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('reels')}
            className={`h-full px-5 flex items-center justify-center border-b-2 transition-all relative ${
              activeTab === 'reels'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title={t('titleReels')}
          >
            <Film className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`h-full px-5 flex items-center justify-center border-b-2 transition-all relative ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title={t('titleGroups')}
          >
            <GroupIcon className="w-6 h-6" />
          </button>
        </nav>

        {/* Direita: Ações, Status de Relays, PWA & Perfil */}
        <div className="flex items-center gap-2">
          
          {/* Badge Status dos Relays */}
          <button
            onClick={onOpenRelaysModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            title={t('relayManager')}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeRelaysCount} Relays</span>
          </button>

          {/* Botão de Instalar PWA se disponível */}
          <button
            onClick={triggerPwaInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            title="Instalar Aplicativo PWA"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{pwaPrompt ? t('installApp') : t('appPwa')}</span>
          </button>

          {/* Sininho de Mensagens (notificações de conversas privadas) */}
          <NotificationBell />

          {/* Usuário / Botão Login */}
          {auth.pubkey ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <img
                  src={auth.profile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate hidden sm:inline">
                  {auth.profile?.name || 'Meu Perfil'}
                </span>
              </button>
              
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Entrar / Criar</span>
            </button>
          )}

          {/* Hamburguer menu mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Busca fixa no mobile (abaixo do header), igual à do desktop */}
      <div className="md:hidden px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pessoas, grupos ou posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              title={t('clearSearch')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Menu dropdown para Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { setActiveTab('feed'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl flex items-center gap-2 font-bold text-sm ${
                activeTab === 'feed' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Home className="w-5 h-5" />
              {t('feed')}
            </button>

            <button
              onClick={() => { setActiveTab('friends'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl flex items-center gap-2 font-bold text-sm ${
                activeTab === 'friends' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Users className="w-5 h-5" />
              {t('friends')}
            </button>

            <button
              onClick={() => { setActiveTab('reels'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl flex items-center gap-2 font-bold text-sm ${
                activeTab === 'reels' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Film className="w-5 h-5" />
              {t('reels')}
            </button>

            <button
              onClick={() => { setActiveTab('groups'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl flex items-center gap-2 font-bold text-sm ${
                activeTab === 'groups' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <GroupIcon className="w-5 h-5" />
              {t('groups')}
            </button>
          </div>

          {/* Meus Grupos no mobile (mesmos atalhos da sidebar desktop) */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('myGroups')}</span>
              <button
                onClick={() => { setActiveTab('groups'); setMobileMenuOpen(false); }}
                className="text-[11px] font-bold text-blue-500 hover:underline"
              >
                Ver todos
              </button>
            </div>
            {myGroups.length === 0 ? (
              <button
                onClick={() => { setActiveTab('groups'); setMobileMenuOpen(false); }}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-semibold text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                {t('noGroupsJoined')} {t('exploreGroups2')}
              </button>
            ) : (
              <div className="space-y-1">
                {myGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setActiveTab('groups');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <img src={g.picture} alt={g.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};






