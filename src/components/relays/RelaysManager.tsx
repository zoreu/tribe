import React, { useState } from 'react';
import { useNostr } from '../../context/NostrContext';
import { Radio, Plus, Trash2, ShieldCheck, X, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface RelaysManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RelaysManager: React.FC<RelaysManagerProps> = ({ isOpen, onClose }) => {
  const { 
    relays, 
    addRelay, 
    removeRelay, 
    toggleRelay,
    autoReconnect,
    toggleAutoReconnect,
    reconnectRelays,
    isReconnecting
  } = useNostr();

  const [newRelayUrl, setNewRelayUrl] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelayUrl.trim()) return;
    addRelay(newRelayUrl);
    setNewRelayUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Gerenciador de Relays Nostr</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Servidores WebSocket descentralizados da rede</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Reconexão Automática */}
        <div className="px-5 py-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className={`w-4 h-4 shrink-0 ${autoReconnect ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Reconexão Automática</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {autoReconnect ? 'Monitora e reconecta automaticamente se a conexão cair' : 'Desativado (manual)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleAutoReconnect}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoReconnect ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoReconnect ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>

            <button
              onClick={() => reconnectRelays()}
              disabled={isReconnecting}
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all"
              title="Testar e Reconectar Todos os Relays Agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Reconectar</span>
            </button>
          </div>
        </div>

        {/* Form Adicionar Relay */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="wss://meu-relay-custom.com"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newRelayUrl.trim()}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>
        </div>

        {/* Lista de Relays */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {relays.map((relay) => {
            const isConnected = relay.read && relay.status === 'connected';
            const isError = relay.status === 'error' || relay.status === 'disconnected';

            return (
              <div
                key={relay.url}
                className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span 
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      !relay.read 
                        ? 'bg-slate-400' 
                        : isConnected 
                          ? 'bg-emerald-500 animate-pulse' 
                          : isError 
                            ? 'bg-rose-500' 
                            : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">{relay.url}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleRelay(relay.url)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      !relay.read 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        : isConnected
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {!relay.read ? 'Desativado' : isConnected ? 'Conectado' : 'Reconectando...'}
                  </button>

                  <button
                    onClick={() => removeRelay(relay.url)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Remover Relay"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Informativo */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Sua conexão publica em múltiplos relays simultaneamente, garantindo redundância contra quedas.</span>
        </div>

      </div>
    </div>
  );
};
