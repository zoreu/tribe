import React, { useState, useRef, useEffect } from 'react';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Film, 
  Heart, 
  Repeat, 
  MessageCircle, 
  Share2, 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Check, 
  Play,
  Loader2 
} from 'lucide-react';
import { CreatePostModal } from '../feed/CreatePostModal';
import { linkifyText } from '../../lib/nostr/text';

export const ReelsView: React.FC = () => {
  const { posts, likePost, repostPost, getShareableUrl, getProfile } = useNostr();
  const { t } = useLanguage();
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Apenas o reel com este id fica com som ativo; os demais permanecem mudos
  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  // Apenas o reel atualmente centralizado na tela é reproduzido
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  // Reel focado no centro da tela, aguardando a tolerância de 2 segundos
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reproduz somente o reel ativo e pausa os demais;
  // também sincroniza a propriedade DOM "muted" diretamente.
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(id => {
      const el = videoRefs.current[id];
      if (!el) return;
      el.muted = unmutedId !== id;
      if (id === activeReelId) {
        if (el.paused) el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [activeReelId, unmutedId]);

  // Tolerância de 2 segundos: só inicia a reprodução se o reel
  // permanecer centralizado na tela por esse período.
  useEffect(() => {
    if (!focusedId) return;
    const timer = setTimeout(() => setActiveReelId(focusedId), 2000);
    return () => clearTimeout(timer);
  }, [focusedId]);

  useEffect(() => {
    const tim = setTimeout(() => setReelsLoaded(true), 4000);
    return () => clearTimeout(tim);
  }, []);

  const toggleSound = (id: string) => {
    setUnmutedId(prev => (prev === id ? null : id));
  };

  // Filtra posts identificados como Reels ou que tenham vídeo
  const reelPosts = posts.filter(p => p.isReel || p.media.some(m => m.type === 'video'));

  // Detecta o reel cujo centro está mais próximo do centro da tela,
  // para reproduzir apenas aquele que o usuário está focando na rolagem.
  useEffect(() => {
    let frame: number | undefined;

    const updateFocus = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const centerY = vh / 2;
      let bestId: string | null = null;
      let bestDist = Infinity;

      Object.keys(cardRefs.current).forEach(id => {
        const card = cardRefs.current[id];
        if (!card) return;
        const rect = card.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return; // fora da área visível
        const cardCenter = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenter - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      });

      if (bestId !== null) setFocusedId(bestId);
    };

    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFocus);
    };

    updateFocus();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reelPosts.length]);

  const handleShare = (id: string) => {
    const url = getShareableUrl('reel', id);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      
      {/* Header Reels */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-100 dark:bg-pink-950/60 rounded-xl text-pink-600 dark:text-pink-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Tribe Reels</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vídeos e mídias curtas descentralizadas</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Reel</span>
        </button>
      </div>

      {/* Feed de Reels */}
      {reelPosts.length === 0 ? (
        !reelsLoaded ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{t('loadingReel')}</h3>
          </div>
        ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
          <Film className="w-12 h-12 text-pink-400 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t('noReelsYet')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('beFirstReel')}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs shadow-md transition-all inline-block"
          >
            {t('publishNewReel')}
          </button>
        </div>
        )
      ) : (
        <div className="space-y-6">
          {reelPosts.map(post => {
            const videoMedia = post.media.find(m => m.type === 'video') || post.media[0];
            const author = getProfile(post.pubkey) || post.author;
            return (
              <div 
                key={post.id}
                data-reel-id={post.id}
                ref={(el) => { cardRefs.current[post.id] = el; }}
                className="bg-black rounded-3xl overflow-hidden shadow-xl border border-slate-800 relative group max-w-md mx-auto aspect-[9/14]"
              >
                {/* Player de Vídeo */}
                {videoMedia && videoMedia.type === 'video' ? (
                  <video
                    src={videoMedia.url}
                    loop
                    muted
                    playsInline
                    ref={(el) => { videoRefs.current[post.id] = el; }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-purple-900 to-indigo-900 flex items-center justify-center p-6 text-white text-center">
                    <p className="text-sm font-bold break-words">{linkifyText(post.content)}</p>
                  </div>
                )}

                {/* Top Controls Overlay */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <button
                    onClick={() => toggleSound(post.id)}
                    className="p-2 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white rounded-full transition-colors"
                    title={unmutedId === post.id ? 'Silenciar' : 'Ativar som deste vídeo'}
                  >
                    {unmutedId === post.id ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                {/* Informações do Autor e Conteúdo */}
                <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white space-y-2 z-10">
                  <div className="flex items-center gap-3">
                    <img
                      src={author?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                      alt={author?.name}
                      className="w-10 h-10 aspect-square rounded-full object-cover border-2 border-white/50"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white">{author?.display_name || author?.name || `Usuário ${post.pubkey.slice(0, 8)}`}</h4>
                      <p className="text-[11px] text-slate-300 font-mono">{author?.npub ? `${author.npub.slice(0, 14)}...` : post.pubkey.slice(0, 12)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-100 line-clamp-2 leading-relaxed break-words">
                    {linkifyText(post.content)}
                  </p>
                </div>

                {/* Sidebar com Ações (Curtir, Repost, Compartilhar) */}
                <div className="absolute right-4 bottom-20 z-20 flex flex-col items-center gap-4 text-white">
                  
                  {/* Like */}
                  <button
                    onClick={() => likePost(post)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`p-3 rounded-full backdrop-blur-md transition-transform group-hover:scale-110 ${
                      post.userLiked ? 'bg-red-600 text-white' : 'bg-black/50 text-white'
                    }`}>
                      <Heart className={`w-6 h-6 ${post.userLiked ? 'fill-white' : ''}`} />
                    </div>
                    <span className="text-xs font-bold shadow-sm">{post.likesCount}</span>
                  </button>

                  {/* Repost */}
                  <button
                    onClick={() => repostPost(post)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="p-3 bg-black/50 backdrop-blur-md rounded-full transition-transform group-hover:scale-110">
                      <Repeat className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold shadow-sm">{post.repostsCount}</span>
                  </button>

                  {/* Share Link */}
                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="p-3 bg-black/50 backdrop-blur-md rounded-full transition-transform group-hover:scale-110">
                      {copiedId === post.id ? <Check className="w-6 h-6 text-emerald-400" /> : <Share2 className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] font-bold">Link</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Envio de Reel */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultIsReel={true}
      />
    </div>
  );
};
