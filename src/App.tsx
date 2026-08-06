import React, { useState } from 'react';
import { NostrProvider, useNostr } from './context/NostrContext';
import { useLanguage } from './context/LanguageContext';
import { isSpamPubkey } from './lib/spamFilter';
import { Header } from './components/layout/Header';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { SidebarRight } from './components/layout/SidebarRight';
import { PostCard } from './components/feed/PostCard';
import { CreatePostModal } from './components/feed/CreatePostModal';
import { SearchResults } from './components/feed/SearchResults';
import { AuthModal } from './components/auth/AuthModal';
import { ChatView } from './components/chat/ChatView';
import { ReelsView } from './components/reels/ReelsView';
import { GroupsView } from './components/groups/GroupsView';
import { ProfileView } from './components/profile/ProfileView';
import { RelaysManager } from './components/relays/RelaysManager';
import { PwaInstallBanner } from './components/pwa/PwaInstallBanner';
import { LandingPage } from './components/auth/LandingPage';
import { PlusCircle, Sparkles, Filter, RefreshCw, Lock, MessageSquare, X, Users, Globe, User, Link2 } from 'lucide-react';
const GroupIcon = Users;

// Exibição pública de uma postagem compartilhada via link (?note=...) sem exigir login
const PublicNoteView: React.FC = () => {
  const { posts, deepLink, setShowAuthModal } = useNostr();
  const note = posts.find(p => p.id === deepLink.noteId);
  const [notFound, setNotFound] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setNotFound(true), 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <h1 className="font-extrabold text-lg text-indigo-600 dark:text-indigo-400">Tribe Social</h1>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
        >
          Entrar / Criar Conta
        </button>
      </header>
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Link2 className="w-4 h-4 text-indigo-500" />
          <span>Postagem compartilhada com você</span>
        </div>
        {note ? (
          <PostCard post={note} />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-700 space-y-2">
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {notFound ? 'Postagem não encontrada nos relays.' : 'Buscando a postagem nos relays...'}
            </p>
            <p className="text-xs text-slate-400">
              {notFound
                ? 'A postagem pode ter sido removida ou ainda não está disponível nos relays conectados.'
                : 'Aguarde enquanto buscamos o evento Nostr pelo link compartilhado.'}
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors"
            >
              Entrar para curtir, comentar e repostar
            </button>
          </div>
        )}
      </main>
      <AuthModal />
    </div>
  );
};

