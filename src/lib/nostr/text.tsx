import React from 'react';
import * as nip19 from 'nostr-tools/nip19';
import { NoteReference } from '../../components/feed/NoteReference';

// URLs e identificadores NIP-19 (nostr:nevent1..., npub1..., nprofile1..., naddr1...)
const TOKEN_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|(?:nostr:)?(?:nevent|note|nprofile|npub|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/gi;

function linkClass(variant: 'default' | 'onBlue'): string {
  return variant === 'onBlue'
    ? "text-amber-300 underline underline-offset-2 break-all hover:text-amber-200"
    : "text-blue-500 dark:text-blue-400 underline underline-offset-2 break-all hover:text-blue-700 dark:hover:text-blue-300";
}

// Renderiza uma referência NIP-19 (nevent/note/nprofile/npub/naddr) como um
// link clicável no app, em vez de mostrar o bech32 cru.
function renderNip19(part: string, variant: 'default' | 'onBlue', key: number): React.ReactNode {
  const bech32 = part.replace(/^nostr:/i, '');
  let href = '#';
  let label = '🔗 Referência';

  try {
    const decoded = nip19.decode(bech32);
    if (decoded.type === 'nevent' || decoded.type === 'note') {
      const id = decoded.type === 'nevent'
        ? (decoded.data as { id: string }).id
        : decoded.data as unknown as string;
      // Mostra a postagem referenciada embutida (estilo Twitter), em vez de
      // apenas um link "Ver postagem".
      return <NoteReference key={key} noteId={id} />;
    } else if (decoded.type === 'nprofile') {
      href = `/?p=${(decoded.data as { pubkey: string }).pubkey}`;
      label = '👤 Ver perfil';
    } else if (decoded.type === 'npub') {
      href = `/?p=${decoded.data as unknown as string}`;
      label = '👤 Ver perfil';
    } else if (decoded.type === 'naddr') {
      href = `https://njump.me/${bech32}`;
      label = '📌 Ver evento';
    }
  } catch {
    href = `https://njump.me/${bech32}`;
    label = '🔗 Referência';
  }

  return (
    <a
      key={key}
      href={href}
      target={href.startsWith('/') ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={(e) => {
        if (href.startsWith('/')) {
          e.preventDefault();
          window.location.href = href;
        }
      }}
      className={linkClass(variant)}
    >
      {label}
    </a>
  );
}

// Transforma URLs e referências NIP-19 de texto em links clicáveis.
// "onBlue" é usado para mensagens enviadas (balão azul), onde a cor azul padrão
// não teria contraste com o fundo do balão.
export function linkifyText(text: string, variant: 'default' | 'onBlue' = 'default'): React.ReactNode[] {
  if (!text) return [];

  return text.split(TOKEN_REGEX).map((part, i) => {
    if (!part) return null;

    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass(variant)}
        >
          {part}
        </a>
      );
    }

    if (/^(?:nostr:)?(?:nevent|note|nprofile|npub|naddr)1/i.test(part)) {
      return renderNip19(part, variant, i);
    }

    return part;
  });
}
