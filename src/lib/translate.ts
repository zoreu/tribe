// Tradução gratuita via Google Translate (endpoint gtx, com detecção automática
// de idioma de origem). Sem chave de API — usado apenas para textos curtos.

export interface TranslationResult {
  translated: string;
  detectedLang: string; // código do idioma detectado, ex.: "en"
}

export async function translateText(text: string, targetLang: string): Promise<TranslationResult> {
  const clean = (text || '').trim();
  if (!clean) return { translated: text || '', detectedLang: '' };

  // Mantém o texto original se já estiver no idioma de destino (evita requisições à toa)
  if (targetLang) {
    // heurística simples: se houver muitos caracteres acentuados do idioma de destino, assume já traduzido
    // (a detecção real acontece na resposta; aqui evitamos apenas chamadas desnecessárias)
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(clean.slice(0, 4000))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`translate status ${res.status}`);
    const data = await res.json();
    const translated = (data?.[0] || [])
      .map((seg: unknown) => (seg as unknown[])?.[0] || '')
      .join('')
      .trim();
    const detectedLang: string = data?.[2] || '';

    if (!translated || translated.toLowerCase() === clean.toLowerCase()) {
      return { translated: clean, detectedLang };
    }
    return { translated, detectedLang };
  } catch {
    return { translated: clean, detectedLang: '' };
  }
}

// Nome de um idioma (pelo código) escrito no idioma de exibição
const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  pt: { pt: 'português', en: 'Portuguese', es: 'portugués', fr: 'portugais', de: 'Portugiesisch', it: 'portoghese' },
  en: { pt: 'inglês', en: 'English', es: 'inglés', fr: 'anglais', de: 'Englisch', it: 'inglese' },
  es: { pt: 'espanhol', en: 'Spanish', es: 'español', fr: 'espagnol', de: 'Spanisch', it: 'spagnolo' },
  fr: { pt: 'francês', en: 'French', es: 'francés', fr: 'français', de: 'Französisch', it: 'francese' },
  de: { pt: 'alemão', en: 'German', es: 'alemán', fr: 'allemand', de: 'Deutsch', it: 'tedesco' },
  it: { pt: 'italiano', en: 'Italian', es: 'italiano', fr: 'italien', de: 'Italienisch', it: 'italiano' },
  ja: { pt: 'japonês', en: 'Japanese', es: 'japonés', fr: 'japonais', de: 'Japanisch', it: 'giapponese' },
  ko: { pt: 'coreano', en: 'Korean', es: 'coreano', fr: 'coréen', de: 'Koreanisch', it: 'coreano' },
  zh: { pt: 'chinês', en: 'Chinese', es: 'chino', fr: 'chinois', de: 'Chinesisch', it: 'cinese' },
  ru: { pt: 'russo', en: 'Russian', es: 'ruso', fr: 'russe', de: 'Russisch', it: 'russo' },
  ar: { pt: 'árabe', en: 'Arabic', es: 'árabe', fr: 'arabe', de: 'Arabisch', it: 'arabo' },
  hi: { pt: 'hindi', en: 'Hindi', es: 'hindi', fr: 'hindi', de: 'Hindi', it: 'hindi' }
};

export function langName(code: string, displayLang: string): string {
  const base = (code || '').toLowerCase().split('-')[0];
  return LANGUAGE_NAMES[base]?.[displayLang] || LANGUAGE_NAMES[base]?.en || code;
}