// Exibição pública de um grupo compartilhado via link (?group=...) sem exigir login
const PublicGroupView: React.FC = () => {
  const { groups, posts, deepLink, setShowAuthModal } = useNostr();
  const group = groups.find(g => g.id === deepLink.groupId);
  const groupPosts = group ? posts.filter(p => p.groupId === group.id) : [];
  const [notFound, setNotFound] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setNotFound(true), 20000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <h1 className="font-extrabold text-lg text-indigo-600 dark:text-indigo-400">Tribe Social</h1>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
        >
          Entrar / Criar Conta
        </button>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-4">
        {group ? (
          <>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <GroupIcon className="w-4 h-4" />
              <span>Grupo compartilhado com você</span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="h-36 w-full relative bg-gradient-to-r from-emerald-600 to-teal-700">
                {group.banner && <img src={group.banner} alt={group.name} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
              <div className="p-5 flex items-start gap-4">
                <img
                  src={group.picture}
                  alt={group.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-lg shrink-0"
                />
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{group.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                </div>
              </div>
            </div>
            {groupPosts.length > 0 && (
              <div className="space-y-4">
                {groupPosts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            )}
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
            >
              Entrar para participar deste grupo
            </button>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-700 space-y-2">
            <GroupIcon className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {notFound ? 'Grupo não encontrado nos relays.' : 'Buscando o grupo nos relays...'}
            </p>
            <p className="text-xs text-slate-400">
              {notFound
                ? 'O grupo pode ter sido removido ou ainda não está disponível nos relays conectados.'
                : 'Aguarde enquanto buscamos a definição do grupo pelo link compartilhado.'}
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors"
            >
              Entrar / Criar Conta
            </button>
          </div>
        )}
      </main>
      <AuthModal />
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    posts, 
    auth, 
    setShowAuthModal, 
    latestNotification, 
    clearNotification, 
    setActiveChatPubkey,
    isFriend,
    friends,
deepLink
  } = useNostr();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [feedMode, setFeedMode] = useState<'friends' | 'global' | 'mine'>('friends');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isRelaysModalOpen, setIsRelaysModalOpen] = useState(false);

  if (!auth.pubkey) {
    if (deepLink.noteId) {
      return <PublicNoteView />;
    }
    if (deepLink.groupId) {
      return <PublicGroupView />;
    }
    return <LandingPage />;
  }

  const deepLinkedPost = deepLink.noteId ? posts.find(p => p.id === deepLink.noteId) : undefined;

  // Filtra posts no feed pelo modo selecionado e pela query de busca
  const filteredPosts = posts.filter(p => {
    if (isSpamPubkey(p.pubkey) || (p.repostOf && isSpamPubkey(p.repostOf.pubkey))) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = (
        p.content.toLowerCase().includes(q) ||
        p.repostOf?.content?.toLowerCase().includes(q) ||
        p.repostOf?.author?.name?.toLowerCase().includes(q) ||
        p.repostOf?.author?.display_name?.toLowerCase().includes(q) ||
        p.author?.name?.toLowerCase().includes(q) ||
        p.author?.display_name?.toLowerCase().includes(q)
      );
      if (!matches) return false;
    }

    if (feedMode === 'friends') {
      return p.pubkey === auth.pubkey || isFriend(p.pubkey);
    } else if (feedMode === 'mine') {
      return p.pubkey === auth.pubkey;
    }

    return true; // 'global'
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      
      {/* Top Navigation Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenRelaysModal={() => setIsRelaysModalOpen(true)}
      />

      {/* Main Layout Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6 flex gap-6">
        
        {/* Esquerda: Sidebar de Navegação */}
        <SidebarLeft
          onOpenNewPost={() => setIsPostModalOpen(true)}
          onOpenRelaysModal={() => setIsRelaysModalOpen(true)}
        />

        {/* Centro: Conteúdo Dinâmico com base na Tab Ativa */}
        <div className="flex-1 min-w-0">

          {/* Busca: exibe resultados de pessoas, grupos e publicações.
              A aba Perfil tem prioridade: ao clicar no nome/foto de um autor
              dentro dos resultados, abre o perfil dele mesmo com busca ativa. */}
          {searchQuery.trim().length > 0 && activeTab !== 'profile' ? (
            <SearchResults query={searchQuery} onClose={() => setSearchQuery('')} />
          ) : (
            <>
          {/* TAB 1: FEED DE NOTÍCIAS */}
          {activeTab === 'feed' && (
            <div className="space-y-6">
              
              {/* Publisher Card estilo Facebook */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={auth.profile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt="Avatar"
                    className="w-11 h-11 aspect-square rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <button
                    onClick={() => auth.pubkey ? setIsPostModalOpen(true) : setShowAuthModal(true)}
                    className="flex-1 text-left px-4 py-3 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200/80 dark:hover:bg-slate-900 rounded-full text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors truncate"
                  >
                    {auth.profile?.name ? `${auth.profile.name}, ${t('whatAreYouThinking')}` : t('composerPlaceholder')}
                  </button>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-around text-xs font-bold text-slate-600 dark:text-slate-400">
                  <button 
                    onClick={() => auth.pubkey ? setIsPostModalOpen(true) : setShowAuthModal(true)}
                    className="flex items-center gap-2 p-1.5 hover:text-blue-600 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>{t('freePost')}</span>
                  </button>

                  <button 
                    onClick={() => auth.pubkey ? setIsPostModalOpen(true) : setShowAuthModal(true)}
                    className="flex items-center gap-2 p-1.5 hover:text-amber-600 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>{t('antiCensorship')}</span>
                  </button>
                </div>
              </div>

              {/* Seletor de modo de exibição do Feed */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                <button
                  onClick={() => setFeedMode('friends')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    feedMode === 'friends'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t('friendsAndMe')}</span>
                  {friends.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      feedMode === 'friends' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {friends.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFeedMode('global')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    feedMode === 'global'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Global (Relays)</span>
                </button>

                <button
                  onClick={() => setFeedMode('mine')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    feedMode === 'mine'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>{t('mineFilterLabel')}</span>
                </button>
              </div>

              {/* Lista de Postagens do Feed */}
              {deepLinkedPost && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 px-1">
                    <Link2 className="w-4 h-4" />
                    <span>Postagem compartilhada com você</span>
                  </div>
                  <div className="ring-2 ring-indigo-300 dark:ring-indigo-700 rounded-2xl">
                    <PostCard post={deepLinkedPost} />
                  </div>
                </div>
              )}
              {filteredPosts.length === 0 && !deepLinkedPost ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="font-bold text-base text-slate-700 dark:text-slate-300">
                    {feedMode === 'friends' 
                      ? 'Nenhuma postagem de amigos encontrada ainda.' 
                      : 'Nenhuma postagem encontrada.'}
                  </p>
                  <p className="text-xs max-w-md mx-auto leading-relaxed">
                    {feedMode === 'friends'
                      ? 'Adicione amigos na barra lateral para ver o feed deles aqui ou mude para a aba "Global" para explorar o conteúdo dos relays.'
                      : 'Aguarde a recepção de eventos dos relays WebSocket ou crie sua própria postagem.'}
                  </p>
                  {feedMode === 'friends' && (
                    <button
                      onClick={() => setFeedMode('global')}
                      className="mt-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Ver Feed Global dos Relays</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts
                    .filter(p => p.id !== deepLink.noteId)
                    .map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: AMIGOS & BATE-PAPO E2EE */}
          {activeTab === 'friends' && <ChatView />}

          {/* TAB 3: REELS & VÍDEOS */}
          {activeTab === 'reels' && <ReelsView />}

          {/* TAB 4: GRUPOS & COMUNIDADES */}
          {activeTab === 'groups' && <GroupsView />}

          {/* TAB 5: MEU PERFIL */}
          {activeTab === 'profile' && <ProfileView />}

            </>
          )}

        </div>

        {/* Direita: Sidebar com Relays e Pessoas */}
        <SidebarRight
          onOpenRelaysModal={() => setIsRelaysModalOpen(true)}
        />

      </main>

      {/* Modais Globais */}
      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />

      <AuthModal />

      <RelaysManager
        isOpen={isRelaysModalOpen}
        onClose={() => setIsRelaysModalOpen(false)}
      />

      {/* Banner de Instalação PWA */}
      <PwaInstallBanner />

      {/* Toast de Notificação de Mensagem Recebida */}
      {latestNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-start gap-3 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div 
            className="flex-1 min-w-0 cursor-pointer" 
            onClick={() => {
              if (latestNotification.senderPubkey) {
                setActiveChatPubkey(latestNotification.senderPubkey);
                setActiveTab('friends');
              }
              clearNotification();
            }}
          >
            <h4 className="font-extrabold text-xs text-indigo-300 truncate">{latestNotification.title}</h4>
            <p className="text-xs text-slate-200 line-clamp-2 mt-0.5">{latestNotification.body}</p>
            <span className="text-[10px] text-indigo-400 font-bold mt-1 inline-block">Clique para abrir a conversa →</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearNotification();
            }}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <NostrProvider>
      <MainAppContent />
    </NostrProvider>
  );
}

