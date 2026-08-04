export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UserProfile {
  pubkey: string;
  npub: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  created_at?: number;
}

export type AuthMode = 'extension' | 'nsec' | 'npub' | 'none';

export interface AuthState {
  pubkey: string;
  secretKey?: string; // hex string of private key if logged in via nsec
  nsec?: string; // nsec1...
  npub: string; // npub1...
  authMode: AuthMode;
  profile?: UserProfile;
}

export interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  alt?: string;
}

export interface PostItem {
  id: string;
  pubkey: string;
  author?: UserProfile;
  created_at: number;
  content: string;
  decryptedContent?: string;
  tags: string[][];
  kind: number;
  event: NostrEvent;
  
  // Interações
  likesCount: number;
  userLiked: boolean;
  repostsCount: number;
  userReposted: boolean;
  repliesCount: number;
  replies?: PostItem[];
  
  // Conteúdo enriquecido
  media: MediaAttachment[];
  isEncrypted: boolean;
  groupId?: string;
  isReel?: boolean;

  // Repost (NIP-18 kind 6): a postagem original embutida (estilo Twitter)
  repostOf?: PostItem;
}

export interface ChatMessage {
  id: string;
  senderPubkey: string;
  receiverPubkey: string;
  content: string;
  created_at: number;
  isEncrypted: boolean;
  mediaUrl?: string;
  event?: NostrEvent;
}

export interface TribeGroup {
  id: string; // unique group identifier e.g. "tribe-brasil" or "tecnologia"
  name: string;
  description: string;
  picture?: string;
  banner?: string;
  creatorPubkey: string;
  moderators: string[];
  created_at: number;
  pinnedPostIds?: string[];
  rules?: string[];
}

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latencyMs?: number;
}

export type TabType = 'feed' | 'friends' | 'reels' | 'groups' | 'profile' | 'relays';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  senderPubkey: string;
}

export interface DeepLinkParams {
  noteId?: string;
  pubkey?: string;
  groupId?: string;
  reelId?: string;
  chatPubkey?: string;
}
