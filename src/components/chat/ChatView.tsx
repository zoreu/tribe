import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useNostr } from '../../context/NostrContext';
import { 
  Users, 
  UserPlus, 
  Lock, 
  Send, 
  Image, 
  ShieldCheck, 
  UserX,
  Bell,
  Loader2,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { uploadMediaToNostrBuild, extractMediaUrls } from '../../lib/nostr/media';
import { linkifyText } from '../../lib/nostr/text';
import { FileAttachmentCard } from '../shared/FileAttachmentCard';
import { AutoTranslated } from '../shared/AutoTranslated';
import { copyToClipboard } from '../../lib/clipboard';
import { isSpamPubkey } from '../../lib/spamFilter';

export const ChatView: React.FC = () => {
  const { 
    auth, 
    chats, 
    activeChatPubkey, 
    setActiveChatPubkey, 
    sendDirectMessage, 
    getProfile, 
    setShowAuthModal,
    client,
    friends,
    addFriend,
    removeFriend,
    unreadChats,
    chatLoading
  } = useNostr();
const { t } = useLanguage();
  // Copiar mensagem com toque longo (mobile) / botão direito
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const longPressTimer = useRef<any>(null);

  const handleCopyNpub = () => {
    if (!activeFriend) return;
    copyToClipboard(activeFriend.npub);
    setCopiedNpub(true);
    setTimeout(() => setCopiedNpub(false), 2000);
  };

  const copyMessage = (id: string, text: string) => {
    if (!text) return;
    try { copyToClipboard(text); } catch {}
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(cur => (cur === id ? null : cur)), 2000);
  };
  const startLongPress = (id: string, text: string) => {
    if (!text) return;
    longPressTimer.current = setTimeout(() => copyMessage(id, text), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const [newFriendNpub, setNewFriendNpub] = useState('');
  const [messageText, setMessageText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Nunca abre conversa de usuário bloqueado (filtro de spam)
  const effectiveActive = activeChatPubkey && !isSpamPubkey(activeChatPubkey) ? activeChatPubkey : null;
  const activeFriend = effectiveActive ? getProfile(effectiveActive) : null;
  const currentMessages = effectiveActive ? (chats[effectiveActive] || []) : [];

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendNpub.trim()) return;

    try {
      const hexPubkey = newFriendNpub.startsWith('npub1') 
        ? client.npubToHex(newFriendNpub) 
        : newFriendNpub;
      await addFriend(hexPubkey);
      setActiveChatPubkey(hexPubkey);
      setNewFriendNpub('');
    } catch (err) {
      alert('Identificador/npub1 inválido');
    }
  };

  const handleRemoveFriend = async (pubkey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover este amigo da sua lista?')) {
      await removeFriend(pubkey);
      if (activeChatPubkey === pubkey) {
        setActiveChatPubkey(null);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChatPubkey) return;

    if (!auth.pubkey) {
      setShowAuthModal(true);
      return;
    }

    const txt = messageText;
    setMessageText('');
    await sendDirectMessage(activeChatPubkey, txt);
  };

  const handleMediaUploadInChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChatPubkey) return;

    setUploadingMedia(true);
    setUploadProgress(0);
    try {
      const url = await uploadMediaToNostrBuild(files[0], (p) => setUploadProgress(p));
      if (url) {
        await sendDirectMessage(activeChatPubkey, 'Mídia enviada:', url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-120px)] max-h-[680px] flex flex-col">

      {/* Lista de Amigos: ocupa a tela quando nenhuma conversa está aberta e é
          substituída pela caixa de mensagem (com botão voltar) ao selecionar
          um amigo — comportamento igual em mobile e desktop. */}
      <div className={`${effectiveActive ? 'hidden' : 'flex'} flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/30 min-h-0`}>
        <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col min-h-0">

        {/* Header Amigos */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Amigos & Conversas
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> E2EE
            </span>
          </div>

          {/* Form para adicionar amigo por npub */}
          <form onSubmit={handleAddFriend} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Adicionar por npub1..."
              value={newFriendNpub}
              onChange={(e) => setNewFriendNpub(e.target.value)}
              className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {friends.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-semibold">Nenhum amigo na lista.</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Cole o identificador <code>npub1...</code> de um amigo acima para iniciar um chat criptografado E2EE.
              </p>
            </div>
          ) : (
            friends.filter(pk => !isSpamPubkey(pk)).map(pubkey => {
              const friend = getProfile(pubkey);
              const isSelected = activeChatPubkey === pubkey;
              const unreadCount = unreadChats[pubkey] || 0;

              return (
                <div
                  key={pubkey}
                  onClick={() => setActiveChatPubkey(pubkey)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all group ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={friend.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={friend.name}
                        className="w-10 h-10 aspect-square rounded-full object-cover shrink-0 border border-white/20"
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white dark:border-slate-800">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs truncate">{friend.display_name || friend.name}</h4>
                        {friend.pubkey === auth.pubkey && (
                          <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full">
                            {t('you')}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {friend.nip05 || friend.npub.slice(0, 12) + '...'}
                      </p>
                    </div>
                  </div>

                  {friend.pubkey !== auth.pubkey && (
                  <button
                    onClick={(e) => handleRemoveFriend(pubkey, e)}
                    title="Remover amigo"
                    className={`p-1.5 rounded-lg transition-opacity ${
                      isSelected 
                        ? 'hover:bg-indigo-700 text-indigo-100 hover:text-white' 
                        : 'hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        </div>
      </div>

      {/* Área da Conversa Criptografada: abre por cima da lista de amigos
          quando um chat está ativo, centralizada na página. */}
      <div className={`${effectiveActive ? 'flex' : 'hidden'} flex-1 flex-col bg-white dark:bg-slate-800 min-h-0`}>
        {activeFriend ? (
          <>
            <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col min-h-0">

            {/* Header do Chat */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 min-w-0">
                {/* Botão voltar para retornar à lista de amigos */}
                <button
                  onClick={() => setActiveChatPubkey(null)}
                  className="p-2 -ml-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                  title="Voltar para a lista de amigos"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={activeFriend.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                  alt={activeFriend.name}
                  className="w-10 h-10 aspect-square rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{activeFriend.display_name || activeFriend.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{activeFriend.npub.slice(0, 16)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyNpub}
                  className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full transition-colors"
                  title="Copiar chave pública npub"
                >
                  {copiedNpub ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {activeFriend.pubkey !== auth.pubkey && (
                <button
                  onClick={(e) => handleRemoveFriend(activeFriend.pubkey, e)}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{t('remove')}</span>
                </button>
                )}
                <div className="hidden sm:flex px-3 py-1 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% E2EE Criptografado</span>
                </div>
              </div>
            </div>

            {/* Stream de Mensagens */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-100/50 dark:bg-slate-900/40">
              {chatLoading && currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs font-bold">Carregando mensagens...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Conversa Criptografada Aberta</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Mensagens trocadas aqui usam NIP-04/NIP-44. Nenhum relay ou intermediário consegue ler o conteúdo das mensagens.
                  </p>
                </div>
              ) : (
                currentMessages.map(msg => {
                  const isMe = msg.senderPubkey === auth.pubkey;
                  const { textWithoutMedia, media } = extractMediaUrls(msg.content);
                  const messageText = textWithoutMedia.length > 0 ? textWithoutMedia : (media.length > 0 || !!msg.mediaUrl ? '' : msg.content);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        onContextMenu={(e) => { e.preventDefault(); copyMessage(msg.id, messageText); }}
                        onTouchStart={() => startLongPress(msg.id, messageText)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        title={messageText ? 'Segure para copiar' : undefined}
                        className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none'
                      }`}>
                        {messageText && (
                          <div className="leading-relaxed whitespace-pre-wrap break-words">
                            <AutoTranslated text={messageText} variant={isMe ? 'onBlue' : 'default'} />
                          </div>
                        )}
                        {media.length > 0 && media.map((m, idx) => (
                          <div key={idx} className="mt-1.5 rounded-lg overflow-hidden bg-black/5 dark:bg-black/30">
                            {m.type === 'video' ? (
                              <video src={m.url} controls className="rounded-lg max-h-48 w-full object-contain" />
                            ) : m.type === 'audio' ? (
                              <audio src={m.url} controls className="w-full max-h-10" />
                            ) : m.type === 'file' ? (
                              <FileAttachmentCard url={m.url} />
                            ) : (
                              <img src={m.url} alt="Mídia" className="rounded-lg max-h-48 w-full object-cover" />
                            )}
                          </div>
                        ))}
                        {media.length === 0 && msg.mediaUrl && (
                          /\.(pdf|docx?|xlsx?|pptx?|txt|csv)(\?.*)?$/i.test(msg.mediaUrl) ? (
                            <div className="mt-1.5 rounded-lg overflow-hidden bg-black/5 dark:bg-black/30">
                              <FileAttachmentCard url={msg.mediaUrl} />
                            </div>
                          ) : (
                            <img src={msg.mediaUrl} alt="Mídia" className="rounded-lg mt-2 max-h-48 object-cover" />
                          )
                        )}
                        <div className={`text-[9px] flex items-center justify-end gap-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {copiedMsgId === msg.id && (
                            <span className={`font-bold ${isMe ? 'text-emerald-300' : 'text-emerald-600'}`}>{t('copied')}</span>
                          )}
                          <span>{new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <Lock className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra de Progresso do Upload de Mídia */}
            {uploadingMedia && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    Enviando mídia...
                  </span>
                  <span>{uploadProgress ?? 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Input de Envio de Mensagem */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2">
              <label className="p-2 text-slate-500 hover:text-blue-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors" title="Enviar foto, vídeo ou PDF">
                <Image className="w-5 h-5" />
                <input type="file" onChange={handleMediaUploadInChat} accept="image/*,video/*,audio/*,application/pdf,.pdf" className="hidden" />
              </label>

              <input
                type="text"
                placeholder="Digite sua mensagem criptografada..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={!messageText.trim() || uploadingMedia}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t('send')}</span>
              </button>
            </form>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">Selecione um amigo para conversar</h3>
            <p className="text-xs max-w-sm">
              Conecte-se diretamente com contatos usando o protocolo Nostr com mensagens 100% criptografadas de ponta a ponta.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

