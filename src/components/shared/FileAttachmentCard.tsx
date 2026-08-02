import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface FileAttachmentCardProps {
  url: string;
}

// Extrai o nome do arquivo a partir de uma URL (remove query/hash e decode)
export function getFileNameFromUrl(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const name = clean.split('/').filter(Boolean).pop() || 'Documento';
    return decodeURIComponent(name);
  } catch {
    return 'Documento';
  }
}

// Retorna o rótulo do tipo de arquivo baseado na extensão da URL
export function getFileTypeLabel(url: string): string {
  const ext = (url.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toUpperCase();
  return ext ? `Documento ${ext}` : 'Documento';
}

export const FileAttachmentCard: React.FC<FileAttachmentCardProps> = ({ url }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{getFileNameFromUrl(url)}</p>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{getFileTypeLabel(url)}</p>
      </div>
      <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
        Abrir
        <ExternalLink className="w-3.5 h-3.5" />
      </span>
    </a>
  );
};
