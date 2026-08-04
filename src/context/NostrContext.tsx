import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { 
  AuthState, 
  NostrEvent, 
  PostItem, 
  RelayConfig, 
  TabType, 
  TribeGroup, 
  UserProfile, 
  ChatMessage, 
  DeepLinkParams,
  NotificationItem
} from '../types';
import { NostrClient, DEFAULT_RELAYS } from '../lib/nostr/client';
import { MOCK_POSTS, MOCK_PROFILES, MOCK_GROUPS } from '../lib/nostr/mockData';
import { extractMediaUrls } from '../lib/nostr/media';

// Converte uma chave VAPID base64url para Uint8Array (exigido pela Push API)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface NostrContextType {
  auth: AuthState;
  loginWithExtension: () => Promise<boolean>;
  loginWithNsec: (nsecOrHex: string) => boolean;
  createAccount: () => { nsec: string; npub: string; skHex: string };
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<boolean>;

  client: NostrClient;
  relays: RelayConfig[];
  addRelay: (url: string) => void;
  removeRelay: (url: string) => void;
  toggleRelay: (url: string) => void;
  autoReconnect: boolean;
  toggleAutoReconnect: () => void;
  reconnectRelays: () => Promise<void>;
  isReconnecting: boolean;

  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  viewProfilePubkey: string | null;
  setViewProfilePubkey: (pubkey: string | null) => void;

  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;

  posts: PostItem[];
  createPost: (content: string, mediaUrls?: string[], groupId?: string, isReel?: boolean, isEncrypted?: boolean) => Promise<boolean>;
  likePost: (post: PostItem) => Promise<void>;
  repostPost: (post: PostItem) => Promise<void>;
  commentPost: (postId: string, content: string, parentPubkey?: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  loadNote: (id: string) => Promise<PostItem | null>;

  groups: TribeGroup[];
  createGroup: (name: string, description: string, picture?: string, banner?: string) => Promise<TribeGroup>;
  updateGroup: (groupId: string, data: Partial<TribeGroup>) => Promise<boolean>;
  leaveGroup: (groupId: string) => void;
  rejoinGroup: (groupId: string) => void;
  joinGroup: (groupId: string) => void;
  joinedGroupIds: string[];
  leftGroups: TribeGroup[];
  deleteGroupPostModeration: (groupId: string, postId: string) => Promise<void>;

  friends: string[];
  addFriend: (pubkey: string) => Promise<void>;
  removeFriend: (pubkey: string) => Promise<void>;
  isFriend: (pubkey: string) => boolean;

  chats: Record<string, ChatMessage[]>;
  activeChatPubkey: string | null;
  setActiveChatPubkey: (pubkey: string | null) => void;
  chatLoading: boolean;
  sendDirectMessage: (receiverPubkey: string, text: string, mediaUrl?: string) => Promise<boolean>;

  unreadChats: Record<string, number>;
  totalUnreadMessages: number;
  latestNotification: NotificationItem | null;
  clearNotification: () => void;
  requestNotificationPermission: () => Promise<void>;
  pushEnabled: boolean;

  profiles: Record<string, UserProfile>;
  getProfile: (pubkey: string) => UserProfile;

  deepLink: DeepLinkParams;
  setDeepLink: (link: DeepLinkParams) => void;
  getShareableUrl: (type: 'note' | 'profile' | 'group' | 'reel' | 'chat', id: string) => string;

  pwaPrompt: any;
  triggerPwaInstall: () => void;
  isMobile: boolean;
  pwaInstalled: boolean;

  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);

const LOCAL_STORAGE_AUTH = 'tribe_nostr_auth';
const LOCAL_STORAGE_RELAYS = 'tribe_nostr_relays';
const LOCAL_STORAGE_OWN_PROFILE = 'tribe_nostr_own_profile';
const LOCAL_STORAGE_GROUPS = 'tribe_nostr_groups';

// Persiste o perfil do próprio usuário logado para reutilizar nas próximas sessões
const persistOwnProfile = (profile: UserProfile | undefined) => {
  if (!profile || !profile.pubkey) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_OWN_PROFILE, JSON.stringify(profile));
  } catch {}
};

