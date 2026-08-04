import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { 
  User, 
  Edit3, 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  Grid, 
  Image, 
  X, 
  Loader2, 
  LogOut 
} from 'lucide-react';
import { PostCard } from '../feed/PostCard';
import { uploadMediaToNostrBuild } from '../../lib/nostr/media';
import { FileAttachmentCard } from '../shared/FileAttachmentCard';
import { useLanguage } from '../../context/LanguageContext';

export const ProfileView: React.FC = () => {
  const { auth, updateProfile, posts, setShowAuthModal, logout, viewProfilePubkey, setViewProfilePubkey, getProfile, client } = useNostr();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Perfil sendo visualizado: o próprio usuário ou outro (clique em avatar/nome)
  const isOwnProfile = !viewProfilePubkey || viewProfilePubkey === auth.pubkey;
  const targetPubkey = viewProfilePubkey || auth.pubkey;
  const profile = isOwnProfile
    ? (auth.profile || getProfile(auth.pubkey))
    : getProfile(targetPubkey);
  const profileNpub = isOwnProfile ? auth.npub : client.hexToNpub(targetPubkey);

  // Form de Edição de Perfil
  const [name, setName] = useState(auth.profile?.name || '');
  const [displayName, setDisplayName] = useState(auth.profile?.display_name || '');
  const [about, setAbout] = useState(auth.profile?.about || '');
  const [picture, setPicture] = useState(auth.profile?.picture || '');
  const [banner, setBanner] = useState(auth.profile?.banner || '');
  const [nip05, setNip05] = useState(auth.profile?.nip05 || '');
  const [lud16, setLud16] = useState(auth.profile?.lud16 || '');

  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');

  if (!auth.pubkey) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <User className="w-16 h-16 text-blue-500 mx-auto" />
        <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">{t('profileNoNostr')}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Conecte sua extensão Nostr ou crie uma nova conta para gerenciar seu perfil descentralizado.
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
        >
          Entrar ou Criar Conta
        </button>
      </div>
    );
  }

  const userPosts = posts.filter(p => p.pubkey === targetPubkey);
  const mediaPosts = userPosts.filter(p => p.media && p.media.length > 0);

  const handleCopyNpub = () => {
    navigator.clipboard.writeText(profileNpub);
    setCopiedNpub(true);
    setTimeout(() => setCopiedNpub(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const url = await uploadMediaToNostrBuild(files[0]);
      if (url) setPicture(url);
    } catch {}
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const url = await uploadMediaToNostrBuild(files[0]);
      if (url) setBanner(url);
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const success = await updateProfile({
      name,
      display_name: displayName,
      about,
      picture,
      banner,
      nip05,
      lud16
    });
    setUpdating(false);
    if (success) {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Barra de volta quando visualizando o perfil de outro usuário */}
      {!isOwnProfile && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Visualizando o perfil de{' '}
            <span className="text-blue-600 dark:text-blue-400">{profile?.display_name || profile?.name || 'usuário'}</span>
          </p>
          <button
            onClick={() => setViewProfilePubkey(null)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Voltar ao meu perfil
          </button>
        </div>
      )}

      {/* Cartão de Cabeçalho do Perfil estilo Facebook */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        
        {/* Capa Banner */}
        <div className="h-44 sm:h-56 w-full relative bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 overflow-hidden">
          {profile?.banner && (
            <img src={profile.banner} alt="Banner" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        </div>

        {/* Informações Principais */}
        <div className="p-5 sm:p-6 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1">
            {/* Apenas o Avatar tem margem negativa para sobrepor o banner */}
            <img
              src={profile?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
              alt="Avatar"
              className="-mt-16 sm:-mt-20 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl shrink-0 z-10"
            />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white leading-tight">
                  {profile?.display_name || profile?.name || (isOwnProfile ? t('yourName') : t('user'))}
                </h2>
                {profile?.nip05 && (
                  <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> {profile.nip05}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed whitespace-pre-line">
                {profile?.about || 'Nenhuma biografia adicionada ainda.'}
              </p>

              {/* Endereço Npub e Lightning */}
              <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
                <button
                  onClick={handleCopyNpub}
                  className="p-1.5 px-2.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-mono text-[11px] flex items-center gap-1.5 transition-colors"
                  title="Copiar npub"
                >
                  {copiedNpub ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{profileNpub.slice(0, 16)}...</span>
                </button>

                {profile?.lud16 && (
                  <span className="text-amber-500 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl">
                    <Zap className="w-3.5 h-3.5 fill-amber-500" /> {profile.lud16}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botões (apenas no próprio perfil) */}
          {isOwnProfile && (
            <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-none py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>{t('editProfile')}</span>
              </button>

              <button
                onClick={logout}
                className="p-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors shrink-0"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navegação de Abas do Perfil */}
        <div className="px-6 border-t border-slate-100 dark:border-slate-700 flex gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>{isOwnProfile ? t('myPosts') : t('posts')} ({userPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'media' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Mídias ({mediaPosts.length})</span>
          </button>
        </div>

      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {userPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-700">
              {isOwnProfile
                ? t('noPostsYet')
                : t('noPostsUser')}
            </div>
          ) : (
            userPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaPosts.map(post => (
            post.media.map((m, idx) => (
              <div key={post.id + idx} className="rounded-2xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                {m.type === 'file' ? (
                  <div className="w-full h-full p-2">
                    <FileAttachmentCard url={m.url} />
                  </div>
                ) : (
                  <img src={m.url} alt="Mídia do usuário" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                )}
              </div>
            ))
          ))}
        </div>
      )}

      {/* Modal Editar Perfil */}
      {isEditing && isOwnProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{t('manageProfile')}</h3>
              <button onClick={() => setIsEditing(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('displayNameLabel')}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('aboutLabel')}</label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('avatarUrlLabel')}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={picture}
                    onChange={(e) => setPicture(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <label className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center">
                    Upload
                    <input type="file" onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('bannerUrlLabel')}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <label className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center">
                    Upload
                    <input type="file" onChange={handleBannerUpload} accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Identificador NIP-05 (Ex: voce@domain.com):</label>
                <input
                  type="text"
                  value={nip05}
                  onChange={(e) => setNip05(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('lightningLabel')}</label>
                <input
                  type="text"
                  value={lud16}
                  onChange={(e) => setLud16(e.target.value)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('saveTransmit')}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
