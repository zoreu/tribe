import React, { useState, useEffect } from 'react';
import { PostItem } from '../../types';
import { useNostr } from '../../context/NostrContext';
import { linkifyText } from '../../lib/nostr/text';
import { FileAttachmentCard } from '../shared/FileAttachmentCard';
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
  ShieldCheck
} from 'lucide-react';

interface PostCardProps {
  post: PostItem;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { likePost, repostPost, commentPost, deletePost, auth, getShareableUrl, groups, client, isFriend, addFriend, getProfile } = useNostr();
  const [copied, setCopied] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Array<{ id: string; authorName: string; text: string; time: string }>>([]);
  const [displayText, setDisplayText] = useState<string>(post.content);

  const authorProfile = getProfile(post.pubkey) || post.author;
  const relayReplies = post.replies || [];

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
  const totalComments = (relayReplies.length > 0 ? relayReplies.length : post.repliesCount || 0) + localComments.length;

  const handleShare = () => {
    const shareUrl = getShareableUrl('note', post.id);
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        authorName: auth.profile?.name || 'Você',
        text,
        time: 'Agora'
      }
    ]);
    setCommentText('');

    // Publica o comentário nos relays como evento Kind 1 com tag "e" do post original
    await commentPost(post.id, text, post.pubkey);
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
            <span>Grupo: {group.name}</span>
          </div>
          <span className="text-[10px] text-slate-400">Moderado pela Comunidade</span>
        </div>
      )}

      {/* Conteúdo do Post */}
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Cabeçalho do Autor */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={authorProfile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
              alt={authorProfile?.name}
              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  {authorProfile?.display_name || authorProfile?.name || `Usuário ${post.pubkey.slice(0, 8)}`}
                </h4>

                {isAuthor && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Você
                  </span>
                )}

                {!isAuthor && isFriend(post.pubkey) && (
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                    👥 Amigo
                  </span>
                )}

                {!isAuthor && !isFriend(post.pubkey) && (
                  <button
                    onClick={() => addFriend(post.pubkey)}
                    className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold transition-colors shrink-0"
                    title="Adicionar autor aos meus amigos"
                  >
                    + Adicionar Amigo
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
              title="Excluir postagem (NIP-09 Event)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Texto da Postagem */}
        <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words pt-1">
          {linkifyText(displayText)}
        </p>

        {/* Criptografia Badge */}
        {post.isEncrypted && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Conteúdo Protegido por Criptografia de Ponta a Ponta</span>
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
                    className="w-full max-h-[500px] object-cover hover:scale-[1.01] transition-transform"
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Barra de Ações (Likes, Reposts, Comentários, Compartilhar) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-slate-500">
          
          {/* Curtir */}
          <button
            onClick={() => likePost(post)}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
              post.userLiked 
                ? 'text-red-500 bg-red-50 dark:bg-red-950/30' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.userLiked ? 'fill-red-500' : ''}`} />
            <span>{post.likesCount > 0 ? post.likesCount : 'Curtir'}</span>
          </button>

          {/* Repostar */}
          <button
            onClick={() => repostPost(post)}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
              post.userReposted 
                ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-emerald-500'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>{post.repostsCount > 0 ? post.repostsCount : 'Repost'}</span>
          </button>

          {/* Comentar */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{totalComments > 0 ? totalComments : 'Comentar'}</span>
          </button>

          {/* Compartilhar Deep Link */}
          <button
            onClick={handleShare}
            className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-indigo-500 transition-colors"
            title="Copiar link com parâmetros na URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
          </button>
        </div>

        {/* Seção de Comentários */}
        {showComments && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-150">
            {/* Lista de Comentários (dos relays) */}
            {relayReplies.map(c => {
              const replyAuthor = getProfile(c.pubkey) || c.author;
              return (
                <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{replyAuthor?.display_name || replyAuthor?.name || `Usuário ${c.pubkey.slice(0, 8)}`}</span>
                    <span className="text-[10px] text-slate-400">{new Date(c.created_at * 1000).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap">{linkifyText(c.content)}</p>
                </div>
              );
            })}

            {/* Comentários otimistas do próprio usuário */}
            {localComments.map(c => (
              <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>{c.authorName}</span>
                  <span className="text-[10px] text-slate-400">{c.time}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{c.text}</p>
              </div>
            ))}

            {/* Form de Adicionar Comentário */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Escreva um comentário..."
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
