import React, { useState, useRef, useLayoutEffect } from 'react';
import { useNostr } from '../../context/NostrContext';
import { useLanguage } from '../../context/LanguageContext';
import { uploadMediaToNostrBuild } from '../../lib/nostr/media';
import { FileAttachmentCard } from '../shared/FileAttachmentCard';
import { 
  Image, 
  Video, 
  Mic, 
  Lock, 
  Globe, 
  Users as GroupIcon, 
  Film, 
  X, 
  Loader2, 
  Send,
  Sparkles
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
  defaultIsReel?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultGroupId, 
  defaultIsReel 
}) => {
  const { createPost, groups, auth, setShowAuthModal } = useNostr();
  const { t } = useLanguage();

  const [content, setContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || '');
  const [isReel, setIsReel] = useState<boolean>(defaultIsReel || false);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Trava síncrona contra clique duplo no botão Publicar (evita postar duas vezes)
  const submittingRef = useRef(false);

  // Ao abrir o modal (ou quando o grupo/reel padrão muda), re-sincroniza o
  // destino da postagem. Sem isso, o componente (que permanece montado mesmo
  // fechado) manteria o grupo de uma abertura anterior e a postagem iria
  // parar no grupo errado.
  useLayoutEffect(() => {
    if (!isOpen) return;
    setSelectedGroupId(defaultGroupId || '');
    setIsReel(defaultIsReel || false);
  }, [isOpen, defaultGroupId, defaultIsReel]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const file = files[0];
      const url = await uploadMediaToNostrBuild(file, (p) => setUploadProgress(p));
      if (url) {
        setMediaUrls(prev => [...prev, url]);
      }
    } catch (err) {
      console.error('Erro no upload de mídia:', err);
      alert('Falha ao enviar arquivo. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Proteção contra clique duplo: ignora cliques enquanto já está publicando
    if (submittingRef.current) return;
    if (!content.trim() && mediaUrls.length === 0) return;

    if (!auth.pubkey) {
      setShowAuthModal(true);
      return;
    }

    setPublishing(true);
    submittingRef.current = true;
    try {
      const success = await createPost(
        content,
        mediaUrls,
        selectedGroupId || undefined,
        isReel,
        isEncrypted
      );

      if (success) {
        setContent('');
        setMediaUrls([]);
        onClose();
      }
    } finally {
      submittingRef.current = false;
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            {t('createPostTitle')}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Opções de Destino: Feed / Grupo / Reel */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setSelectedGroupId(''); setIsReel(false); }}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${
                !selectedGroupId && !isReel 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {t('publicFeed')}
            </button>

            {/* Selector de Grupo */}
            <select
              value={selectedGroupId}
              onChange={(e) => { setSelectedGroupId(e.target.value); setIsReel(false); }}
              className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
            >
              <option value="">{t('postInGroupOption')}</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{t('groupLabel')}: {g.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => { setIsReel(!isReel); setSelectedGroupId(''); }}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${
                isReel 
                  ? 'bg-pink-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              {t('reelShort')}
            </button>
          </div>

          {/* Área de Texto */}
          <textarea
            rows={4}
            placeholder={t('textPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 dark:text-white resize-none"
          />

          <p className="text-[10px] text-slate-400 font-semibold">
            {t('tipCopyId')}
          </p>

          {/* Pré-visualização de Mídias anexadas */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                  {url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                    <video src={url} className="w-full h-32 object-cover" />
                  ) : url.match(/\.(mp3|wav|ogg)(\?.*)?$/i) ? (
                    <audio src={url} controls className="w-full my-4 px-2" />
                  ) : url.match(/\.(pdf|docx?|xlsx?|pptx?|txt|csv)(\?.*)?$/i) ? (
                    <div className="p-2 bg-slate-50 dark:bg-slate-900">
                      <FileAttachmentCard url={url} />
                    </div>
                  ) : (
                    <img src={url} alt="Upload" className="w-full h-32 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Opção Anti-Censura Criptografada */}
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">{t('antiCensorshipClient')}</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">{t('anticensDesc')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isEncrypted}
              onChange={(e) => setIsEncrypted(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
            />
          </div>

          {/* Barra de Progresso do Upload de Mídia */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  Enviando mídia para o servidor...
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

          {/* Botoes de Upload e Envio */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,application/pdf,.pdf"
              className="hidden"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Anexar Foto, Vídeo ou Áudio"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                <span>{t('photoMedia')}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={publishing || (!content.trim() && mediaUrls.length === 0)}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitindo...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('publish')}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

