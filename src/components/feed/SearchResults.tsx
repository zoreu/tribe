import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import {
  Search,
  Users,
  User as UserIcon,
  FileText,
  ArrowLeft,
  Copy,
  Check,
  UserPlus,
  ShieldCheck,
  Users as GroupIcon,
  MessageSquare,
  X
} from 'lucide-react';
import { PostCard } from './PostCard';

interface SearchResultsProps {
  query: string;
  onClose: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, onClose }) => {
  const { groups, profiles, posts, getProfile, setSelectedGroupId, setActiveTab, setActiveChatPubkey, isFriend, addFriend } = useNostr();
  const [selectedProfilePubkey, setSelectedProfilePubkey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Grupos que batem com o termo (nome ou descrição)
  const matchingGroups = groups.filter(g =>
    g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
  );

  // Pessoas/perfis que batem com o termo (nome, apelido ou nip05)
  const matchingProfiles = Object.keys(profiles)
    .map(pk => profiles[pk])
    .filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.display_name || '').toLowerCase().includes(q) ||
      (p.nip05 || '').toLowerCase().includes(q)
    )
    .slice(0, 12);

  // Postagens que batem com o termo (conteúdo ou autor)
  const matchingPosts = posts.filter(p =>
    p.content.toLowerCase().includes(q) ||
    (p.author?.name || '').toLowerCase().includes(q) ||
    (p.author?.display_name || '').toLowerCase().includes(q)
  ).slice(0, 20);

  const selectedProfile = selectedProfilePubkey ? getProfile(selectedProfilePubkey) : null;
  const selectedProfilePosts = selectedProfile
    ? posts.filter(p => p.pubkey === selectedProfile.pubkey)
    : [];

  const handleOpenGroup = (id: string) => {
    setSelectedGroupId(id);
    setActiveTab('groups');
    onClose();
  };

  // Abre a conversa privada com a pessoa, como se ela tivesse sido clicada
  // na lista de amigos da aba Amigos & Conversas.
  const handleSendMessage = (pubkey: string) => {
    setActiveChatPubkey(pubkey);
    setActiveTab('friends');
    onClose();
  };

  const handleCopyNpub = (pubkey: string, npub: string) => {
    navigator.clipboard.writeText(npub);
    setCopiedKey(pubkey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (selectedProfile) {
    return (
      <div className="space-y-4">
        {/* Cabeçalho do Perfil Buscado */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selectedProfile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                alt={selectedProfile.name}
                className="w-16 h-16 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {selectedProfile.display_name || selectedProfile.name}
                  </h3>
                  {selectedProfile.nip05 && (
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> {selectedProfile.nip05}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 break-all font-mono">{selectedProfile.npub}</p>
                {selectedProfile.about && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProfile.about}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button
                onClick={() => handleSendMessage(selectedProfile.pubkey)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5"
                title="Abrir conversa privada"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar mensagem
              </button>

              <button
                onClick={() => handleCopyNpub(selectedProfile.pubkey, selectedProfile.npub)}
                className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                title="Copiar chave pública npub"
              >
                {copiedKey === selectedProfile.pubkey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              {!isFriend(selectedProfile.pubkey) ? (
                <button
                  onClick={() => addFriend(selectedProfile.pubkey)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar amigo
                </button>
              ) : (
                <span className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Amigo
                </span>
              )}
            </div>
          </div>

          {/* Postagens do perfil */}
          <div className="p-5 space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Publicações de {selectedProfile.display_name || selectedProfile.name} ({selectedProfilePosts.length})
            </h4>
            {selectedProfilePosts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                Nenhuma publicação encontrada para este perfil.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProfilePosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSelectedProfilePubkey(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para os resultados
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
        <Search className="w-4 h-4 text-indigo-500" />
        <span>Resultados para “{query}”</span>
      </div>

      {/* Pessoas */}
      <section className="space-y-2">
        <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <UserIcon className="w-3.5 h-3.5" /> Pessoas ({matchingProfiles.length})
        </h3>
        {matchingProfiles.length === 0 ? (
          <div className="px-1 text-xs text-slate-400">Nenhuma pessoa encontrada.</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 space-y-1">
            {matchingProfiles.map(profile => (
              <div
                key={profile.pubkey}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <button
                  onClick={() => setSelectedProfilePubkey(profile.pubkey)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <img
                    src={profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={profile.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{profile.display_name || profile.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{profile.nip05 || profile.npub.slice(0, 16) + '...'}</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage(profile.pubkey)}
                  className="shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
                  title="Enviar mensagem privada"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedProfilePubkey(profile.pubkey)}
                  className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  title="Ver perfil completo"
                >
                  Ver perfil →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grupos */}
      <section className="space-y-2">
        <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <GroupIcon className="w-3.5 h-3.5" /> Grupos ({matchingGroups.length})
        </h3>
        {matchingGroups.length === 0 ? (
          <div className="px-1 text-xs text-slate-400">Nenhum grupo encontrado.</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 space-y-1">
            {matchingGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleOpenGroup(group.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
              >
                <img src={group.picture} alt={group.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{group.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{group.description}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Abrir grupo →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Postagens */}
      <section className="space-y-2">
        <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <FileText className="w-3.5 h-3.5" /> Publicações ({matchingPosts.length})
        </h3>
        {matchingPosts.length === 0 ? (
          <div className="px-1 text-xs text-slate-400">Nenhuma publicação encontrada.</div>
        ) : (
          <div className="space-y-4">
            {matchingPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
