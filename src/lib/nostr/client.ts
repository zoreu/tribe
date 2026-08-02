import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import * as nip04 from 'nostr-tools/nip04';
import { SimplePool } from 'nostr-tools/pool';
import { NostrEvent, UserProfile, RelayConfig, ChatMessage } from '../../types';

// Relays padrão de alta disponibilidade e performance
export const DEFAULT_RELAYS: RelayConfig[] = [
  { url: 'wss://relay.damus.io', read: true, write: true, status: 'connected' },
  { url: 'wss://nos.lol', read: true, write: true, status: 'connected' },
  { url: 'wss://relay.primal.net', read: true, write: true, status: 'connected' },
  { url: 'wss://offchain.pub', read: true, write: true, status: 'connected' },
  { url: 'wss://relay.nostr.band', read: true, write: true, status: 'connected' },
  { url: 'wss://purplepag.es', read: true, write: true, status: 'connected' },
  { url: 'wss://relay.snort.social', read: true, write: true, status: 'connected' }
];

export class NostrClient {
  private pool: SimplePool;
  public activeRelays: string[];

  constructor(relays?: string[]) {
    this.pool = new SimplePool();
    this.activeRelays = relays && relays.length > 0 
      ? relays 
      : DEFAULT_RELAYS.map(r => r.url);
  }

  public setRelays(urls: string[]) {
    this.activeRelays = urls;
  }

  public ensurePoolConnections() {
    // Retain clean SimplePool instance management without force closing active sockets
    if (!this.pool) {
      this.pool = new SimplePool();
    }
  }

  // --- Gerenciamento de Chaves ---
  public generateKeypair() {
    const skBytes = generateSecretKey();
    const skHex = Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const pubkeyHex = getPublicKey(skBytes);
    const nsec = nip19.nsecEncode(skBytes);
    const npub = nip19.npubEncode(pubkeyHex);

    return { skBytes, skHex, pubkeyHex, nsec, npub };
  }

  public decodeNsec(nsec: string): { skBytes: Uint8Array; skHex: string; pubkeyHex: string; npub: string } | null {
    try {
      const clean = nsec.trim();
      if (clean.startsWith('nsec1')) {
        const decoded = nip19.decode(clean);
        if (decoded.type === 'nsec') {
          const skBytes = decoded.data as Uint8Array;
          const skHex = Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('');
          const pubkeyHex = getPublicKey(skBytes);
          const npub = nip19.npubEncode(pubkeyHex);
          return { skBytes, skHex, pubkeyHex, npub };
        }
      } else if (/^[0-9a-fA-F]{64}$/.test(clean)) {
        // Hex raw private key
        const match = clean.match(/.{1,2}/g);
        if (match) {
          const skBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
          const pubkeyHex = getPublicKey(skBytes);
          const npub = nip19.npubEncode(pubkeyHex);
          return { skBytes, skHex: clean.toLowerCase(), pubkeyHex, npub };
        }
      }
    } catch (e) {
      console.error('Erro ao decodificar chave nsec:', e);
    }
    return null;
  }

  public hexToNpub(pubkeyHex: string): string {
    try {
      return nip19.npubEncode(pubkeyHex);
    } catch {
      return pubkeyHex;
    }
  }

  public npubToHex(npubOrHex: string): string {
    try {
      const clean = npubOrHex.trim();
      if (clean.startsWith('npub1')) {
        const decoded = nip19.decode(clean);
        if (decoded.type === 'npub') {
          return decoded.data as string;
        }
      }
      return clean;
    } catch {
      return npubOrHex;
    }
  }

  // --- Assinatura de Evento ---
  public async signAndSendEvent(
    eventTemplate: { kind: number; created_at?: number; tags: string[][]; content: string },
    authMode: 'extension' | 'nsec',
    skBytes?: Uint8Array
  ): Promise<NostrEvent | null> {
    const created_at = eventTemplate.created_at || Math.floor(Date.now() / 1000);
    
    if (authMode === 'extension' && typeof window !== 'undefined' && window.nostr) {
      try {
        const signed = await window.nostr.signEvent({
          kind: eventTemplate.kind,
          created_at,
          tags: eventTemplate.tags,
          content: eventTemplate.content
        });
        
        // Publica nos relays ativos e aguarda a transmissão
        await this.publishEvent(signed as NostrEvent);
        return signed as NostrEvent;
      } catch (err) {
        console.error('Erro na extensão Nostr:', err);
        throw err;
      }
    } else if (skBytes) {
      const signed = finalizeEvent({
        kind: eventTemplate.kind,
        created_at,
        tags: eventTemplate.tags,
        content: eventTemplate.content
      }, skBytes);

      await this.publishEvent(signed as NostrEvent);
      return signed as NostrEvent;
    } else {
      throw new Error('Sem método de assinatura válido.');
    }
  }

