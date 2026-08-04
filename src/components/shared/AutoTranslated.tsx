import React, { useEffect, useState } from 'react';
import { translateText, langName } from '../../lib/translate';
import { linkifyText } from '../../lib/nostr/text';
import { useLanguage } from '../../context/LanguageContext';

// Cache de traduções (chave: texto protegido + idioma)
const cache = new Map<string, { translated: string; detected: string }>();

// Tokens NIP-19 que NÃO devem ser traduzidos (se a tradução mexer neles,
// a referência quebra). Protegemos com placeholders [REFn].
const TOKEN_RE = /(?:nostr:)?(?:nevent|note|nprofile|npub|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/g;

function protectTokens(text: string): { protectedText: string; tokens: string[] } {
  const tokens: string[] = [];
  const protectedText = text.replace(TOKEN_RE, (m) => {
    tokens.push(m);
    return `[REF${tokens.length - 1}]`;
  });
  return { protectedText, tokens };
}

function restoreTokens(text: string, tokens: string[]): string {
  return text.replace(/\[REF(\d+)\]/g, (_, i: string) => tokens[Number(i)] || `[REF${i}]`);
}

const FOOTER_FROM: Record<string, string> = {
  pt: 'Autotraduzido de',
  en: 'Auto-translated from',
  es: 'Autotraducido de',
  fr: 'Auto-traduit de'
};
const FOOTER_TO: Record<string, string> = {
  pt: 'para',
  en: 'to',
  es: 'a',
  fr: 'vers'
};

interface AutoTranslatedProps {
  text: string;
  variant?: 'default' | 'onBlue';
  className?: string;
}

// Traduz automaticamente o texto para o idioma da interface, protegendo os
// tokens nostr:nevent/note (placeholders [REFn]) para a referência não ser
// alterada pela tradução — ela é renderizada por linkifyText como NoteReference
// (que carrega separadamente), enquanto o texto ao redor é traduzido sem quebrar
// a página. Mostra o rodapé "Autotraduzido de <idioma> para <idioma>" com o
// nome do idioma de origem clicável para alternar original/tradução.
export const AutoTranslated: React.FC<AutoTranslatedProps> = ({ text, variant = 'default', className }) => {
  const { uiLang } = useLanguage();
  const [state, setState] = useState<{ translated: string; detected: string } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!text || !text.trim()) return;

    const { protectedText, tokens } = protectTokens(text);
    const cacheKey = `${protectedText}|${uiLang}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      setState({ translated: restoreTokens(cached.translated, tokens), detected: cached.detected });
      return;
    }

    let cancelled = false;
    translateText(protectedText, uiLang)
      .then(r => {
        if (cancelled) return;
        cache.set(cacheKey, { translated: r.translated, detected: r.detectedLang });
        setState({ translated: restoreTokens(r.translated, tokens), detected: r.detectedLang });
      });
    return () => { cancelled = true; };
  }, [text, uiLang]);

  const targetBase = uiLang.split('-')[0];
  const translated = state?.translated || text;
  const detected = state?.detected || '';
  const isTranslated = !!state && translated !== text && !!detected && detected.toLowerCase() !== targetBase;

  const visible = showOriginal ? text : translated;

  return (
    <span className={className}>
      {linkifyText(visible, variant as 'default' | 'onBlue')}
      {isTranslated && (
        <span
          className={`block mt-1 text-[10px] font-semibold ${
            variant === 'onBlue' ? 'text-blue-100/90' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {FOOTER_FROM[uiLang] || FOOTER_FROM.en}{' '}
          <button
            type="button"
            onClick={() => setShowOriginal(o => !o)}
            className="underline hover:opacity-75"
            title={showOriginal ? 'Mostrar tradução' : 'Mostrar idioma original'}
          >
            {langName(detected, uiLang)}
          </button>{' '}
          {FOOTER_TO[uiLang] || FOOTER_TO.en} {langName(targetBase, uiLang)}
        </span>
      )}
    </span>
  );
};
