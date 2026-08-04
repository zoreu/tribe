import React, { useEffect, useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { PostItem } from '../../types';
import { PostCard } from './PostCard';

interface NoteReferenceProps {
  noteId: string;
}

// Cache em memória das postagens já buscadas: uma vez carregada, a referência
// permanece sem re-buscar (evita o "Carregando..." piscando ao rolar).
const referencedCache = new Map<string, PostItem>();

// Exibe a postagem referenciada por um identificador nostr:nevent/note como um
// PostCard completo (com nome e foto do autor original).
export const NoteReference: React.FC<NoteReferenceProps> = ({ noteId }) => {
  const { posts, loadNote } = useNostr();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(() => {
    return !(referencedCache.has(noteId) || posts.find(p => p.id === noteId));
  });
  const [refPost, setRefPost] = useState<PostItem | null>(() => {
    return referencedCache.get(noteId) || posts.find(p => p.id === noteId) || null;
  });

  useEffect(() => {
    let cancelled = false;

    if (referencedCache.has(noteId)) {
      setRefPost(referencedCache.get(noteId)!);
      setLoading(false);
      return;
    }
    const inPosts = posts.find(p => p.id === noteId);
    if (inPosts) {
      referencedCache.set(noteId, inPosts);
      setRefPost(inPosts);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadNote(noteId)
      .then(p => {
        if (cancelled) return;
        if (p) referencedCache.set(noteId, p);
        setRefPost(p);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [noteId, posts, loadNote]);

  if (loading) {
    return (
      <div className="text-xs text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 my-2 animate-pulse">
        {t('loadingPost')}
      </div>
    );
  }

  if (refPost) {
    return <PostCard post={refPost} />;
  }

  return (
    <div className="text-xs text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 my-2">
      {t('refUnavailable')}
    </div>
  );
};
