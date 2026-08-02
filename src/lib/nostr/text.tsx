import React from 'react';

const LINK_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;

// Transforma URLs de texto em links clicáveis (abre em nova aba)
// "onBlue" é usado para mensagens enviadas (balão azul), onde a cor azul padrão
// não teria contraste com o fundo do balão.
export function linkifyText(text: string, variant: 'default' | 'onBlue' = 'default'): React.ReactNode[] {
  if (!text) return [];

  return text.split(LINK_REGEX).map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={
            variant === 'onBlue'
              ? "text-amber-300 underline underline-offset-2 break-all hover:text-amber-200"
              : "text-blue-500 dark:text-blue-400 underline underline-offset-2 break-all hover:text-blue-700 dark:hover:text-blue-300"
          }
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
