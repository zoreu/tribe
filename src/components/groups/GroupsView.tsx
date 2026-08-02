import React, { useState, useEffect, useRef } from 'react';
import { useNostr } from '../../context/NostrContext';
import {
  Users as GroupIcon, 
  PlusCircle, 
  ShieldCheck, 
  Pin, 
  Trash2, 
  Info, 
  Check, 
  Share2, 
  X,
  Sparkles,
  Pencil,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PostCard } from '../feed/PostCard';
import { CreatePostModal } from '../feed/CreatePostModal';

export const GroupsView: React.FC = () => {
  const { 
    groups, 
    posts, 
    createGroup, 
    updateGroup, 
    leaveGroup, 
    rejoinGroup, 
    joinGroup, 
    joinedGroupIds, 
    selectedGroupId, 
    setSelectedGroupId, 
    leftGroups, 
    auth, 
    deleteGroupPostModeration, 
    getShareableUrl,
    getProfile,
    client,
    deepLink
  } = useNostr();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Form para edição de grupo
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [newModerator, setNewModerator] = useState('');

  // Quando o usuário abre um link de grupo compartilhado (?group=...), seleciona o grupo
  // assim que a definição dele for carregada dos relays. Aplica apenas UMA vez para não
  // sobrescrever a seleção manual do usuário quando novos eventos de grupo chegarem dos relays.
  const appliedDeepLinkGroupRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      deepLink.groupId &&
      appliedDeepLinkGroupRef.current !== deepLink.groupId &&
      groups.some(g => g.id === deepLink.groupId)
    ) {
      appliedDeepLinkGroupRef.current = deepLink.groupId;
      setSelectedGroupId(deepLink.groupId);
    }
  }, [deepLink.groupId, groups, setSelectedGroupId]);

  // Form para novo grupo
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPic, setGroupPic] = useState('');
  const [groupBanner, setGroupBanner] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const activeGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const groupPosts = posts.filter(p => p.groupId === activeGroup?.id);

  const isModerator = activeGroup?.moderators.includes(auth.pubkey) || activeGroup?.creatorPubkey === auth.pubkey;
  const isCreator = activeGroup?.creatorPubkey === auth.pubkey;
  const isJoined = activeGroup ? joinedGroupIds.includes(activeGroup.id) : false;

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !groupDesc.trim()) return;

    const newG = await createGroup(groupName, groupDesc, groupPic, groupBanner);
    setSelectedGroupId(newG.id);
    setShowCreateModal(false);
    setGroupName('');
    setGroupDesc('');
    setGroupPic('');
    setGroupBanner('');
  };

  const handleShareGroup = () => {
    if (!activeGroup) return;
    const url = getShareableUrl('group', activeGroup.id);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openEditModal = () => {
    if (!activeGroup) return;
    setEditName(activeGroup.name);
    setEditDesc(activeGroup.description);
    setEditPic(activeGroup.picture || '');
    setEditBanner(activeGroup.banner || '');
    setNewModerator('');
    setShowEditModal(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !editName.trim()) return;
    await updateGroup(activeGroup.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      picture: editPic.trim() || undefined,
      banner: editBanner.trim() || undefined
    });
    setShowEditModal(false);
  };

  const handleAddModerator = () => {
    if (!activeGroup || !newModerator.trim()) return;
    const clean = newModerator.trim();
    const hex = clean.startsWith('npub1') ? client.npubToHex(clean) : clean;
    if (!hex || hex.length !== 64) {
      alert('Identificador inválido. Informe um npub1... ou chave pública hex.');
      return;
    }
    if (!activeGroup.moderators.includes(hex)) {
      updateGroup(activeGroup.id, { moderators: [...activeGroup.moderators, hex] });
      setNewModerator('');
    }
  };

  const handleRemoveModerator = (pk: string) => {
    if (!activeGroup) return;
    if (pk === activeGroup.creatorPubkey) return; // criador não pode ser removido
    updateGroup(activeGroup.id, { moderators: activeGroup.moderators.filter(m => m !== pk) });
  };

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    if (!confirm(`Deseja realmente sair do grupo "${activeGroup.name}"?`)) return;
    leaveGroup(activeGroup.id);
    if (selectedGroupId === activeGroup.id) {
      const nextGroup = groups.find(g => g.id !== activeGroup.id);
      setSelectedGroupId(nextGroup?.id || '');
    }
  };

  const handleRejoinGroup = (groupId: string) => {
    rejoinGroup(groupId);
    setSelectedGroupId(groupId);
  };

  const handleJoinGroup = () => {
    if (!activeGroup) return;
    joinGroup(activeGroup.id);
  };

  const scrollCarousel = (direction: number) => {
    carouselRef.current?.scrollBy({ left: direction * 340, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Grupos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <GroupIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Grupos & Comunidades</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Redes comunitárias moderadas de forma descentralizada</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Grupo</span>
        </button>
      </div>

      {/* Carrossel de Grupos */}
      {groups.length > 0 && (
        <div className="relative">
          <button
            onClick={() => scrollCarousel(-1)}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            ref={carouselRef}
            className="flex items-stretch gap-3 overflow-x-auto scroll-smooth scrollbar-none px-2 py-2"
          >
            {groups.map(g => {
              const isActive = g.id === activeGroup?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`min-w-[170px] w-[170px] shrink-0 rounded-2xl p-3 text-left flex flex-col gap-2 border transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className={`relative rounded-xl overflow-hidden ${isActive ? 'ring-2 ring-white/40' : ''}`}>
                    <img src={g.picture} alt={g.name} className="w-full h-20 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </div>
                  <span className="text-xs font-bold truncate">{g.name}</span>
                  <span className={`text-[10px] leading-snug line-clamp-2 ${isActive ? 'text-emerald-50/90' : 'text-slate-400'}`}>
                    {g.description}
                  </span>
                  <span className={`text-[9px] font-bold flex items-center gap-1 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                    <GroupIcon className="w-3 h-3" />
                    {g.moderators?.length || 1} moderador(es)
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scrollCarousel(1)}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            title="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Grupos dos quais o usuário saiu (com opção de entrar novamente) */}
      {leftGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Grupos que você saiu
            </h4>
          </div>
          <div className="space-y-2">
            {leftGroups.map(lg => (
              <div
                key={lg.id}
                className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={lg.picture} alt={lg.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{lg.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{lg.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRejoinGroup(lg.id)}
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                  title="Entrar novamente no grupo"
                >
                  <GroupIcon className="w-3.5 h-3.5" />
                  <span>Entrar de novo</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhes e Banner do Grupo Selecionado ou Estado Vazio */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <GroupIcon className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Nenhum Grupo Criado Ainda</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            A plataforma está totalmente limpa. Seja o primeiro a inaugurar uma comunidade ou grupo moderado descentralizado no Tribe!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Criar Primeira Comunidade</span>
          </button>
        </div>
      ) : activeGroup && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4">
          
          {/* Cover Banner */}
          <div className="h-40 sm:h-52 w-full relative bg-gradient-to-r from-emerald-600 to-teal-700">
            {activeGroup.banner && (
              <img src={activeGroup.banner} alt={activeGroup.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          </div>

          {/* Header Info (abaixo do banner, sem sobrepor) */}
          <div className="p-6 flex items-start gap-4">
            <img
              src={activeGroup.picture}
              alt={activeGroup.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-lg shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">{activeGroup.name}</h3>
                {isJoined && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Você é Membro
                  </span>
                )}
                {isModerator && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Você é Moderador
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">{activeGroup.description}</p>
              {activeGroup.moderators && activeGroup.moderators.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Moderadores:
                  </span>
                  {activeGroup.moderators.map(pk => {
                    const mod = getProfile(pk);
                    return (
                      <span
                        key={pk}
                        className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full"
                        title={pk}
                      >
                        {mod?.display_name || mod?.name || `${pk.slice(0, 8)}...`}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Regras do Grupo */}
          {activeGroup.rules && activeGroup.rules.length > 0 && (
            <div className="mx-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Regras de Convivência da Comunidade</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 pl-5 list-disc">
                {activeGroup.rules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Barra de Ações do Grupo (padronizada) */}
          <div className="px-6 pb-2">
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-4">
              {isJoined ? (
                <>
                  {isModerator && (
                    <button
                      onClick={openEditModal}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                      title="Editar grupo e gerenciar moderadores"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}

                  <button
                    onClick={handleShareGroup}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                    title="Compartilhar Link do Grupo"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copiado' : 'Compartilhar'}</span>
                  </button>

                  {!isCreator && (
                    <button
                      onClick={handleLeaveGroup}
                      className="px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                      title="Sair do grupo"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowPostModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Postar no Grupo</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleJoinGroup}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                    title="Entrar neste grupo"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Participar</span>
                  </button>

                  <button
                    onClick={handleShareGroup}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                    title="Compartilhar Link do Grupo"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copiado' : 'Compartilhar'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Feed de Posts do Grupo */}
          <div className="p-6 pt-2 space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Publicações no Grupo ({groupPosts.length})
            </h4>

            {groupPosts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl text-slate-400 space-y-2">
                <p className="text-xs font-bold">Nenhum post publicado neste grupo ainda.</p>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Seja o primeiro a publicar algo aqui!
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {groupPosts.map(post => (
                  <div key={post.id} className="relative group">
                    <PostCard post={post} />
                    {isModerator && (
                      <button
                        onClick={() => deleteGroupPostModeration(activeGroup.id, post.id)}
                        className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-bold z-20"
                        title="Moderação: Remover do grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover (Mod)</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal Criar Grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Criar Novo Grupo Tribe</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateGroupSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Grupo:</label>
                <input
                  type="text"
                  placeholder="Ex: Cripto & Liberdade"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descrição:</label>
                <textarea
                  rows={3}
                  placeholder="Do que se trata o seu grupo..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">URL da Foto do Grupo (Opcional):</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={groupPic}
                  onChange={(e) => setGroupPic(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">URL da Capa do Banner (Opcional):</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={groupBanner}
                  onChange={(e) => setGroupBanner(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2"
              >
                Criar Comunidade
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Grupo */}
      {showEditModal && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Editar Grupo
              </h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Dados do Grupo */}
              <form onSubmit={handleSaveGroup} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Grupo:</label>
                  <input
                    type="text"
                    placeholder="Ex: Cripto & Liberdade"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Descrição:</label>
                  <textarea
                    rows={3}
                    placeholder="Do que se trata o seu grupo..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">URL da Foto do Grupo:</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editPic}
                    onChange={(e) => setEditPic(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">URL da Capa do Banner:</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editBanner}
                    onChange={(e) => setEditBanner(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Salvar Alterações do Grupo
                </button>
              </form>

              {/* Gerenciamento de Moderadores */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Moderadores
                </h4>

                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {activeGroup.moderators.map(pk => {
                    const mod = getProfile(pk);
                    const isCreator = pk === activeGroup.creatorPubkey;
                    return (
                      <div
                        key={pk}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={mod?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt={mod?.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {mod?.display_name || mod?.name || `${pk.slice(0, 8)}...`}
                              {isCreator && <span className="ml-1 text-[9px] text-amber-500 font-extrabold">(Criador)</span>}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono truncate">{pk.slice(0, 20)}...</p>
                          </div>
                        </div>
                        {!isCreator && (
                          <button
                            onClick={() => handleRemoveModerator(pk)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0"
                            title="Remover moderador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Adicionar moderador por npub1... ou chave hex"
                    value={newModerator}
                    onChange={(e) => setNewModerator(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddModerator}
                    className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Postar no Grupo */}
      <CreatePostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        defaultGroupId={activeGroup?.id}
      />
    </div>
  );
};