export const NostrProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  // --- Estados de Autenticação ---
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUTH);
      if (saved) {
        const parsed = JSON.parse(saved);
        let profile;
        try {
          const ownProfile = localStorage.getItem(LOCAL_STORAGE_OWN_PROFILE);
          if (ownProfile) profile = JSON.parse(ownProfile);
        } catch {}
        if (parsed.secretKeyHex) {
          const match = parsed.secretKeyHex.match(/.{1,2}/g);
          const skBytes = match ? new Uint8Array(match.map((b: string) => parseInt(b, 16))) : undefined;
          return {
            ...parsed,
            secretKey: skBytes,
            profile
          };
        }
        return {
          ...parsed,
          profile
        };
      }
    } catch (e) {
      console.error('Erro ao restaurar sessão:', e);
    }
    return {
      pubkey: '',
      npub: '',
      authMode: 'none'
    };
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // --- Estados de Relays e Reconexão Automática ---
  const [relays, setRelays] = useState<RelayConfig[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RELAYS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RELAYS;
  });

  const [autoReconnect, setAutoReconnect] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tribe_nostr_auto_reconnect');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [subVersion, setSubVersion] = useState<number>(0);
  const relaysRef = useRef(relays);

  useEffect(() => {
    relaysRef.current = relays;
  }, [relays]);

  // Instância do Cliente Nostr
  const client = useMemo(() => {
    const activeUrls = relays.filter(r => r.read || r.write).map(r => r.url);
    return new NostrClient(activeUrls);
  }, [relays]);

  const toggleAutoReconnect = () => {
    setAutoReconnect(prev => {
      const val = !prev;
      localStorage.setItem('tribe_nostr_auto_reconnect', JSON.stringify(val));
      return val;
    });
  };

  const reconnectRelays = useCallback(async () => {
    setIsReconnecting(true);
    const currentRelays = relaysRef.current;

    const updatedRelays = currentRelays.map((relay) => {
      if (!relay.read && !relay.write) {
        return { ...relay, status: 'disconnected' as const };
      }
      return { ...relay, status: 'connected' as const };
    });

    setRelays(updatedRelays);
    localStorage.setItem(LOCAL_STORAGE_RELAYS, JSON.stringify(updatedRelays));

    client.ensurePoolConnections();
    setSubVersion(v => v + 1);

    setTimeout(() => {
      setIsReconnecting(false);
    }, 600);
  }, [client]);

  // Eventos de reconexão automática quando a internet voltar ou quando a aba for reaberta
  useEffect(() => {
    if (!autoReconnect) return;

    const handleOnline = () => {
      console.log('Navegador voltou online: reconectando relays Nostr...');
      reconnectRelays();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reconnectRelays();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [autoReconnect, reconnectRelays]);

  // --- Estado de Navegação e Tabs ---
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  // Pubkey do perfil que o usuário está visualizando (null = próprio perfil)
  const [viewProfilePubkey, setViewProfilePubkeyState] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // --- Posts, Grupos e Mensagens ---
  const [posts, setPosts] = useState<PostItem[]>(() => {
    try {
      const saved = localStorage.getItem('tribe_nostr_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migração: respostas (tag "e") não devem ser posts soltos no feed;
          // reanexa-as ao post pai em vez de exibi-las separadas.
          const isReply = (p: PostItem) => {
            if (p.kind === 6) return false; // reposts não são respostas
            const eTag = p.tags?.find(t => t[0] === 'e')?.[1];
            return !!eTag && eTag !== p.id;
          };
          const replies = parsed.filter(isReply);
          const normal = parsed.filter(p => !isReply(p));
          if (replies.length > 0) {
            const repliesByParent: Record<string, PostItem[]> = {};
            for (const r of replies) {
              const eTag = r.tags.find(t => t[0] === 'e')?.[1];
              if (eTag) (repliesByParent[eTag] || (repliesByParent[eTag] = [])).push(r);
            }
            return normal.map(p => {
              const parentReplies = repliesByParent[p.id];
              if (parentReplies) {
                return { ...p, repliesCount: parentReplies.length, replies: parentReplies };
              }
              return p;
            });
          }
          // Migração: limpa URLs de mídia (incluindo data URLs base64) que ficaram
          // embutidas no texto de posts salvos por versões antigas do app.
          return normal.map(p => {
            const cleaned = extractMediaUrls(p.content || '');
            const mergedMedia = p.media && p.media.length > 0 ? p.media : cleaned.media;
            return {
              ...p,
              content: cleaned.textWithoutMedia.length > 0 ? cleaned.textWithoutMedia : (mergedMedia.length > 0 ? '' : p.content),
              media: mergedMedia
            };
          });
        }
      }
    } catch (e) {
      console.error('Erro ao carregar posts locais:', e);
    }
    return MOCK_POSTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('tribe_nostr_posts', JSON.stringify(posts.slice(0, 50)));
    } catch {}
  }, [posts]);

  const [groups, setGroups] = useState<TribeGroup[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return MOCK_GROUPS;
  });

  // Persiste os grupos localmente para que não desapareçam ao recarregar a página
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_GROUPS, JSON.stringify(groups));
    } catch {}
  }, [groups]);

  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // --- Grupos do usuário (por conta) ---
  // "joinedGroupIds" = grupos nos quais a conta atual entrou de fato.
  // "leftGroups" = grupos que a conta saiu (guardados p/ seção de reentrada).
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [leftGroups, setLeftGroups] = useState<TribeGroup[]>([]);

  const joinedIdsRef = useRef<Set<string>>(new Set(joinedGroupIds));
  useEffect(() => {
    joinedIdsRef.current = new Set(joinedGroupIds);
  }, [joinedGroupIds]);

  // Carrega os grupos da conta atual (separados por pubkey) e limpa ao deslogar
  useEffect(() => {
    const pubkey = auth.pubkey;
    const readJSON = (key: string) => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
      } catch {}
      return null;
    };

    if (pubkey) {
      const joined = readJSON(`tribe_nostr_joined_groups_${pubkey}`);
      if (Array.isArray(joined)) setJoinedGroupIds(joined);

      const left = readJSON(`tribe_nostr_left_groups_${pubkey}`);
      if (Array.isArray(left)) setLeftGroups(left);
    } else {
      setJoinedGroupIds([]);
      setLeftGroups([]);
    }

    setSelectedGroupId(null);
  }, [auth.pubkey]);

  const authPubkeyRef = useRef(auth.pubkey);
  useEffect(() => {
    authPubkeyRef.current = auth.pubkey;
  }, [auth.pubkey]);

  // Entra em um grupo (adiciona à lista de grupos da conta)
  const joinGroup = useCallback((groupId: string) => {
    if (joinedIdsRef.current.has(groupId)) return;

    joinedIdsRef.current.add(groupId);
    setJoinedGroupIds(prev => {
      if (prev.includes(groupId)) return prev;
      const next = [...prev, groupId];
      const pubkey = authPubkeyRef.current;
      if (pubkey) {
        try {
          localStorage.setItem(`tribe_nostr_joined_groups_${pubkey}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // Remove da lista de saídos, se estiver lá
    setLeftGroups(prev => {
      if (!prev.some(g => g.id === groupId)) return prev;
      const next = prev.filter(g => g.id !== groupId);
      const pubkey = authPubkeyRef.current;
      if (pubkey) {
        try {
          localStorage.setItem(`tribe_nostr_left_groups_${pubkey}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_OWN_PROFILE);
      if (saved) {
        const p = JSON.parse(saved);
        if (p && p.pubkey) return { [p.pubkey]: p };
      }
    } catch {}
    return MOCK_PROFILES;
  });
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [activeChatPubkeyState, setActiveChatPubkeyState] = useState<string | null>(null);

  // --- Lista de Amigos / Contatos (Kind 3) ---
  const [friends, setFriends] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tribe_nostr_friends');
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.keys(MOCK_PROFILES);
  });

  // --- Notificações de Mensagem e Mensagens Não Lidas ---
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const clearNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  // Solicita a permissão de notificação do navegador/PWA (usada pelo sistema
  // de alertas de mensagens privadas).
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error('Erro ao solicitar permissão de notificação:', e);
      }
    }
  }, []);

  // Inscreve o dispositivo em Web Push para receber notificações de mensagens
  // mesmo com o app fechado/em segundo plano (celular/PWA).
  const subscribeToPush = useCallback(async (pubkey: string) => {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const res = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey, subscription: subscription.toJSON() })
      });
      setPushEnabled(true);
    } catch (e) {
      console.warn('Falha ao configurar push notifications:', e);
    }
  }, []);

  // Quando o usuário entra com uma conta, pede permissão de notificação e,
  // se concedida, inscreve o dispositivo em Web Push para receber avisos de
  // mensagens mesmo com o app fechado/em segundo plano.
  useEffect(() => {
    if (!auth.pubkey) return;
    const setup = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'default') {
        await requestNotificationPermission();
      }
      if (Notification.permission === 'granted') {
        await subscribeToPush(auth.pubkey);
      }
    };
    setup();
  }, [auth.pubkey, requestNotificationPermission, subscribeToPush]);

  // Última leitura por conversa (timestamp), persistida por conta. Mensagens
  // recebidas após esse momento são consideradas não lidas (estilo Facebook).
  const chatsRef = useRef<Record<string, ChatMessage[]>>({});
  const lastReadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (!auth.pubkey) return;
    try {
      const saved = localStorage.getItem(`tribe_nostr_lastread_${auth.pubkey}`);
      lastReadRef.current = saved ? JSON.parse(saved) : {};
    } catch {
      lastReadRef.current = {};
    }
  }, [auth.pubkey]);

  // Marca uma conversa como lida (atualiza o marcador de leitura e persiste)
  const markChatRead = useCallback((pubkey: string | null) => {
    if (!pubkey) return;
    const messages = chatsRef.current[pubkey];
    const lastTs = messages && messages.length > 0
      ? Math.max(messages[messages.length - 1].created_at, Date.now() / 1000)
      : Date.now() / 1000;
    lastReadRef.current = { ...lastReadRef.current, [pubkey]: lastTs };
    try {
      localStorage.setItem(`tribe_nostr_lastread_${auth.pubkey}`, JSON.stringify(lastReadRef.current));
    } catch {}
  }, [auth.pubkey]);

  // Mensagens não lidas = mensagens recebidas após o último momento de leitura
  // da conversa, desconsiderando a conversa que está aberta no momento.
  const unreadChats = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    Object.keys(chats).forEach(pk => {
      if (pk === activeChatPubkeyState) return;
      const lastRead = lastReadRef.current[pk] || 0;
      const count = chats[pk].filter(m => m.senderPubkey !== auth.pubkey && m.created_at > lastRead).length;
      if (count > 0) result[pk] = count;
    });
    return result;
  }, [chats, auth.pubkey, activeChatPubkeyState]);

  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadChats).reduce((a: number, b: number) => a + b, 0);
  }, [unreadChats]);

  // True enquanto as mensagens da conversa ativa ainda não foram carregadas
  const [chatLoading, setChatLoading] = useState(false);

  const setActiveChatPubkey = useCallback((pubkey: string | null) => {
    setActiveChatPubkeyState(pubkey);
    if (pubkey) {
      markChatRead(pubkey);
      // Se ainda não há mensagens carregadas para essa conversa, mostra
      // "Carregando mensagens..." até as mensagens chegarem dos relays.
      const msgs = chatsRef.current[pubkey];
      setChatLoading(!msgs || msgs.length === 0);
    } else {
      setChatLoading(false);
    }
  }, [markChatRead]);

  // Encerra o "Carregando mensagens..." assim que a conversa ativa recebe
  // mensagens (do fetch inicial ou em tempo real).
  useEffect(() => {
    if (!activeChatPubkeyState) return;
    const msgs = chats[activeChatPubkeyState];
    if (msgs && msgs.length > 0) {
      setChatLoading(false);
    }
  }, [chats, activeChatPubkeyState]);

  // Abre a conversa de uma notificação pendente assim que o chat ativo estiver
  // disponível (depende de setActiveChatPubkey, declarado acima).
  useEffect(() => {
    if (!auth.pubkey) return;
    let pending: string | null = null;
    try {
      pending = localStorage.getItem('tribe_pending_chat');
      localStorage.removeItem('tribe_pending_chat');
    } catch {}
    if (pending) {
      setActiveChatPubkey(pending);
      setActiveTab('friends');
    }
  }, [auth.pubkey, setActiveChatPubkey, setActiveTab]);

  // --- Deep Linking & URL Share ---
  const [deepLink, setDeepLink] = useState<DeepLinkParams>({});

  // --- PWA Installation ---
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  // Detecta se o app já foi instalado (storage, modo standalone ou iOS)
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('tribe_pwa_installed') === '1') return true;
      return window.matchMedia?.('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true;
    } catch {
      return false;
    }
  });

  // Detecta se é mobile no carregamento inicial
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Evento PWA install
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Marca como instalado quando o app é efetivamente instalado (evento appinstalled)
  useEffect(() => {
    const handler = () => {
      setPwaInstalled(true);
      setPwaPrompt(null);
      try {
        localStorage.setItem('tribe_pwa_installed', '1');
      } catch {}
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const triggerPwaInstall = () => {
    // Ao clicar no botão de instalar, marca no storage para que o banner
    // não volte a aparecer em carregamentos futuros da página.
    try {
      localStorage.setItem('tribe_pwa_installed', '1');
    } catch {}
    setPwaInstalled(true);

    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then(() => setPwaPrompt(null));
    } else {
      alert('Para instalar o aplicativo no celular:\n1. Abra o menu do seu navegador (três pontinhos ou compartilhar).\n2. Selecione "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
    }
  };

  // --- Leitura de Parâmetros da URL para Deep Linking ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('note');
    const pubkey = params.get('p');
    const groupId = params.get('group');
    const reelId = params.get('reel');
    const chatPubkey = params.get('chat');

    if (noteId || pubkey || groupId || reelId || chatPubkey) {
      setDeepLink({
        noteId: noteId || undefined,
        pubkey: pubkey || undefined,
        groupId: groupId || undefined,
        reelId: reelId || undefined,
        chatPubkey: chatPubkey || undefined
      });

      if (groupId) {
        setActiveTab('groups');
      } else if (reelId) {
        setActiveTab('reels');
      } else if (chatPubkey) {
        setActiveChatPubkey(chatPubkey);
        setActiveTab('friends');
      } else if (pubkey) {
        setActiveTab('profile');
      }
    }
  }, []);

  const getShareableUrl = (type: 'note' | 'profile' | 'group' | 'reel' | 'chat', id: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    switch (type) {
      case 'note': return `${baseUrl}?note=${id}`;
      case 'profile': return `${baseUrl}?p=${id}`;
      case 'group': return `${baseUrl}?group=${id}`;
      case 'reel': return `${baseUrl}?reel=${id}`;
      case 'chat': return `${baseUrl}?chat=${id}`;
    }
  };

  // Helper para obter perfil de usuário ou gerar genérico
  const getProfile = useCallback((pubkeyHex: string): UserProfile => {
    if (profiles[pubkeyHex]) return profiles[pubkeyHex];
    
    // Se for o próprio usuário logado
    if (auth.pubkey === pubkeyHex && auth.profile) {
      return auth.profile;
    }

    const npub = client.hexToNpub(pubkeyHex);
    return {
      pubkey: pubkeyHex,
      npub,
      name: `User_${pubkeyHex.slice(0, 6)}`,
      display_name: `Tribe Member ${npub.slice(0, 10)}...`
    };
  }, [profiles, auth.pubkey, auth.profile, client]);

  // Converte um evento Nostr em PostItem normalizado
  const eventToPostItem = useCallback((ev: NostrEvent, displayContent?: string): PostItem => {
    // Repost (NIP-18 kind 6): o conteúdo é o JSON do evento original, que fica
    // embutido em "repostOf" para exibir estilo Twitter.
    let repostOf: PostItem | undefined;
    if (ev.kind === 6) {
      try {
        const orig = JSON.parse(ev.content || '{}');
        if (orig && orig.id && typeof orig.id === 'string') {
          // Se o original for outro repost, usa a postagem interna (evita aninhamento)
          let base = orig;
          if (orig.kind === 6) {
            try {
              const inner = JSON.parse(orig.content || '{}');
              if (inner && inner.id) base = inner;
            } catch {}
          }
          repostOf = eventToPostItem(base);
        }
      } catch {}
    }

    const content = repostOf ? '' : (displayContent ?? ev.content);
    const { textWithoutMedia, media } = extractMediaUrls(content);
    // Identifica o grupo do post: prioriza a tag "h" (id do grupo) e, caso
    // só exista a tag "a" (endereço NIP-29), normaliza removendo o prefixo
    // "34550:" e qualquer sufixo ":pubkey" para não misturar postagens
    // entre grupos diferentes.
    let groupTag: string | undefined = ev.tags.find(t => t[0] === 'h')?.[1];
    if (!groupTag) {
      const aTag = ev.tags.find(t => t[0] === 'a')?.[1];
      if (aTag && aTag.startsWith('34550:')) {
        groupTag = aTag.slice(6).split(':')[0];
      }
    }
    const isReel = ev.tags.some(t => t[0] === 't' && t[1] === 'reel') || media.some(m => m.type === 'video');

    const likesSet = interactionsRef.current.likes[ev.id];
    const repostsSet = interactionsRef.current.reposts[ev.id];
    const replyList = interactionsRef.current.replies[ev.id];

    return {
      id: ev.id,
      pubkey: ev.pubkey,
      author: getProfile(ev.pubkey),
      created_at: ev.created_at,
      content: textWithoutMedia.length > 0 ? textWithoutMedia : (media.length > 0 ? '' : content),
      tags: ev.tags,
      kind: ev.kind,
      event: ev,
      likesCount: likesSet?.size || 0,
      userLiked: !!likesSet?.has(auth.pubkey || ''),
      repostsCount: repostsSet?.size || 0,
      userReposted: !!repostsSet?.has(auth.pubkey || ''),
      repliesCount: replyList?.length || 0,
      replies: replyList ? [...replyList] : [],
      media,
      isEncrypted: ev.content.startsWith('tribee2e:') || ev.content.includes('?iv='),
      groupId: groupTag,
      isReel,
      repostOf
    };
  }, [getProfile, auth.pubkey]);

  // Contadores de interações por post (likes, reposts, respostas) mantidos em memória
  const interactionsRef = useRef<{
    likes: Record<string, Set<string>>;
    reposts: Record<string, Set<string>>;
    replies: Record<string, PostItem[]>;
  }>({ likes: {}, reposts: {}, replies: {} });

  // Evita buscar o perfil (kind 0) do mesmo pubkey repetidamente
  const fetchedProfilesRef = useRef<Set<string>>(new Set());

  // Busca o perfil (kind 0) de um autor se ainda não estiver carregado,
  // para exibir o nome real (em vez do nome padrão) em reposts e referências.
  const ensureProfileLoaded = useCallback((pubkey: string) => {
    if (!pubkey || typeof pubkey !== 'string') return;
    if (fetchedProfilesRef.current.has(pubkey)) return;
    fetchedProfilesRef.current.add(pubkey);
    client.fetchUserProfile(pubkey).then(p => {
      if (p) setProfiles(prev => ({ ...prev, [pubkey]: p }));
    });
  }, [client]);

  // Abre o perfil de um usuário (ou volta ao próprio perfil com null)
  const setViewProfilePubkey = useCallback((pubkey: string | null) => {
    setViewProfilePubkeyState(pubkey);
    if (pubkey) {
      setActiveTab('profile');
      ensureProfileLoaded(pubkey);
    }
  }, [ensureProfileLoaded]);

  const DEFAULT_GROUP_PICTURE = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80';
  const DEFAULT_GROUP_BANNER = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80';

  // Converte um evento kind 34550 (definição de comunidade NIP-29) em TribeGroup
  const parseGroupEvent = useCallback((ev: NostrEvent): TribeGroup | null => {
    const dTag = ev.tags.find(t => t[0] === 'd')?.[1] || ev.id;
    if (!dTag) return null;

    let meta: any = {};
    try { meta = JSON.parse(ev.content || '{}'); } catch {}

    const name = ev.tags.find(t => t[0] === 'name')?.[1] || meta.name || `Grupo ${dTag.slice(0, 8)}`;
    const description = ev.tags.find(t => t[0] === 'description')?.[1] || meta.description || '';
    const picture = ev.tags.find(t => t[0] === 'picture')?.[1] || meta.picture || DEFAULT_GROUP_PICTURE;
    const banner = ev.tags.find(t => t[0] === 'banner')?.[1] || meta.banner || DEFAULT_GROUP_BANNER;
    const moderators = Array.from(new Set([
      ev.pubkey,
      ...ev.tags.filter(t => t[0] === 'p').map(t => t[1]).filter(Boolean)
    ]));

    return {
      id: dTag,
      name,
      description,
      picture,
      banner,
      creatorPubkey: ev.pubkey,
      moderators,
      created_at: ev.created_at
    };
  }, []);

  // Adiciona um grupo ao estado (lista de grupos conhecidos/browse) sem duplicar
  const upsertGroup = useCallback((group: TribeGroup) => {
    setGroups(prev => {
      if (prev.some(g => g.id === group.id)) return prev;
      return [...prev, group];
    });
  }, []);

  // Busca dos relays os likes/reposts/comentários existentes para os posts informados
  const refreshPostInteractions = useCallback(async (postIds: string[]) => {
    const ids = Array.from(new Set((postIds || []).filter(Boolean)));
    if (ids.length === 0) return;

    try {
      const [reactions, repostEvents, replyEvents] = await Promise.all([
        client.fetchEvents([{ kinds: [7], '#e': ids, limit: 500 }]),
        client.fetchEvents([{ kinds: [6], '#e': ids, limit: 500 }]),
        client.fetchEvents([{ kinds: [1], '#e': ids, limit: 300 }])
      ]);

      const likes = interactionsRef.current.likes;
      const reposts = interactionsRef.current.reposts;
      const replies = interactionsRef.current.replies;

      for (const ev of reactions || []) {
        const eTag = ev.tags.find(t => t[0] === 'e')?.[1];
        if (eTag) (likes[eTag] || (likes[eTag] = new Set())).add(ev.pubkey);
      }
      for (const ev of repostEvents || []) {
        const eTag = ev.tags.find(t => t[0] === 'e')?.[1];
        if (eTag) (reposts[eTag] || (reposts[eTag] = new Set())).add(ev.pubkey);
        // Adiciona o repost ao feed como postagem (estilo Twitter)
        const repostItem = eventToPostItem(ev);
        const originalAuthor = ev.tags.find(t => t[0] === 'p')?.[1];
        if (originalAuthor) ensureProfileLoaded(originalAuthor);
        setPosts(prev => {
          if (prev.some(p => p.id === ev.id)) return prev;
          return [repostItem, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      }
      for (const ev of replyEvents || []) {
        const eTag = ev.tags.find(t => t[0] === 'e')?.[1];
        if (eTag && eTag !== ev.id) {
          const list = replies[eTag] || (replies[eTag] = []);
          if (!list.some(r => r.id === ev.id)) {
            // Decifra respostas criptografadas para não exibir o conteúdo bruto no comentário
            let displayContent = ev.content;
            const isEncrypted = ev.content.startsWith('tribee2e:') || ev.content.includes('?iv=');
            if (isEncrypted) {
              try {
                displayContent = await client.decryptDirectMessage(
                  ev.content,
                  ev.pubkey,
                  auth.authMode,
                  auth.secretKey,
                  auth.pubkey || undefined
                );
              } catch {}
            }
            list.push(eventToPostItem(ev, displayContent));
          }
        }
      }

      setPosts(prev => prev.map(p => ({
        ...p,
        likesCount: likes[p.id]?.size || 0,
        userLiked: auth.pubkey ? !!likes[p.id]?.has(auth.pubkey) : p.userLiked,
        repostsCount: reposts[p.id]?.size || 0,
        userReposted: auth.pubkey ? !!reposts[p.id]?.has(auth.pubkey) : p.userReposted,
        repliesCount: replies[p.id]?.length || 0,
        replies: replies[p.id] ? [...replies[p.id]] : []
      })));
    } catch (e) {
      console.error('Erro ao atualizar interações dos posts:', e);
    }
  }, [client, auth.pubkey, eventToPostItem]);

  // Processa um evento kind 1: se for resposta/comentário (tag "e"), anexa ao post pai;
  // caso contrário, adiciona como post normal do feed.
  const ingestPostEvent = useCallback((ev: NostrEvent, displayContent?: string): boolean => {
    // Busca o perfil (kind 0) do autor se ainda não estiver carregado, para exibir o nome real
    if (!fetchedProfilesRef.current.has(ev.pubkey)) {
      fetchedProfilesRef.current.add(ev.pubkey);
      client.fetchUserProfile(ev.pubkey).then(p => {
        if (p) setProfiles(prev => ({ ...prev, [ev.pubkey]: p }));
      });
    }

    const eTag = ev.tags.find(t => t[0] === 'e')?.[1];

    if (eTag && eTag !== ev.id) {
      // Comentário/resposta: fica restrito à thread do post original
      const replyItem = eventToPostItem(ev, displayContent);
      const list = interactionsRef.current.replies[eTag] || (interactionsRef.current.replies[eTag] = []);
      if (!list.some(r => r.id === ev.id)) {
        list.push(replyItem);
      }
      setPosts(prev => prev.map(p => p.id === eTag ? {
        ...p,
        repliesCount: list.length,
        replies: [...list]
      } : p));
      return false;
    }

    const newPost = eventToPostItem(ev, displayContent);
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === ev.id);
      if (idx === -1) {
        return [newPost, ...prev].sort((a, b) => b.created_at - a.created_at);
      }
      const existing = prev[idx];
      // Se o evento já existia mas chegou uma versão decifrada diferente
      // (ex.: estava guardado criptografado/placeholder), atualiza o conteúdo
      // sem perder as interações já carregadas.
      if (existing.content !== newPost.content || existing.media.length !== newPost.media.length) {
        const next = [...prev];
        next[idx] = {
          ...existing,
          content: newPost.content,
          media: newPost.media,
          isEncrypted: newPost.isEncrypted
        };
        return next;
      }
      return prev;
    });
    return true;
  }, [eventToPostItem, client]);

  // Busca e ingere as postagens de um grupo (tag "h") nos relays, decifrando
  // o conteúdo quando necessário. Usado ao abrir um grupo pela busca, pelo
  // carrossel ou por um link compartilhado.
  const loadGroupPosts = useCallback(async (groupId: string) => {
    let events: NostrEvent[] = [];
    try {
      events = await Promise.race([
        client.fetchEvents([{ kinds: [1], '#h': [groupId], limit: 50 }]),
        new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), 6000))
      ]);
    } catch {}

    if (!events || events.length === 0) return;

    const ids: string[] = [];
    for (const ev of events) {
      let displayContent = ev.content;
      const isEncrypted = ev.content.startsWith('tribee2e:') || ev.content.includes('?iv=');
      if (isEncrypted) {
        try {
          displayContent = await client.decryptDirectMessage(
            ev.content,
            ev.pubkey,
            auth.authMode,
            auth.secretKey,
            auth.pubkey || undefined
          );
        } catch {}
      }
      if (ingestPostEvent(ev, displayContent)) ids.push(ev.id);
    }
    refreshPostInteractions(ids);
  }, [client, auth.authMode, auth.secretKey, auth.pubkey, ingestPostEvent, refreshPostInteractions]);

  // Busca uma postagem por id nos relays e a retorna (SEM ingerir no feed,
  // para não duplicar a postagem embutida como um post separado). Usado pelas
  // referências nostr:nevent/note.
  const loadNote = useCallback(async (id: string): Promise<PostItem | null> => {
    let events: NostrEvent[] = [];
    try {
      events = await Promise.race([
        client.fetchEvents([{ kinds: [1, 6], ids: [id], limit: 1 }]),
        new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), 6000))
      ]);
    } catch {}

    const ev = events && events[0];
    if (!ev) return null;

    ensureProfileLoaded(ev.pubkey);

    return eventToPostItem(ev);
  }, [client, eventToPostItem, ensureProfileLoaded]);

  // Ao selecionar um grupo (pela busca, carrossel ou link compartilhado),
  // busca as postagens dele nos relays para que usuários novos também vejam
  // o conteúdo publicado por outras pessoas no grupo. Sem grupo selecionado
  // (aba Grupos aberta), busca o do primeiro grupo exibido.
  const defaultGroupId = activeTab === 'groups' && groups.length > 0 ? groups[0].id : null;
  const targetGroupId = selectedGroupId || defaultGroupId;

  useEffect(() => {
    if (!targetGroupId) return;
    loadGroupPosts(targetGroupId);
  }, [targetGroupId, loadGroupPosts]);

  // Resolve o link compartilhado (?note=...) buscando o evento diretamente dos relays
  useEffect(() => {
    if (!deepLink.noteId) return;

    setActiveTab('feed');

    client.fetchEvents([{ kinds: [1], ids: [deepLink.noteId], limit: 1 }]).then(async events => {
      if (events && events.length > 0) {
        const ev = events[0];

        if (ev.pubkey !== auth.pubkey) {
          client.fetchUserProfile(ev.pubkey).then(p => {
            if (p) setProfiles(prev => ({ ...prev, [ev.pubkey]: p }));
          });
        }

        setPosts(prev => {
          if (prev.some(p => p.id === ev.id)) return prev;
          return [eventToPostItem(ev), ...prev];
        });
        refreshPostInteractions([ev.id]);
      }
    });
  }, [deepLink.noteId, client, auth.pubkey, eventToPostItem, refreshPostInteractions]);

  // Resolve o link compartilhado de grupo (?group=...) buscando a definição e posts nos relays
  useEffect(() => {
    if (!deepLink.groupId) return;

    setActiveTab('groups');
    const groupId = deepLink.groupId;
    let cancelled = false;
    let attempts = 0;

    // Busca a definição do grupo (kind 34550, NIP-29) pelo id, com timeout e retentativas
    // para garantir que o grupo apareça mesmo se o relay demorar a propagar o evento.
    const fetchGroupDefinition = async () => {
      if (cancelled || groupsRef.current.some(g => g.id === groupId)) return;
      attempts += 1;

      let events: NostrEvent[] = [];
      try {
        events = await Promise.race([
          client.fetchEvents([{ kinds: [34550], '#d': [groupId], limit: 5 }]),
          new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), 6000))
        ]);
      } catch (e) {
        console.error('Erro ao buscar grupo do link:', e);
      }

      if (cancelled) return;

      if (events && events.length > 0) {
        const ev = events[0];
        const group = parseGroupEvent(ev);
        if (group) {
          upsertGroup(group);
          client.fetchUserProfile(ev.pubkey).then(p => {
            if (p) setProfiles(prev => ({ ...prev, [ev.pubkey]: p }));
          });
          return;
        }
      }

      // Se ainda não encontrou, tenta novamente até 5 vezes com intervalo de 4s
      if (!cancelled && attempts < 5 && !groupsRef.current.some(g => g.id === groupId)) {
        setTimeout(fetchGroupDefinition, 4000);
      }
    };

    fetchGroupDefinition();

    return () => {
      cancelled = true;
    };
  }, [deepLink.groupId, client, parseGroupEvent, upsertGroup]);

  // --- Gerenciamento de Amigos / Contatos (Kind 3) ---
  const addFriend = useCallback(async (targetPubkey: string) => {
    if (!targetPubkey) return;
    const cleanPubkey = targetPubkey.startsWith('npub1') ? client.npubToHex(targetPubkey) : targetPubkey;

    let updatedList: string[] = [];
    setFriends(prev => {
      if (prev.includes(cleanPubkey)) {
        updatedList = prev;
        return prev;
      }
      updatedList = [...prev, cleanPubkey];
      try {
        localStorage.setItem('tribe_nostr_friends', JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    if (!fetchedProfilesRef.current.has(cleanPubkey)) {
      fetchedProfilesRef.current.add(cleanPubkey);
      client.fetchUserProfile(cleanPubkey).then(p => {
        if (p) setProfiles(prev => ({ ...prev, [cleanPubkey]: p }));
      });
    }

    // Busca imediatamente postagens recentes do novo amigo nos relays
    client.fetchEvents([{ kinds: [1], authors: [cleanPubkey], limit: 50 }]).then(async events => {
      if (events && events.length > 0) {
        const ids: string[] = [];
        for (const ev of events) {
          let displayContent = ev.content;
          const isEncrypted = ev.content.startsWith('tribee2e:') || ev.content.includes('?iv=');

          if (isEncrypted) {
            try {
              displayContent = await client.decryptDirectMessage(
                ev.content,
                ev.pubkey,
                auth.authMode,
                auth.secretKey,
                auth.pubkey || undefined
              );
            } catch {}
          }

          if (ingestPostEvent(ev, displayContent)) {
            ids.push(ev.id);
          }
        }
        refreshPostInteractions(ids);
      }
    });

    if (auth.pubkey && auth.authMode !== 'none') {
      try {
        const tags = updatedList.map(pk => ['p', pk]);
        await client.signAndSendEvent({
          kind: 3,
          tags,
          content: ''
        }, auth.authMode, auth.secretKey);
      } catch (e) {
        console.error('Erro ao salvar contato Kind 3 nos relays:', e);
      }
    }
  }, [auth.pubkey, auth.authMode, auth.secretKey, client, getProfile, eventToPostItem, refreshPostInteractions, ingestPostEvent]);

  const removeFriend = useCallback(async (targetPubkey: string) => {
    if (!targetPubkey) return;
    const cleanPubkey = targetPubkey.startsWith('npub1') ? client.npubToHex(targetPubkey) : targetPubkey;

    let updatedList: string[] = [];
    setFriends(prev => {
      updatedList = prev.filter(pk => pk !== cleanPubkey);
      try {
        localStorage.setItem('tribe_nostr_friends', JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    if (auth.pubkey && auth.authMode !== 'none') {
      try {
        const tags = updatedList.map(pk => ['p', pk]);
        await client.signAndSendEvent({
          kind: 3,
          tags,
          content: ''
        }, auth.authMode, auth.secretKey);
      } catch (e) {
        console.error('Erro ao remover contato Kind 3 nos relays:', e);
      }
    }
  }, [auth.pubkey, auth.authMode, auth.secretKey, client]);

  const isFriend = useCallback((pubkey: string) => {
    if (!pubkey) return false;
    const cleanPubkey = pubkey.startsWith('npub1') ? client.npubToHex(pubkey) : pubkey;
    return friends.includes(cleanPubkey);
  }, [friends, client]);

  // Função para buscar diretamente dos relays todos os dados/posts/contatos do usuário logado
  const loadUserDataFromRelays = useCallback(async (targetPubkey?: string) => {
    const pubkey = targetPubkey || auth.pubkey;
    if (!pubkey) return;

    try {
      // 1. Busca metadados do perfil (kind 0)
      const userProfile = await client.fetchUserProfile(pubkey);
      if (userProfile && userProfile.name) {
        setProfiles(prev => ({ ...prev, [pubkey]: userProfile }));
        setAuth(prev => ({ ...prev, profile: userProfile }));
        if (pubkey === auth.pubkey) persistOwnProfile(userProfile);
      }

      // 2. Busca lista de contatos / amigos (kind 3) do usuário
      let currentFriends = [...friends];
      const contactEvents = await client.fetchEvents([
        { kinds: [3], authors: [pubkey], limit: 1 }
      ]);

      if (contactEvents && contactEvents.length > 0) {
        const contactPubkeys = contactEvents[0].tags.filter(t => t[0] === 'p').map(t => t[1]);
        if (contactPubkeys.length > 0) {
          currentFriends = Array.from(new Set([...currentFriends, ...contactPubkeys]));
          setFriends(currentFriends);
          try {
            localStorage.setItem('tribe_nostr_friends', JSON.stringify(currentFriends));
          } catch {}
        }
      }

      // Busca os perfis (kind 0) de todos os amigos da lista local e dos contatos kind 3
      const allFriendPubkeys = Array.from(new Set(currentFriends.filter(Boolean)));
      allFriendPubkeys.forEach(fPk => {
        if (fetchedProfilesRef.current.has(fPk)) return;
        fetchedProfilesRef.current.add(fPk);
        client.fetchUserProfile(fPk).then(p => {
          if (p) setProfiles(prev => ({ ...prev, [fPk]: p }));
        });
      });

      // 3. Busca postagens diretas nos relays (kind 1) para o usuário e seus amigos
      const targetAuthors = Array.from(new Set([pubkey, ...currentFriends].filter(Boolean)));
      const events = await client.fetchEvents([
        { kinds: [1], authors: targetAuthors, limit: 150 }
      ]);

      if (events && events.length > 0) {
        const ids: string[] = [];
        for (const ev of events) {
          let displayContent = ev.content;
          const isEncrypted = ev.content.startsWith('tribee2e:') || ev.content.includes('?iv=');

          if (isEncrypted) {
            try {
              displayContent = await client.decryptDirectMessage(
                ev.content, 
                ev.pubkey, 
                auth.authMode, 
                auth.secretKey,
                pubkey
              );
            } catch {}
          }

          if (ingestPostEvent(ev, displayContent)) {
            ids.push(ev.id);
          }
        }
        refreshPostInteractions(ids);
      }

      // 4. Busca mensagens diretas criptografadas (kind 4) nos relays para o pubkey do usuário
      const [dmSent, dmReceived] = await Promise.all([
        client.fetchEvents([{ kinds: [4], authors: [pubkey], limit: 100 }]),
        client.fetchEvents([{ kinds: [4], '#p': [pubkey], limit: 100 }])
      ]);

      const allDms = [...dmSent, ...dmReceived].sort((a, b) => a.created_at - b.created_at);
      for (const ev of allDms) {
        const pTag = ev.tags.find(t => t[0] === 'p')?.[1];
        const otherPubkey = ev.pubkey === pubkey ? pTag : ev.pubkey;

        if (otherPubkey) {
          let decryptedText = ev.content;
          try {
            decryptedText = await client.decryptDirectMessage(
              ev.content,
              otherPubkey,
              auth.authMode,
              auth.secretKey,
              pubkey
            );
          } catch {}

          const chatMsg: ChatMessage = {
            id: ev.id,
            senderPubkey: ev.pubkey,
            receiverPubkey: pTag || '',
            content: decryptedText,
            created_at: ev.created_at,
            isEncrypted: true,
            event: ev
          };

          // Adiciona o amigo à lista
          setFriends(prev => {
            if (prev.includes(otherPubkey)) return prev;
            const updated = [...prev, otherPubkey];
            try {
              localStorage.setItem('tribe_nostr_friends', JSON.stringify(updated));
            } catch {}
            return updated;
          });

          client.fetchUserProfile(otherPubkey).then(p => {
            if (p) setProfiles(prev => ({ ...prev, [otherPubkey]: p }));
          });

          setChats(prev => {
            const existing = prev[otherPubkey] || [];
            if (existing.some(m => m.id === ev.id)) return prev;
            return {
              ...prev,
              [otherPubkey]: [...existing, chatMsg].sort((a, b) => a.created_at - b.created_at)
            };
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário nos relays:', err);
    }
    setChatLoading(false);
  }, [auth.pubkey, auth.authMode, auth.secretKey, client, getProfile, eventToPostItem, refreshPostInteractions, ingestPostEvent]);

  // Carrega ativamente os dados do usuário dos relays ao autenticar
  useEffect(() => {
    if (auth.pubkey) {
      loadUserDataFromRelays(auth.pubkey);
    }
  }, [auth.pubkey, loadUserDataFromRelays]);

  // Quando o app/PWA volta para o primeiro plano (ou ganha foco), re-sincroniza
  // os dados do usuário e a assinatura de push. Também re-inscreve o push
  // periodicamente e quando a Service Worker avisar que a assinatura renovou,
  // garantindo que o servidor sempre tenha a assinatura válida do dispositivo.
  const lastRefetchRef = useRef(0);
  useEffect(() => {
    if (!auth.pubkey) return;

    const onVisible = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastRefetchRef.current < 15000) return;
      lastRefetchRef.current = now;
      loadUserDataFromRelays(auth.pubkey);
      subscribeToPush(auth.pubkey);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'push-renewed') {
        subscribeToPush(auth.pubkey);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    // Mantém a assinatura de push sempre válida no servidor
    const interval = setInterval(() => subscribeToPush(auth.pubkey), 4 * 60 * 1000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMessage);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      }
    };
  }, [auth.pubkey, loadUserDataFromRelays, subscribeToPush]);

  // Busca os perfis (kind 0) dos amigos que ainda não estão carregados no estado profiles
  useEffect(() => {
    if (!auth.pubkey || friends.length === 0) return;

    const missing = friends.filter(pk => pk && !profiles[pk]);
    if (missing.length === 0) return;

    missing.forEach(pk => {
      if (fetchedProfilesRef.current.has(pk)) return;
      fetchedProfilesRef.current.add(pk);
      client.fetchUserProfile(pk).then(p => {
        if (p) setProfiles(prev => ({ ...prev, [pk]: p }));
      });
    });
  }, [friends, profiles, auth.pubkey, client]);

  // Subscrição do Feed e Eventos do Nostr em Tempo Real nos Relays
  useEffect(() => {
    const targetAuthors = Array.from(new Set([auth.pubkey, ...friends].filter(Boolean) as string[]));

    const filters: any[] = [
      { kinds: [1, 0, 7, 6], limit: 60 },
      { kinds: [34550], limit: 50 }
    ];

    if (targetAuthors.length > 0) {
      // Filtros dedicados para carregar todas as postagens, mensagens e perfis do usuário logado e seus amigos
      filters.push({
        kinds: [1, 0, 3, 4, 7, 6],
        authors: targetAuthors,
        limit: 150
      });
      filters.push({
        kinds: [1, 4, 7],
        '#p': targetAuthors,
        limit: 100
      });
      // Filtro dedicado para receber os metadados (kind 0) de todos os amigos
      filters.push({
        kinds: [0],
        authors: targetAuthors,
        limit: targetAuthors.length * 2
      });
    }

    const sub = client.subscribeEvents(
      filters,
      async (event: NostrEvent) => {
        if (event.kind === 0) {
          // Evento de Metadados de Perfil
          try {
            const meta = JSON.parse(event.content);
            // Mescla com o perfil anterior para nunca "apagar" nome/foto já carregados
            // quando um evento kind 0 vier incompleto.
            setProfiles(prev => {
              const prevProf = prev[event.pubkey];
              const merged: UserProfile = {
                pubkey: event.pubkey,
                npub: client.hexToNpub(event.pubkey),
                name: meta.name || meta.display_name || prevProf?.name,
                display_name: meta.display_name || meta.name || prevProf?.display_name,
                about: meta.about || prevProf?.about,
                picture: meta.picture || prevProf?.picture,
                banner: meta.banner || prevProf?.banner,
                nip05: meta.nip05 || prevProf?.nip05,
                lud16: meta.lud16 || prevProf?.lud16
              };
              if (event.pubkey === auth.pubkey) {
                setAuth(prevAuth => ({ ...prevAuth, profile: merged }));
                persistOwnProfile(merged);
              }
              return { ...prev, [event.pubkey]: merged };
            });
          } catch {}
        } else if (event.kind === 3 && auth.pubkey && event.pubkey === auth.pubkey) {
          // Evento de Lista de Contatos (Kind 3)
          const contactPubkeys = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
          if (contactPubkeys.length > 0) {
            setFriends(prev => {
              const next = Array.from(new Set([...prev, ...contactPubkeys]));
              try {
                localStorage.setItem('tribe_nostr_friends', JSON.stringify(next));
              } catch {}
              return next;
            });
            contactPubkeys.forEach(fPk => {
              client.fetchUserProfile(fPk).then(p => {
                if (p) setProfiles(prev => ({ ...prev, [fPk]: p }));
              });
            });
          }
        } else if (event.kind === 4) {
          // Evento de Mensagem Direta Criptografada (Kind 4 DM)
          const pTag = event.tags.find(t => t[0] === 'p')?.[1];
          const otherPubkey = auth.pubkey && event.pubkey === auth.pubkey ? pTag : event.pubkey;

          if (otherPubkey) {
            let decryptedText = event.content;
            try {
              decryptedText = await client.decryptDirectMessage(
                event.content,
                otherPubkey,
                auth.authMode,
                auth.secretKey,
                auth.pubkey || undefined
              );
            } catch {}

            const chatMsg: ChatMessage = {
              id: event.id,
              senderPubkey: event.pubkey,
              receiverPubkey: pTag || '',
              content: decryptedText,
              created_at: event.created_at,
              isEncrypted: true,
              event
            };

            // Adiciona automaticamente o amigo à lista ao receber mensagem
            setFriends(prev => {
              if (prev.includes(otherPubkey)) return prev;
              const updated = [...prev, otherPubkey];
              try {
                localStorage.setItem('tribe_nostr_friends', JSON.stringify(updated));
              } catch {}
              return updated;
            });

            client.fetchUserProfile(otherPubkey).then(p => {
              if (p) setProfiles(prev => ({ ...prev, [otherPubkey]: p }));
            });

            setChats(prev => {
              const existing = prev[otherPubkey] || [];
              if (existing.some(m => m.id === event.id)) return prev;
              return {
                ...prev,
                [otherPubkey]: [...existing, chatMsg].sort((a, b) => a.created_at - b.created_at)
              };
            });

            // Notificação para mensagens recebidas de outros usuários
            if (event.pubkey !== auth.pubkey) {
              const senderProfile = getProfile(event.pubkey);
              const senderName = senderProfile.display_name || senderProfile.name || 'Um amigo';

              // Dispara a notificação push via servidor (caminho confiável,
              // funciona mesmo que a notificação da página seja suprimida).
              try {
                fetch('/api/push/send', {
                  method: 'POST',
                  cache: 'no-store',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pubkey: auth.pubkey,
                    senderPubkey: event.pubkey,
                    senderName
                  })
                });
              } catch {}

              setLatestNotification({
                id: event.id,
                title: `Nova mensagem de ${senderName}`,
                body: decryptedText.length > 60 ? decryptedText.slice(0, 60) + '...' : decryptedText,
                senderPubkey: event.pubkey
              });

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const notifTitle = `Mensagem de ${senderName}`;
                const notifUrl = `/?chat=${encodeURIComponent(event.pubkey)}`;

                const showInPageNotification = () => {
                  try {
                    const notif = new Notification(notifTitle, {
                      body: decryptedText,
                      tag: `dm-${event.pubkey}`
                    });
                    notif.onclick = () => {
                      window.focus();
                      try {
                        localStorage.setItem('tribe_pending_chat', event.pubkey);
                      } catch {}
                      setActiveChatPubkey(event.pubkey);
                      setActiveTab('friends');
                      setLatestNotification({
                        id: event.id,
                        title: notifTitle,
                        body: decryptedText.length > 60 ? decryptedText.slice(0, 60) + '...' : decryptedText,
                        senderPubkey: event.pubkey
                      });
                      notif.close();
                    };
                  } catch {}
                };

                try {
                  if ('serviceWorker' in navigator) {
                    // Aguarda a Service Worker ficar pronta e entrega a notificação
                    // a ela (funciona mesmo que a página ainda não esteja sob
                    // controle da SW; o Chrome/Windows não suprime notificações
                    // de SW quando a aba está em foco).
                    navigator.serviceWorker.ready
                      .then(reg => {
                        if (reg.active) {
                          reg.active.postMessage({
                            type: 'notify',
                            title: notifTitle,
                            body: decryptedText,
                            tag: `dm-${event.pubkey}`,
                            url: notifUrl
                          });
                        } else {
                          showInPageNotification();
                        }
                      })
                      .catch(() => showInPageNotification());
                  } else {
                    showInPageNotification();
                  }
                } catch {
                  showInPageNotification();
                }
              }
            }
          }
        } else if (event.kind === 34550) {
          // Evento de Definição de Comunidade/Grupo (NIP-29)
          const group = parseGroupEvent(event);
          if (group) {
            upsertGroup(group);
            client.fetchUserProfile(event.pubkey).then(p => {
              if (p) setProfiles(prev => ({ ...prev, [event.pubkey]: p }));
            });
          }
        } else if (event.kind === 7) {
          // Evento de Reação / Curtida (NIP-25)
          const eTag = event.tags.find(t => t[0] === 'e')?.[1];
          if (!eTag) return;

          const likes = interactionsRef.current.likes[eTag] || (interactionsRef.current.likes[eTag] = new Set());
          likes.add(event.pubkey);

          setPosts(prev => prev.map(p => p.id === eTag ? {
            ...p,
            likesCount: likes.size,
            userLiked: event.pubkey === auth.pubkey ? true : p.userLiked
          } : p));
        } else if (event.kind === 6) {
          // Evento de Repost (NIP-18)
          const eTag = event.tags.find(t => t[0] === 'e')?.[1];
          if (!eTag) return;

          const reposts = interactionsRef.current.reposts[eTag] || (interactionsRef.current.reposts[eTag] = new Set());
          reposts.add(event.pubkey);

          setPosts(prev => prev.map(p => p.id === eTag ? {
            ...p,
            repostsCount: reposts.size,
            userReposted: event.pubkey === auth.pubkey ? true : p.userReposted
          } : p));

          // Adiciona o repost como uma postagem no feed (estilo Twitter):
          // autor = quem repostou, com o original embutido em "repostOf".
          const repostItem = eventToPostItem(event);
          // Busca o perfil do autor da postagem original (tag "p") para
          // mostrar o nome real no cartão embutido do repost.
          const originalAuthor = event.tags.find(t => t[0] === 'p')?.[1];
          if (originalAuthor) ensureProfileLoaded(originalAuthor);
          setPosts(prev => {
            if (prev.some(p => p.id === event.id)) return prev;
            return [repostItem, ...prev].sort((a, b) => b.created_at - a.created_at);
          });
        } else if (event.kind === 1) {
          // Evento de Post ou Resposta/Comentário
          let displayContent = event.content;
          const isEncrypted = event.content.startsWith('tribee2e:') || event.content.includes('?iv=');

          if (isEncrypted) {
            try {
              displayContent = await client.decryptDirectMessage(
                event.content, 
                event.pubkey, 
                auth.authMode, 
                auth.secretKey,
                auth.pubkey || undefined
              );
            } catch {}
          }

          ingestPostEvent(event, displayContent);
        }
      }
    );

    return () => {
      sub?.close();
    };
  }, [client, getProfile, auth.pubkey, auth.authMode, auth.secretKey, relays, friends, eventToPostItem, ingestPostEvent, parseGroupEvent, upsertGroup]);

  // --- Métodos de Login / Conta ---
  const loginWithExtension = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.nostr) {
      alert(t('noExtensionAlert'));
      return false;
    }
    try {
      const pubkey = await window.nostr.getPublicKey();
      const npub = client.hexToNpub(pubkey);
      const profile = await client.fetchUserProfile(pubkey);

      // Se o relay ainda não retornou o kind 0, reutiliza o perfil em cache da mesma conta
      let finalProfile = profile || undefined;
      if (!finalProfile) {
        try {
          const ownProfile = localStorage.getItem(LOCAL_STORAGE_OWN_PROFILE);
          if (ownProfile) {
            const parsed = JSON.parse(ownProfile);
            if (parsed && parsed.pubkey === pubkey) finalProfile = parsed;
          }
        } catch {}
      }

      const newAuth: AuthState = {
        pubkey,
        npub,
        authMode: 'extension',
        profile: finalProfile
      };

      setAuth(newAuth);
      localStorage.setItem(LOCAL_STORAGE_AUTH, JSON.stringify({
        pubkey,
        npub,
        authMode: 'extension'
      }));
      if (finalProfile) persistOwnProfile(finalProfile);

      loadUserDataFromRelays(pubkey);

      setShowAuthModal(false);
      return true;
    } catch (err) {
      console.error('Erro ao conectar com a extensão:', err);
      alert('A autorização da extensão foi cancelada.');
      return false;
    }
  };

  const loginWithNsec = (nsecOrHex: string): boolean => {
    const decoded = client.decodeNsec(nsecOrHex);
    if (!decoded) {
      alert('Chave nsec ou hex inválida. Por favor, verifique a chave digitada.');
      return false;
    }

    const { skBytes, skHex, pubkeyHex, npub } = decoded;

    // Reutiliza o perfil em cache da mesma conta (se existir) para exibir nome/foto imediatamente
    let cachedProfile;
    try {
      const ownProfile = localStorage.getItem(LOCAL_STORAGE_OWN_PROFILE);
      if (ownProfile) {
        const parsed = JSON.parse(ownProfile);
        if (parsed && parsed.pubkey === pubkeyHex) cachedProfile = parsed;
      }
    } catch {}

    const newAuth: AuthState = {
      pubkey: pubkeyHex,
      secretKey: skBytes,
      nsec: nsecOrHex.startsWith('nsec1') ? nsecOrHex : undefined,
      npub,
      authMode: 'nsec',
      profile: cachedProfile
    };

    setAuth(newAuth);
    localStorage.setItem(LOCAL_STORAGE_AUTH, JSON.stringify({
      pubkey: pubkeyHex,
      npub,
      authMode: 'nsec',
      secretKeyHex: skHex
    }));

    loadUserDataFromRelays(pubkeyHex);

    setShowAuthModal(false);
    return true;
  };

  const createAccount = () => {
    // Gera o par de chaves e apenas retorna para o usuário salvar.
    // NÃO faz login automaticamente, senão a tela de visualização das
    // chaves seria desmontada na hora (o app trocaria para a área logada).
    const { nsec, npub, skHex } = client.generateKeypair();
    return { nsec, npub, skHex };
  };

  const logout = () => {
    const prevPubkey = auth.pubkey;

    // Remove a assinatura de push do dispositivo para a conta que está saindo
    try {
      fetch('/api/push/unsubscribe', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: prevPubkey })
      });
    } catch {}

    setAuth({
      pubkey: '',
      npub: '',
      authMode: 'none'
    });

    // Limpa todo o localStorage da página para que a próxima conta entre limpa,
    // sem herdar amigos, posts, grupos, mensagens ou configurações da anterior.
    try {
      localStorage.clear();
    } catch {}

    // Zera também o estado em memória para não vazar dados entre contas
    setFriends([]);
    setPosts([]);
    setGroups([]);
    setProfiles({});
    setChats({});
    setChatLoading(false);
    setLatestNotification(null);
    setViewProfilePubkeyState(null);
    setPushEnabled(false);
    setActiveChatPubkey(null);
    setSelectedGroupId(null);
    fetchedProfilesRef.current = new Set();
    interactionsRef.current = { likes: {}, reposts: {}, replies: {} };
    joinedIdsRef.current = new Set();
    lastReadRef.current = {};
    try {
      if (prevPubkey) localStorage.removeItem(`tribe_nostr_lastread_${prevPubkey}`);
    } catch {}
  };

  const updateProfile = async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return false;
    }

    const updated: UserProfile = {
      pubkey: auth.pubkey,
      npub: auth.npub,
      ...auth.profile,
      ...profileData
    };

    const metadataContent = JSON.stringify({
      name: updated.name || '',
      display_name: updated.display_name || '',
      about: updated.about || '',
      picture: updated.picture || '',
      banner: updated.banner || '',
      nip05: updated.nip05 || '',
      lud16: updated.lud16 || ''
    });

    try {
      await client.signAndSendEvent({
        kind: 0,
        tags: [],
        content: metadataContent
      }, auth.authMode, auth.secretKey);

      setAuth(prev => ({ ...prev, profile: updated }));
      setProfiles(prev => ({ ...prev, [auth.pubkey]: updated }));
      persistOwnProfile(updated);
      return true;
    } catch (e) {
      console.error('Erro ao atualizar perfil:', e);
      return false;
    }
  };

  // --- Gerenciamento de Relays ---
  const addRelay = (url: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('ws://') && !cleanUrl.startsWith('wss://')) {
      cleanUrl = 'wss://' + cleanUrl;
    }
    if (relays.some(r => r.url === cleanUrl)) return;

    const newRelays: RelayConfig[] = [...relays, { url: cleanUrl, read: true, write: true, status: 'connecting' }];
    setRelays(newRelays);
    localStorage.setItem(LOCAL_STORAGE_RELAYS, JSON.stringify(newRelays));
  };

  const removeRelay = (url: string) => {
    const newRelays = relays.filter(r => r.url !== url);
    setRelays(newRelays);
    localStorage.setItem(LOCAL_STORAGE_RELAYS, JSON.stringify(newRelays));
  };

  const toggleRelay = (url: string) => {
    const newRelays = relays.map(r => r.url === url ? { ...r, read: !r.read, write: !r.write } : r);
    setRelays(newRelays);
    localStorage.setItem(LOCAL_STORAGE_RELAYS, JSON.stringify(newRelays));
  };

  // --- Criação de Post & Mídia ---
  const createPost = async (
    content: string, 
    mediaUrls: string[] = [], 
    groupId?: string, 
    isReel?: boolean, 
    isEncrypted?: boolean
  ): Promise<boolean> => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return false;
    }

    let finalContent = content;
    if (mediaUrls.length > 0) {
      finalContent += '\n' + mediaUrls.join('\n');
    }

    if (isEncrypted && auth.pubkey) {
      finalContent = await client.encryptPost(finalContent, auth.pubkey);
    }

    const tags: string[][] = [];
    if (groupId) {
      tags.push(['h', groupId]);
      tags.push(['a', `34550:${groupId}`]);
    }
    if (isReel) {
      tags.push(['t', 'reel']);
    }

    try {
      const signedEvent = await client.signAndSendEvent({
        kind: 1,
        tags,
        content: finalContent
      }, auth.authMode, auth.secretKey);

      if (signedEvent) {
        const { textWithoutMedia, media } = extractMediaUrls(content);
        const newPost: PostItem = {
          id: signedEvent.id,
          pubkey: auth.pubkey,
          author: auth.profile || getProfile(auth.pubkey),
          created_at: signedEvent.created_at,
          content: textWithoutMedia.length > 0 ? textWithoutMedia : (media.length > 0 || mediaUrls.length > 0 ? '' : content),
          tags,
          kind: 1,
          event: signedEvent,
          likesCount: 0,
          userLiked: false,
          repostsCount: 0,
          userReposted: false,
          repliesCount: 0,
          media: [
            ...mediaUrls.map(u => ({ url: u, type: (isReel ? 'video' : 'image') as 'image' | 'video' | 'audio' })),
            ...media
          ],
          isEncrypted: !!isEncrypted,
          groupId,
          isReel
        };

        setPosts(prev => {
          // Deduplica pelo id para que um post criado nunca apareça duplicado
          // (mesmo se for re-ingerido pelo relay na sequência).
          const next = prev.filter(p => p.id !== newPost.id);
          return [newPost, ...next].sort((a, b) => b.created_at - a.created_at);
        });
        return true;
      }
    } catch (e) {
      console.error('Erro ao publicar post:', e);
    }
    return false;
  };

  // Likes (NIP-25 Kind 7)
  const likePost = async (post: PostItem) => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return;
    }

    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        const userLiked = !p.userLiked;
        return {
          ...p,
          userLiked,
          likesCount: userLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
        };
      }
      return p;
    }));

    try {
      await client.signAndSendEvent({
        kind: 7,
        // NIP-25: tag "e" para o post e tag "p" para o AUTOR do post
        tags: [['e', post.id], ['p', post.pubkey]],
        content: '❤️'
      }, auth.authMode, auth.secretKey);
    } catch (e) {
      console.error('Erro ao curtir post:', e);
    }
  };

  // Repost (NIP-18 Kind 6)
  const repostPost = async (post: PostItem) => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return;
    }

    // Mantém o contador consistente com o conjunto de reposters (Set),
    // evitando contagem duplicada entre o otimista e o real.
    const reps = interactionsRef.current.reposts[post.id] || (interactionsRef.current.reposts[post.id] = new Set());
    reps.add(auth.pubkey);

    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          userReposted: true,
          repostsCount: reps.size
        };
      }
      return p;
    }));

    ensureProfileLoaded(post.pubkey);

    try {
      await client.signAndSendEvent({
        kind: 6,
        tags: [['e', post.id], ['p', post.pubkey]],
        content: JSON.stringify(post.event)
      }, auth.authMode, auth.secretKey);
    } catch (e) {
      console.error('Erro ao repostar:', e);
    }
  };

  // Comentar (Kind 1 com tag "e" apontando para o post original)
  const commentPost = async (postId: string, content: string, parentPubkey?: string): Promise<boolean> => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return false;
    }

    const tags: string[][] = [
      ['e', postId, '', 'root']
    ];
    if (parentPubkey && parentPubkey !== auth.pubkey) {
      tags.push(['p', parentPubkey]);
    }

    try {
      const signedEvent = await client.signAndSendEvent({
        kind: 1,
        tags,
        content
      }, auth.authMode, auth.secretKey);

      if (signedEvent) {
        const replyItem = eventToPostItem(signedEvent, content);
        const list = interactionsRef.current.replies[postId] || (interactionsRef.current.replies[postId] = []);
        if (!list.some(r => r.id === signedEvent.id)) {
          list.push(replyItem);
        }
        setPosts(prev => prev.map(p => p.id === postId ? {
          ...p,
          repliesCount: list.length,
          replies: [...list]
        } : p));
        return true;
      }
    } catch (e) {
      console.error('Erro ao comentar no post:', e);
    }
    return false;
  };

  // Excluir Postagem (NIP-09 Kind 5)
  const deletePost = async (postId: string): Promise<boolean> => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return false;
    }

    try {
      await client.signAndSendEvent({
        kind: 5,
        tags: [['e', postId]],
        content: 'Solicitação de remoção de post pelo autor'
      }, auth.authMode, auth.secretKey);

      setPosts(prev => prev.filter(p => p.id !== postId));
      return true;
    } catch (e) {
      console.error('Erro ao solicitar exclusão:', e);
      return false;
    }
  };

  // --- Grupos & Moderação ---
  const createGroup = async (
    name: string, 
    description: string, 
    picture?: string, 
    banner?: string
  ): Promise<TribeGroup> => {
    const groupId = 'group-' + Math.random().toString(36).slice(2, 9);
    const newGroup: TribeGroup = {
      id: groupId,
      name,
      description,
      picture: picture || DEFAULT_GROUP_PICTURE,
      banner: banner || DEFAULT_GROUP_BANNER,
      creatorPubkey: auth.pubkey || 'system',
      moderators: [auth.pubkey || 'system'],
      created_at: Math.floor(Date.now() / 1000)
    };

    setGroups(prev => [newGroup, ...prev]);

    // Publica a definição do grupo nos relays como evento kind 34550 (NIP-29)
    if (auth.pubkey && auth.authMode !== 'none') {
      try {
        const tags: string[][] = [
          ['d', groupId],
          ['name', name],
          ['description', description]
        ];
        if (picture) tags.push(['picture', picture]);
        if (banner) tags.push(['banner', banner]);

        const published = await client.signAndSendEvent({
          kind: 34550,
          tags,
          content: JSON.stringify({
            name,
            description,
            picture: newGroup.picture,
            banner: newGroup.banner
          })
        }, auth.authMode, auth.secretKey);

        if (published) {
          console.log(`Grupo "${name}" (${groupId}) publicado nos relays.`);
        }
      } catch (e) {
        console.error('Erro ao publicar grupo nos relays:', e);
      }
    }

    // Quem cria automaticamente "entra" no grupo
    joinGroup(groupId);

    return newGroup;
  };

  // Atualiza as informações do grupo e república a definição (kind 34550) nos relays
  const updateGroup = async (groupId: string, data: Partial<TribeGroup>): Promise<boolean> => {
    const existing = groupsRef.current.find(g => g.id === groupId);
    if (!existing) return false;

    const updated: TribeGroup = {
      ...existing,
      ...data,
      moderators: data.moderators || existing.moderators
    };

    setGroups(prev => prev.map(g => g.id === groupId ? updated : g));

    if (auth.pubkey && auth.authMode !== 'none') {
      try {
        const tags: string[][] = [
          ['d', groupId],
          ['name', updated.name],
          ['description', updated.description]
        ];
        if (updated.picture) tags.push(['picture', updated.picture]);
        if (updated.banner) tags.push(['banner', updated.banner]);
        // Moderadores marcados como tag "p" com marcador "moderator" (NIP-29)
        updated.moderators.forEach(pk => {
          if (pk) tags.push(['p', pk, '', 'moderator']);
        });

        await client.signAndSendEvent({
          kind: 34550,
          tags,
          content: JSON.stringify({
            name: updated.name,
            description: updated.description,
            picture: updated.picture,
            banner: updated.banner
          })
        }, auth.authMode, auth.secretKey);
      } catch (e) {
        console.error('Erro ao atualizar grupo nos relays:', e);
      }
    }

    return true;
  };

  // Sai do grupo: remove da lista de "grupos que entrei" da conta e guarda como "saído"
  const leaveGroup = useCallback((groupId: string) => {
    const group = groupsRef.current.find(g => g.id === groupId);

    joinedIdsRef.current.delete(groupId);
    setJoinedGroupIds(prev => {
      const next = prev.filter(g => g !== groupId);
      const pubkey = authPubkeyRef.current;
      if (pubkey) {
        try {
          localStorage.setItem(`tribe_nostr_joined_groups_${pubkey}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    setLeftGroups(prev => {
      if (prev.some(g => g.id === groupId)) return prev;
      const next = group ? [...prev, group] : prev;
      const pubkey = authPubkeyRef.current;
      if (pubkey) {
        try {
          localStorage.setItem(`tribe_nostr_left_groups_${pubkey}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Reentra em um grupo do qual o usuário tinha saído (busca a definição atualizada nos relays)
  const rejoinGroup = useCallback((groupId: string) => {
    joinGroup(groupId);

    client.fetchEvents([{ kinds: [34550], '#d': [groupId], limit: 5 }]).then(events => {
      if (events && events.length > 0) {
        const group = parseGroupEvent(events[0]);
        if (group) upsertGroup(group);
      }
    });
  }, [client, parseGroupEvent, upsertGroup, joinGroup]);

  // Carrega os grupos (kind 34550) diretamente dos relays, para que criados no passado
  // voltem mesmo após limpar o cache do navegador (sem depender só da subscription/localStorage).
  const loadGroupsFromRelays = useCallback(async () => {
    try {
      const [recentGroups, myGroups] = await Promise.all([
        Promise.race([
          client.fetchEvents([{ kinds: [34550], limit: 100 }]),
          new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), 8000))
        ]),
        auth.pubkey
          ? Promise.race([
              client.fetchEvents([{ kinds: [34550], authors: [auth.pubkey], limit: 100 }]),
              new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), 8000))
            ])
          : Promise.resolve([])
      ]);

      const seen = new Set<string>();
      for (const ev of [...(myGroups || []), ...(recentGroups || [])]) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        const group = parseGroupEvent(ev);
        if (group) upsertGroup(group);
      }
    } catch (e) {
      console.error('Erro ao carregar grupos dos relays:', e);
    }
  }, [client, auth.pubkey, parseGroupEvent, upsertGroup]);

  // Carrega os grupos ao montar o app e novamente após autenticar/alternar conta
  useEffect(() => {
    loadGroupsFromRelays();
  }, [loadGroupsFromRelays]);

  const deleteGroupPostModeration = async (groupId: string, postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // --- Chat Criptografado E2EE ---
  const sendDirectMessage = async (receiverPubkey: string, text: string, mediaUrl?: string): Promise<boolean> => {
    if (!auth.pubkey || auth.authMode === 'none') {
      setShowAuthModal(true);
      return false;
    }

    let fullText = text;
    if (mediaUrl) fullText += '\n' + mediaUrl;

    try {
      const encrypted = await client.encryptDirectMessage(
        fullText, 
        receiverPubkey, 
        auth.authMode, 
        auth.secretKey, 
        auth.pubkey
      );

      const event = await client.signAndSendEvent({
        kind: 4,
        tags: [['p', receiverPubkey]],
        content: encrypted
      }, auth.authMode, auth.secretKey);

      if (event) {
        // "Acorda" o servidor (Wasmer hiberna quando ocioso) para que ele
        // detecte a DM nos relays e entregue a notificação push ao destinatário.
        try {
          fetch('/api/push/ping', { method: 'POST', cache: 'no-store' });
        } catch {}

        // Adiciona o amigo automaticamente à lista ao mandar mensagem
        addFriend(receiverPubkey);

        const msg: ChatMessage = {
          id: event.id,
          senderPubkey: auth.pubkey,
          receiverPubkey,
          content: fullText,
          created_at: event.created_at,
          isEncrypted: true,
          mediaUrl,
          event
        };

        setChats(prev => ({
          ...prev,
          [receiverPubkey]: [...(prev[receiverPubkey] || []), msg]
        }));

        return true;
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem E2EE:', e);
    }
    return false;
  };

  return (
    <NostrContext.Provider
      value={{
        auth,
        loginWithExtension,
        loginWithNsec,
        createAccount,
        logout,
        updateProfile,

        client,
        relays,
        addRelay,
        removeRelay,
        toggleRelay,
        autoReconnect,
        toggleAutoReconnect,
        reconnectRelays,
        isReconnecting,

        activeTab,
        setActiveTab,

        viewProfilePubkey,
        setViewProfilePubkey,

        selectedGroupId,
        setSelectedGroupId,

        posts,
        createPost,
        likePost,
        repostPost,
        commentPost,
        deletePost,
        loadNote,

        groups,
        createGroup,
        updateGroup,
        leaveGroup,
        rejoinGroup,
        joinGroup,
        joinedGroupIds,
        leftGroups,
        deleteGroupPostModeration,

        friends,
        addFriend,
        removeFriend,
        isFriend,

        chats,
        activeChatPubkey: activeChatPubkeyState,
        setActiveChatPubkey,
        chatLoading,
        sendDirectMessage,

        unreadChats,
        totalUnreadMessages,
        latestNotification,
        clearNotification,
        requestNotificationPermission,
        pushEnabled,

        profiles,
        getProfile,

        deepLink,
        setDeepLink,
        getShareableUrl,

        pwaPrompt,
        triggerPwaInstall,
        isMobile,
        pwaInstalled,

        showAuthModal,
        setShowAuthModal
      }}
    >
      {children}
    </NostrContext.Provider>
  );
};

export const useNostr = () => {
  const context = useContext(NostrContext);
  if (!context) {
    throw new Error('useNostr deve ser usado dentro de um NostrProvider');
  }
  return context;
};
