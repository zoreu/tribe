import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { EXTRA_STRINGS } from './i18n-extra';

// Dicionário de interface (pt é o padrão). Chave -> { idioma: texto }
const STRINGS: Record<string, Record<string, string>> = {
  searchPlaceholder: {
    pt: 'Buscar pessoas, grupos ou posts...',
    en: 'Search people, groups or posts...',
    es: 'Buscar personas, grupos o publicaciones...',
    fr: 'Rechercher des personnes, groupes ou posts...'
  },
  feed: { pt: 'Feed', en: 'Feed', es: 'Feed', fr: 'Fil' },
  friends: { pt: 'Amigos', en: 'Friends', es: 'Amigos', fr: 'Amis' },
  reels: { pt: 'Reels', en: 'Reels', es: 'Reels', fr: 'Reels' },
  groups: { pt: 'Grupos', en: 'Groups', es: 'Grupos', fr: 'Groupes' },
  profile: { pt: 'Perfil', en: 'Profile', es: 'Perfil', fr: 'Profil' },
  relays: { pt: 'Relays', en: 'Relays', es: 'Relays', fr: 'Relays' },
  mainFeed: { pt: 'Feed Principal', en: 'Main Feed', es: 'Feed Principal', fr: 'Fil Principal' },
  friendsChat: { pt: 'Amigos & Chat E2EE', en: 'Friends & E2EE Chat', es: 'Amigos y Chat E2EE', fr: 'Amis et chat E2EE' },
  reelsVideos: { pt: 'Reels & Vídeos', en: 'Reels & Videos', es: 'Reels y Vídeos', fr: 'Reels et vidéos' },
  groupCommunities: { pt: 'Grupos e Comunidades', en: 'Groups & Communities', es: 'Grupos y Comunidades', fr: 'Groupes et communautés' },
  relayManager: { pt: 'Gerenciador de Relays', en: 'Relays Manager', es: 'Administrador de Relays', fr: 'Gestionnaire de relais' },
  myGroups: { pt: 'Meus Grupos', en: 'My Groups', es: 'Mis Grupos', fr: 'Mes Groupes' },
  trendingGroups: { pt: 'Grupos em Alta', en: 'Trending Groups', es: 'Grupos en Tendencia', fr: 'Groupes Tendance' },
  viewAll: { pt: 'Ver todos', en: 'View all', es: 'Ver todos', fr: 'Tout voir' },
  installApp: { pt: 'Instalar App', en: 'Install App', es: 'Instalar App', fr: "Installer l'app" },
  appPwa: { pt: 'App PWA', en: 'PWA App', es: 'App PWA', fr: 'App PWA' },
  messages: { pt: 'Mensagens', en: 'Messages', es: 'Mensajes', fr: 'Messages' },
  login: { pt: 'Entrar', en: 'Login', es: 'Entrar', fr: 'Connexion' },
  createAccount: { pt: 'Criar Conta', en: 'Create Account', es: 'Crear Cuenta', fr: 'Créer un compte' },
  logout: { pt: 'Sair', en: 'Logout', es: 'Salir', fr: 'Déconnexion' },
  editProfile: { pt: 'Editar Perfil', en: 'Edit Profile', es: 'Editar Perfil', fr: 'Modifier le profil' },
  myPosts: { pt: 'Minhas Postagens', en: 'My Posts', es: 'Mis Publicaciones', fr: 'Mes Publications' },
  posts: { pt: 'Publicações', en: 'Posts', es: 'Publicaciones', fr: 'Publications' },
  media: { pt: 'Mídias', en: 'Media', es: 'Medios', fr: 'Médias' },
  like: { pt: 'Curtir', en: 'Like', es: 'Me gusta', fr: 'J\'aime' },
  repost: { pt: 'Repost', en: 'Repost', es: 'Repost', fr: 'Repartager' },
  comment: { pt: 'Comentar', en: 'Comment', es: 'Comentar', fr: 'Commenter' },
  share: { pt: 'Compartilhar', en: 'Share', es: 'Compartir', fr: 'Partager' },
  copyId: { pt: 'Copiar ID', en: 'Copy ID', es: 'Copiar ID', fr: 'Copier ID' },
  copied: { pt: 'Copiado!', en: 'Copied!', es: '¡Copiado!', fr: 'Copié !' },
  backToMyProfile: { pt: '← Voltar ao meu perfil', en: '← Back to my profile', es: '← Volver a mi perfil', fr: '← Retour à mon profil' },
  noPostsYet: { pt: 'Você ainda não publicou nenhuma postagem no Tribe.', en: 'You have not published any post on Tribe yet.', es: 'Aún no has publicado ninguna publicación en Tribe.', fr: "Vous n'avez encore publié aucun post sur Tribe." },
  noPostsUser: { pt: 'Este usuário ainda não publicou nenhuma postagem no Tribe.', en: 'This user has not published any post on Tribe yet.', es: 'Este usuario aún no ha publicado ninguna publicación en Tribe.', fr: "Cet utilisateur n'a encore publié aucun post sur Tribe." }
};

export type UiLang = 'pt' | 'en' | 'es' | 'fr';

const SUPPORTED: UiLang[] = ['pt', 'en', 'es', 'fr'];

function detectBrowserLang(): UiLang {
  try {
    const raw = (navigator.language || 'pt').toLowerCase();
    const base = raw.split('-')[0];
    if ((SUPPORTED as string[]).includes(base)) return base as UiLang;
  } catch {}
  return 'pt';
}

interface LanguageContextType {
  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
  t: (key: string) => string;
}

function tlookup(key: string, lang: UiLang): string {
  return STRINGS[key]?.[lang]
    || EXTRA_STRINGS[key]?.[lang]
    || STRINGS[key]?.pt
    || EXTRA_STRINGS[key]?.pt
    || key;
}

const LanguageContext = createContext<LanguageContextType>({
  uiLang: 'pt',
  setUiLang: () => {},
  t: (key: string) => tlookup(key, 'pt')
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiLang, setUiLang] = useState<UiLang>(detectBrowserLang);

  useEffect(() => {
    // Document lang attribute para acessibilidade/seletores
    try { document.documentElement.lang = uiLang; } catch {}
  }, [uiLang]);

  const t = useMemo(() => {
    return (key: string) => tlookup(key, uiLang);
  }, [uiLang]);

  const value = useMemo(() => ({ uiLang, setUiLang, t }), [uiLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
