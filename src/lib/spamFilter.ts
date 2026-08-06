import * as nip19 from 'nostr-tools/nip19';

// ============================================================================
// FILTRO DE SPAM / USUÁRIOS BLOQUEADOS
// ============================================================================
// Adicione aqui os pubkeys (hex) ou npubs dos usuários que você quer ocultar
// em todo o app (feed, busca, amigos, etc.).
//
// Para obter o hex de um npub:
//   import { nip19 } from 'nostr-tools';
//   nip19.decode("npub1...").data   // retorna o hex
// ============================================================================

const SPAM_PUBKEYS: Set<string> = new Set([
  // npub1lgcl7cw057d3e3kq725j8g5xgc84jypxdycxxx6gldl8xvcsaxyqzzzywa
  'fa31ff61cfa79b1cc6c0f2a923a286460f5910266930631b48fb7e733310e988',
  // npub1creatr06r4vr7rzx22f4kawdfj82yt09vw5rqw0kan8sr43h608s3dfeh6
  'c0f3d58dfa1d583f0c4652935b75cd4c8ea22de563a83039f6eccf01d637d3cf',
  // npub1eqttdl09zmy66hl4tvmjklamayqqaxxf8lxt6n642c6snp0gkerqkmkqgz
  'c816b6fde516c9ad5ff55b372b7fbbe9000e98c93fccbd4f5556350985e8b646',
  // npub1ceckdl5xxchdh2w0hf0xj390mygcdzqwgncpd4rz8qn6ncv5ph8qwpgp6d
  'c67166fe86362edba9cfba5e6944afd91186880e44f016d4623827a9e1940dce'
]);

// Aceita pubkey hex ou npub — normaliza para hex antes de verificar.
export function isSpamPubkey(pubkey?: string | null): boolean {
  if (!pubkey) return false;
  const lower = pubkey.trim().toLowerCase();
  if (SPAM_PUBKEYS.has(lower)) return true;
  if (lower.startsWith('npub1')) {
    try {
      const d = nip19.decode(lower);
      if (d.type === 'npub') return SPAM_PUBKEYS.has((d.data as string).toLowerCase());
    } catch {}
  }
  return false;
}
