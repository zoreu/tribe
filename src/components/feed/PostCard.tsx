import React, { useState, useEffect } from 'react';
import { PostItem } from '../../types';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { linkifyText } from '../../lib/nostr/text';
import { FileAttachmentCard } from '../shared/FileAttachmentCard';
import { AutoTranslated } from '../shared/AutoTranslated';
import * as nip19 from 'nostr-tools/nip19';
import { 
  Heart, 
  Repeat, 
  MessageCircle, 
  Share2, 
  Trash2, 
  Lock, 
  Users as GroupIcon, 
  Film, 
  Check, 
  Send,
  ShieldCheck,
  Link2
} from 'lucide-react';

interface PostCardProps {
  post: PostItem;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { likePost, repostPost, commentPost, deletePost, auth, getShareableUrl, groups, client, isFriend, addFriend, getProfile, setViewProfilePubkey, ensureProfileLoaded } = useNostr();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<PostItem | null>(null);
  const [localComments, setLocalComments] = useState<Array<{ id: string; authorName: string; text: string; time: string }>>([]);
  const [displayText, setDisplayText] = useState<string>(post.content);

  const authorProfile = getProfile(post.pubkey) || post.author;

  // Estilo Twitter: um repost (kind 6) é exibido como postagem do reposter,
  // com a postagem original embutida (nome/autor do original).
  const isRepost = !!post.repostOf;
  const displayPost = isRepost ? post.repostOf! : post;
  const originalProfile = isRepost ? (getProfile(displayPost.pubkey) || displayPost.author) : null;
  const relayReplies = displayPost.replies || [];