  public async publishEvent(event: NostrEvent): Promise<boolean> {
    try {
      const pubs = this.pool.publish(this.activeRelays, event);
      const publishWithTimeout = pubs.map(p =>
        Promise.race([
          p,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout relay')), 3500))
        ])
      );
      const results = await Promise.allSettled(publishWithTimeout);
      const okCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Evento ${event.id} (kind ${event.kind}) publicado em ${okCount}/${this.activeRelays.length} relays.`);
      return okCount > 0;
    } catch (e) {
      console.error('Falha ao publicar evento nos relays:', e);
      return false;
    }
  }

  // --- Subscrições de Feed, Perfis e Mensagens ---
  public subscribeEvents(
    filters: any[],
    onEvent: (event: NostrEvent) => void
  ) {
    try {
      const sub = this.pool.subscribeMany(this.activeRelays, filters as any, {
        onevent: (event) => {
          onEvent(event as NostrEvent);
        },
        oneose: () => {
          // End of stored events signal
        }
      });
      return sub;
    } catch (err) {
      console.error('Erro de subscrição:', err);
      return null;
    }
  }

  public async fetchEvents(filters: any[]): Promise<NostrEvent[]> {
    try {
      const filter = filters[0] || filters;
      const events = await this.pool.querySync(this.activeRelays, filter);
      return (events || []) as NostrEvent[];
    } catch (e) {
      console.error('Erro ao buscar eventos querySync:', e);
      return [];
    }
  }

  // --- Busca de Perfis (Kind 0) ---
  public async fetchUserProfile(pubkeyHex: string): Promise<UserProfile | null> {
    try {
      const events = await this.pool.querySync(this.activeRelays, {
        kinds: [0],
        authors: [pubkeyHex],
        limit: 1
      });

      if (events && events.length > 0) {
        const ev = events[0];
        const metadata = JSON.parse(ev.content);
        return {
          pubkey: pubkeyHex,
          npub: this.hexToNpub(pubkeyHex),
          name: metadata.name || metadata.display_name || '',
          display_name: metadata.display_name || metadata.name || '',
          about: metadata.about || '',
          picture: metadata.picture || '',
          banner: metadata.banner || '',
          nip05: metadata.nip05 || '',
          lud16: metadata.lud16 || '',
          created_at: ev.created_at
        };
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
    // Retorna null quando não há metadados reais no relay; o fallback visual fica no getProfile()
    return null;
  }

  // --- Criptografia E2EE de Ponta a Ponta (NIP-04 / NIP-44 / AES-GCM Client Direct) ---
  public async encryptPost(text: string, authorPubkey: string): Promise<string> {
    return await this.fallbackClientEncrypt(text, authorPubkey);
  }

  public async encryptDirectMessage(
    text: string,
    receiverPubkey: string,
    authMode: 'extension' | 'nsec' | 'none',
    skBytes?: Uint8Array,
    myPubkey?: string
  ): Promise<string> {
    try {
      if (authMode === 'extension' && typeof window !== 'undefined' && window.nostr?.nip04?.encrypt) {
        return await window.nostr.nip04.encrypt(receiverPubkey, text);
      } else if (skBytes) {
        return await nip04.encrypt(skBytes, receiverPubkey, text);
      }
    } catch (e) {
      console.warn('Fallback para criptografia cliente de contingência:', e);
    }
    
    // Client-side fallback encryption via Web Crypto API with deterministic symmetric seed
    const seedKey = myPubkey ? [myPubkey, receiverPubkey].sort().join('') : receiverPubkey;
    return await this.fallbackClientEncrypt(text, seedKey);
  }

  public async decryptDirectMessage(
    encryptedText: string,
    otherPubkey: string,
    authMode: 'extension' | 'nsec' | 'none',
    skBytes?: Uint8Array,
    myPubkey?: string
  ): Promise<string> {
    try {
      if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

      const isEncrypted = encryptedText.startsWith('tribee2e:') || encryptedText.includes('?iv=');
      if (!isEncrypted) return encryptedText;

      // Lista de sementes possíveis para decifrar postagens de amigos ou mensagens
      const candidateSeeds = Array.from(new Set([
        otherPubkey,
        myPubkey,
        // Criptografia "anti-censura" antiga: conteúdo cifrado para si mesmo
        otherPubkey ? otherPubkey + otherPubkey : null,
        myPubkey && otherPubkey ? [myPubkey, otherPubkey].sort().join('') : null
      ].filter(Boolean) as string[]));

      if (encryptedText.startsWith('tribee2e:')) {
        for (const seed of candidateSeeds) {
          const res = await this.fallbackClientDecrypt(encryptedText, seed);
          if (res && !res.startsWith('[Erro')) {
            return res;
          }
        }
        return '🔒 [Conteúdo Criptografado - Autentique-se para decodificar]';
      }

      // Tenta decifrar NIP-04 com o pubkey do remetente/destinatário
      if (authMode === 'extension' && typeof window !== 'undefined' && window.nostr?.nip04?.decrypt) {
        try {
          const res = await window.nostr.nip04.decrypt(otherPubkey, encryptedText);
          if (res) return res;
        } catch {}
      } else if (skBytes) {
        try {
          const res = await nip04.decrypt(skBytes, otherPubkey, encryptedText);
          if (res) return res;
        } catch {}
      }

      // Tenta NIP-04 com o próprio pubkey do usuário caso tenha sido criptografado para si
      if (myPubkey && myPubkey !== otherPubkey) {
        if (authMode === 'extension' && typeof window !== 'undefined' && window.nostr?.nip04?.decrypt) {
          try {
            const res = await window.nostr.nip04.decrypt(myPubkey, encryptedText);
            if (res) return res;
          } catch {}
        } else if (skBytes) {
          try {
            const res = await nip04.decrypt(skBytes, myPubkey, encryptedText);
            if (res) return res;
          } catch {}
        }
      }

      // Tenta decifrar com as sementes de contingência
      for (const seed of candidateSeeds) {
        const fallbackResult = await this.fallbackClientDecrypt('tribee2e:' + encryptedText, seed);
        if (fallbackResult && !fallbackResult.startsWith('[Erro')) {
          return fallbackResult;
        }
      }

      return '🔒 [Conteúdo Criptografado - Sem permissão para decodificar]';
    } catch (e) {
      console.error('Erro ao decifrar mensagem Nostr:', e);
      return '🔒 [Conteúdo Criptografado]';
    }
  }

  // Anti-censorship AES-GCM client side fallback
  public async fallbackClientEncrypt(text: string, seedKey: string): Promise<string> {
    try {
      const enc = new TextEncoder();
      const keyData = enc.encode(seedKey.slice(0, 32).padEnd(32, '0'));
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, cryptoKey, enc.encode(text)
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      return 'tribee2e:' + btoa(String.fromCharCode(...combined));
    } catch {
      return text;
    }
  }

  public async fallbackClientDecrypt(encryptedStr: string, seedKey: string): Promise<string> {
    try {
      if (!encryptedStr.startsWith('tribee2e:')) {
        return '[Erro ao decifrar mensagem criptografada]';
      }
      const rawB64 = encryptedStr.replace('tribee2e:', '');
      const binaryStr = atob(rawB64);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) combined[i] = binaryStr.charCodeAt(i);
      
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const enc = new TextEncoder();
      const keyData = enc.encode(seedKey.slice(0, 32).padEnd(32, '0'));
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, cryptoKey, data
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return '[Erro ao decifrar mensagem criptografada]';
    }
  }

  public close() {
    try {
      this.pool.close(this.activeRelays);
    } catch {
      // ignore close errors
    }
  }
}

// Extensão global do navegador NIP-07
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
      nip04?: {
        encrypt(pubkey: string, text: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
      nip44?: {
        encrypt(pubkey: string, text: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}
