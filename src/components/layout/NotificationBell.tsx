import React, { useState, useRef, useEffect } from 'react';
import { useNostr } from '../../context/NostrContext';
import { isSpamPubkey } from '../../lib/spamFilter';
import { Bell, MessageSquare } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const { chats, unreadChats, totalUnreadMessages, setActiveChatPubkey, setActiveTab, getProfile, requestNotificationPermission, pushEnabled, auth } = useNostr();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha o painel ao clicar fora dele
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Conversas ordenadas da mais recente para a mais antiga.
  // Conversa consigo mesmo (self-DM) não aparece no sininho.
  const conversations = Object.keys(chats)
    .filter(pubkey => pubkey !== auth.pubkey && !isSpamPubkey(pubkey))
    .map(pubkey => {
      const messages = chats[pubkey] || [];
      const last = messages[messages.length - 1];
      return {
        pubkey,
        last,
        unread: unreadChats[pubkey] || 0,
        profile: getProfile(pubkey)
      };
    })
    .filter(c => c.last)
    .sort((a, b) => b.last.created_at - a.last.created_at)
    .slice(0, 20);

  const handleOpenChat = (pubkey: string) => {
    setActiveChatPubkey(pubkey);
    setActiveTab('friends');
    setOpen(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); requestNotificationPermission(); }}
        className="relative p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        title="Mensagens"
      >
        <Bell className="w-5 h-5" />
        {totalUnreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-pulse">
            {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-50 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-80 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Mensagens</h4>
            <span className="text-[10px] font-bold text-slate-400">
              {totalUnreadMessages > 0 ? `${totalUnreadMessages} não lida(s)` : 'Tudo lido'}
            </span>
          </div>

          {/* Status das notificações push */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40">
            <span className={`w-2 h-2 rounded-full shrink-0 ${pushEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {pushEnabled ? 'Notificações push ativas' : 'Push não ativo'}
            </span>
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold">Nenhuma mensagem ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {conversations.map(c => (
                <button
                  key={c.pubkey}
                  onClick={() => handleOpenChat(c.pubkey)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                      alt={c.profile.name}
                      className="w-10 h-10 aspect-square rounded-full object-cover"
                    />
                    {c.unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                        {c.unread > 99 ? '99+' : c.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className={`text-xs truncate ${c.unread > 0 ? 'font-extrabold text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                        {c.profile.display_name || c.profile.name}
                      </h5>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatTime(c.last.created_at)}</span>
                    </div>
                    <p className={`text-[11px] truncate ${c.unread > 0 ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-slate-400'}`}>
                      {c.last.content.length > 70 ? c.last.content.slice(0, 70) + '...' : c.last.content}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