  // Renderização recursiva de comentários aninhados (resposta a comentário)
  const renderComment = (comment: PostItem, depth: number): React.ReactNode => {
    const replyAuthor = getProfile(comment.pubkey) || comment.author;
    // Garante que o perfil do autor do comentário seja carregado (foto/nome),
    // inclusive para quem publica a partir de outros apps (ex.: Amethyst).
    ensureProfileLoaded(comment.pubkey);
    return (
      <div key={comment.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs space-y-1">
      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white gap-2">
        <button
          type="button"
          onClick={() => setViewProfilePubkey(comment.pubkey)}
          className="flex items-center gap-2 min-w-0 text-left hover:underline"
          title="Ver perfil"
        >
          <img
            src={replyAuthor?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
            alt={replyAuthor?.name}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
          <span className="truncate">{replyAuthor?.display_name || replyAuthor?.name || `Usuário ${comment.pubkey.slice(0, 8)}`}</span>
        </button>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold">{new Date(comment.created_at * 1000).toLocaleString()}</span>
          <button
            type="button"
            onClick={() => setReplyTo(comment)}
            className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            {t('respond')}
          </button>
        </span>
      </div>
        <p className="text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap"><AutoTranslated text={comment.content} /></p>
        <div className="pt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => likePost(comment)}
            className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
              comment.userLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${comment.userLiked ? 'fill-red-500' : ''}`} />
            <span>{comment.likesCount > 0 ? comment.likesCount : ''}</span>
          </button>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 ml-1">
            {comment.replies.map(r => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const isEncrypted = post.content.startsWith('tribee2e:') || post.content.includes('?iv=');
    if (isEncrypted) {
      client.decryptDirectMessage(
        post.content, 
        post.pubkey, 
        auth.authMode, 
        auth.secretKey, 
        auth.pubkey || undefined
      )
        .then(res => setDisplayText(res))
        .catch(() => setDisplayText('🔒 [Conteúdo Criptografado]'));
    } else {
      setDisplayText(post.content);
    }
  }, [post.content, post.pubkey, auth, client]);

  const isAuthor = auth.pubkey === post.pubkey;
  const group = post.groupId ? groups.find(g => g.id === post.groupId) : null;
  const totalComments = (relayReplies.length > 0 ? relayReplies.length : displayPost.repliesCount || 0) + localComments.length;

  const handleShare = () => {
    const shareUrl = getShareableUrl('note', displayPost.id);
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copia o identificador nostr:nevent da postagem para colar em outra
  // postagem e referenciá-la (fica embutida como um repost/citação).
  const handleCopyId = () => {
    try {
      const nevent = nip19.neventEncode({
        id: displayPost.id,
        relays: [],
        author: displayPost.pubkey
      });
      navigator.clipboard.writeText(`nostr:${nevent}`);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    const optimisticId = 'c-' + Math.random().toString(36).slice(2, 7);
    setLocalComments(prev => [
      ...prev,
      {
        id: optimisticId,
        authorName: auth.profile?.name || t('you'),
        text,
        time: t('now')
      }
    ]);
    setCommentText('');

    // Se está respondendo a um comentário, publica com root + reply (NIP-10);
    // senão, comenta direto na postagem.
    if (replyTo) {
      await commentPost(displayPost.id, text, replyTo.pubkey, replyTo.id);
      setReplyTo(null);
    } else {
      await commentPost(displayPost.id, text, displayPost.pubkey);
    }
    // O comentário já aparece em post.replies; remove o otimista local para não duplicar
    setLocalComments(prev => prev.filter(c => c.id !== optimisticId));
  };

  const formattedTime = new Date(post.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(post.created_at * 1000).toLocaleDateString();

  return (
    <article className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      
      {/* Top Banner de Grupo se pertencer a comunidade */}
      {group && (
        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <GroupIcon className="w-4 h-4" />
            <span>{t('groupLabel')}: {group.name}</span>
          </div>
          <span className="text-[10px] text-slate-400">{t('moderatedByCommunity')}</span>
        </div>
      )}

      {/* Conteúdo do Post */}
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Cabeçalho do Autor */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setViewProfilePubkey(post.pubkey)}
              className="shrink-0"
              title="Ver perfil"
            >
              <img
                src={authorProfile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                alt={authorProfile?.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-400 transition-shadow"
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setViewProfilePubkey(post.pubkey)}
                  className="text-left hover:underline"
                  title="Ver perfil"
                >
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                    {authorProfile?.display_name || authorProfile?.name || `Usuário ${post.pubkey.slice(0, 8)}`}
                  </h4>
                </button>

                {isAuthor && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {t('you')}
                  </span>
                )}

                {!isAuthor && isFriend(post.pubkey) && (
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                    👥 {t('friend')}
                  </span>
                )}

                {!isAuthor && !isFriend(post.pubkey) && (
                  <button
                    onClick={() => addFriend(post.pubkey)}
                    className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold transition-colors shrink-0"
                    title={t('addFriendTip')}
                  >
                    + {t('addFriend')}
                  </button>
                )}

                {authorProfile?.nip05 && (
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    ✓ {authorProfile.nip05}
                  </span>
                )}
                {post.isReel && (
                  <span className="text-[10px] bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                    <Film className="w-3 h-3" /> Reel
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {formattedDate} às {formattedTime} • <span className="text-emerald-500 font-semibold">Nostr Event</span>
              </p>
            </div>
          </div>

          {/* Botão de exclusão para o próprio autor NIP-09 */}
          {isAuthor && (
            <button
              onClick={() => deletePost(post.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors shrink-0"
              title={t('deletePostTip')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {isRepost ? (
          <>
            {/* Indicador de Repost (estilo Twitter) */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 pb-1">
              <Repeat className="w-4 h-4 text-emerald-500" />
              <span>{authorProfile?.display_name || authorProfile?.name || 'Este usuário'} repostou</span>
            </div>

            {/* Postagem original embutida */}
            <div
              onClick={() => { window.location.href = `/?note=${displayPost.id}`; }}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors cursor-pointer"
            >
<div className="p-4 space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewProfilePubkey(displayPost.pubkey);
                  }}
                  className="flex items-center gap-2.5 min-w-0 hover:underline text-left"
                  title="Ver perfil"
                >
                  <img
                    src={originalProfile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={originalProfile?.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {originalProfile?.display_name || originalProfile?.name || `Usuário ${displayPost.pubkey.slice(0, 8)}`}
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      {new Date(displayPost.created_at * 1000).toLocaleString()}
                    </p>
                  </div>
                </button>

                {displayPost.content && (
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                    <AutoTranslated text={displayPost.content} />
                  </p>
                )}

                {displayPost.media && displayPost.media.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {displayPost.media.map((item, index) => (
                      <div key={index} className="rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-slate-700">
                        {item.type === 'video' ? (
                          <video src={item.url} controls className="w-full max-h-[300px] object-contain mx-auto" />
                        ) : item.type === 'audio' ? (
                          <audio src={item.url} controls className="w-full my-2 px-2" />
                        ) : item.type === 'file' ? (
                          <div className="p-2"><FileAttachmentCard url={item.url} /></div>
                        ) : (
                          <img src={item.url} alt={item.alt || ''} className="w-full max-h-[320px] object-contain" loading="lazy" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Texto da Postagem */}
            <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words pt-1">
              <AutoTranslated text={displayText} />
            </p>

            {/* Criptografia Badge */}
            {post.isEncrypted && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>{t('e2eeContent')}</span>
              </div>
            )}

            {/* Galeria de Mídias (Fotos, Vídeos, Áudio) */}
            {post.media && post.media.length > 0 && (
              <div className="space-y-2 pt-1">
                {post.media.map((item, index) => (
                  <div key={index} className="rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-slate-700">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        className="w-full max-h-[450px] object-contain mx-auto"
                      />
                    ) : item.type === 'audio' ? (
                      <audio
                        src={item.url}
                        controls
                        className="w-full my-3 px-3"
                      />
                    ) : item.type === 'file' ? (
                      <div className="p-2">
                        <FileAttachmentCard url={item.url} />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt || 'Mídia da postagem'}
                        className="w-full max-h-[500px] object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Barra de Ações (Likes, Reposts, Comentários, Compartilhar) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-slate-500">
          
          {/* Curtir */}
          <button
            onClick={() => likePost(displayPost)}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
              displayPost.userLiked 
                ? 'text-red-500 bg-red-50 dark:bg-red-950/30' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${displayPost.userLiked ? 'fill-red-500' : ''}`} />
            <span>{displayPost.likesCount > 0 ? displayPost.likesCount : t('like')}</span>
          </button>

          {/* Copiar ID (nostr:nevent) para referenciar em outra postagem */}
          <button
            onClick={handleCopyId}
            className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-amber-500 transition-colors"
            title="Copiar identificador nostr:nevent para colar em outra postagem"
          >
            {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
            <span>{copiedId ? 'Copiado!' : t('copyId')}</span>
          </button>

          {/* Repostar */}
          <button
            onClick={() => repostPost(displayPost)}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
              displayPost.userReposted 
                ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-emerald-500'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>{displayPost.repostsCount > 0 ? displayPost.repostsCount : t('repost')}</span>
          </button>

          {/* Comentar */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{totalComments > 0 ? totalComments : t('comment')}</span>
          </button>

          {/* Compartilhar Deep Link */}
          <button
            onClick={handleShare}
            className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-indigo-500 transition-colors"
            title={t('copyLinkTip')}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : t('share')}</span>
          </button>
        </div>

        {/* Seção de Comentários */}
        {showComments && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-150">
            {/* Lista de Comentários (dos relays) — com respostas aninhadas */}
            {relayReplies.map(c => renderComment(c, 0))}

            {/* Comentários otimistas do próprio usuário */}
            {localComments.map(c => (
              <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>{c.authorName}</span>
                  <span className="text-[10px] text-slate-400">{c.time}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap"><AutoTranslated text={c.text} /></p>
              </div>
            ))}

            {/* Indicador de resposta a comentário */}
            {replyTo && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="truncate">
                  {t('respondingTo')} {getProfile(replyTo.pubkey)?.display_name || getProfile(replyTo.pubkey)?.name || 'comentário'}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
                >
                  {t('cancelReply')}
                </button>
              </div>
            )}

            {/* Form de Adicionar Comentário */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder={t('writeComment')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-transparent focus:border-blue-500 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

      </div>
    </article>
  );
};


