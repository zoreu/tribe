import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import WebSocket from 'ws';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Em Node.js não existe WebSocket global — fornece a implementação 'ws' para o nostr-tools
useWebSocketImplementation(WebSocket);

// Evita que erros isolados (ex.: falha ao conectar em um relay) derrubem a instância
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err && err.message ? err.message : err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.message ? err.message : err);
});

const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || 'https://tribe.wasmer.app';
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.snort.social'
];

// Chaves VAPID para Web Push. Configure via variáveis de ambiente
// (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) para manter as mesmas chaves entre
// deploys; caso contrário, usa as chaves geradas abaixo.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BCaIOZVdT-UNTAmYZjSwkj-m8dQ35REQWsU6u-WfL7oft4bGVuNzcClPCo6tE094hStkWcbyWMB5DYxNO2wy3hM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'IzNic0vDJeH8ZWryK3JAItbeTx8TrU6hSAoLnGK-Gss';

let vapidMailto = 'mailto:admin@tribe.wasmer.app';
try {
  vapidMailto = `mailto:admin@${new URL(APP_URL).hostname}`;
} catch {}

webpush.setVapidDetails(
  vapidMailto,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const app = express();
app.use(express.json());

// API nunca deve ser cacheada pelo navegador (evita receber 404 em cache de
// versões antigas do servidor)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

// Endpoint de versão para confirmar qual servidor está no ar após o deploy
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '4', push: true });
});
app.get('/api/version', (_req, res) => {
  res.json({ version: '4' });
});

// --- Armazenamento de assinaturas push (memória + persistência em arquivo) ---
const SUBSCRIPTIONS_FILE = path.join(__dirname, '.push-subscriptions.json');
const subscriptions = {};

try {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    Object.assign(subscriptions, JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8')));
  }
} catch (e) {
  console.error('Erro ao carregar assinaturas push:', e);
}

function persistSubscriptions() {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar assinaturas push:', e);
  }
}

app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', (req, res) => {
  const { pubkey, subscription } = req.body || {};
  if (!pubkey || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'pubkey e subscription são obrigatórios' });
  }
  subscriptions[pubkey] = {
    pubkey,
    subscription,
    lastSeen: Date.now(),
    createdAt: Date.now()
  };
  persistSubscriptions();
  console.log(`Push inscrito para ${pubkey.slice(0, 12)}... (${Object.keys(subscriptions).length} assinaturas)`);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { pubkey } = req.body || {};
  if (pubkey) {
    delete subscriptions[pubkey];
    persistSubscriptions();
  }
  res.json({ ok: true });
});

// Ping usado pelo app ao enviar mensagem: "acorda" o servidor (Wasmer hiberna
// quando ocioso) e dispara a verificação de DMs imediatamente, para que a
// notificação push do destinatário seja entregue sem esperar o próximo ciclo.
app.post('/api/push/ping', (_req, res) => {
  res.json({ ok: true, subscriptions: Object.keys(subscriptions).length });
  checkDMs();
});

// Endpoint usado pelo app (quando está aberto e recebe uma DM) para disparar a
// notificação push no dispositivo — caminho confiável, sem depender dos relays.
app.post('/api/push/send', async (req, res) => {
  const { pubkey, senderPubkey, senderName } = req.body || {};
  const sub = pubkey && subscriptions[pubkey];
  if (!sub) {
    return res.status(404).json({ error: 'pubkey não está inscrito em push' });
  }
  // O link deve abrir a conversa com QUEM enviou a mensagem (senderPubkey)
  const chatPubkey = senderPubkey || pubkey;
  const title = senderName ? `Mensagem de ${senderName}` : 'Nova mensagem no Tribe';
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title,
      body: 'Você recebeu uma nova mensagem privada.',
      tag: `dm-${Date.now()}`,
      url: `/?chat=${encodeURIComponent(chatPubkey)}`
    }));
    console.log(`Push acionado pelo app para ${pubkey.slice(0, 12)}... (de ${chatPubkey.slice(0, 12)})`);
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      delete subscriptions[pubkey];
      persistSubscriptions();
    }
    res.status(500).json({ error: err.message || 'Falha ao enviar push' });
  }
});

// Endpoint de diagnóstico: envia uma notificação de teste para a assinatura
// do pubkey informado, permitindo verificar se o caminho push funciona.
app.post('/api/push/test', async (req, res) => {
  const { pubkey } = req.body || {};
  const sub = pubkey && subscriptions[pubkey];
  if (!sub) {
    return res.status(404).json({ error: 'pubkey não está inscrito em push' });
  }
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title: 'Teste de notificação',
      body: 'Se você está vendo isto, as notificações push estão funcionando!',
      tag: `push-test-${Date.now()}`,
      url: '/'
    }));
    console.log(`Push de teste enviado para ${pubkey.slice(0, 12)}...`);
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      delete subscriptions[pubkey];
      persistSubscriptions();
      console.log(`Assinatura de ${pubkey.slice(0, 12)}... expirada, removida.`);
    }
    res.status(500).json({ error: err.message || 'Falha ao enviar teste' });
  }
});

// --- Monitoramento dos relays em busca de mensagens privadas (kind 4) ---
// Usa polling leve com querySync (confirmado funcionando) em relays que servem
// kind 4 via #p, com timeout por relay e intervalo de 30s.
const pool = new SimplePool();
const MONITOR_RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.snort.social'
];

// Não deixa falhas de conexão com um relay derrubarem o servidor (logs reduzidos)
let relayFailures = {};
pool.onRelayConnectionFailure = (relay, err) => {
  const now = Date.now();
  if (!relayFailures[relay] || now - relayFailures[relay] > 60000) {
    relayFailures[relay] = now;
    console.error(`Relay inacessível: ${relay}`);
  }
};

// Cache dos nomes dos remetentes (kind 0) para o título da notificação
const senderNameCache = {};

async function getSenderName(pubkey) {
  if (senderNameCache[pubkey]) return senderNameCache[pubkey];
  try {
    const ev = await Promise.race([
      pool.get(MONITOR_RELAYS, { kinds: [0], authors: [pubkey], limit: 1 }),
      new Promise(resolve => setTimeout(() => resolve(null), 4000))
    ]);
    if (ev) {
      const meta = JSON.parse(ev.content || '{}');
      const name = meta.display_name || meta.name || '';
      if (name) {
        senderNameCache[pubkey] = name;
        return name;
      }
    }
  } catch {}
  return '';
}

async function sendPush(sub, tag, senderPubkey) {
  const senderName = senderPubkey ? await getSenderName(senderPubkey) : '';
  const title = senderName ? `Message from ${senderName}` : 'New message on Tribe';
  // Abre a conversa com quem enviou (senderPubkey), não com o destinatário
  const chatPubkey = senderPubkey || sub.pubkey;
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title,
      body: 'You have received a new private message.',
      tag,
      url: `/?chat=${encodeURIComponent(chatPubkey)}`
    }));
    console.log(`Push enviado para ${sub.pubkey.slice(0, 12)}... (${title})`);
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Assinatura expirada/removida — limpa a assinatura
      delete subscriptions[sub.pubkey];
      persistSubscriptions();
    } else {
      console.error('Erro ao enviar push:', err.message || err);
    }
  }
}

// Subscrição persistente removida: relays públicos não transmitem kind 4 em
// tempo real para assinantes de forma confiável. O monitor usa polling (abaixo)
// e o app aberto aciona o push diretamente via /api/push/send.

let checking = false;

async function checkOneUser(pk, sub) {
  const filter = { kinds: [4], '#p': [pk], limit: 10 };

  // Consulta cada relay em paralelo (com timeout individual) e une os
  // resultados. Assim, se um relay devolver uma DM antiga primeiro, o
  // monitor ainda vê a mais nova do outro relay.
  let events = [];
  try {
    const results = await Promise.all(
      MONITOR_RELAYS.map(relay =>
        Promise.race([
          pool.querySync([relay], filter).catch(() => []),
          new Promise(resolve => setTimeout(() => resolve([]), 5000))
        ])
      )
    );
    events = results.flat();
  } catch (e) {
    return; // falha de conexão pontual — tenta no próximo ciclo
  }

  if (!events || events.length === 0) return;

  // A DM mais nova (por created_at)
  const newest = events.reduce((a, b) => (a.created_at > b.created_at ? a : b));
  const createdMs = newest.created_at * 1000;

  if (!sub.lastSeen) {
    // Primeira verificação: define a linha de base e não notifica mensagens antigas
    sub.lastSeen = Date.now();
    persistSubscriptions();
    return;
  }

  if (createdMs > sub.lastSeen) {
    sub.lastSeen = Date.now();
    persistSubscriptions();
    console.log(`DM novo detectado para ${pk.slice(0, 12)}... (${events.length} DMs, mais nova ${newest.created_at})`);
    sendPush(sub, `dm-${newest.id}`, newest.pubkey);
  }
}

async function checkDMs() {
  if (checking) return;
  const entries = Object.entries(subscriptions);
  if (entries.length === 0) return;
  checking = true;
  try {
    // Processa todos os usuários inscritos em paralelo
    await Promise.all(entries.map(([pk, sub]) => checkOneUser(pk, sub)));
  } catch (e) {
    console.error('Erro no monitor de DMs:', e.message || e);
  } finally {
    checking = false;
  }
}

// Polling a cada 10s para reduzir o atraso da notificação (app fechado)
setInterval(checkDMs, 10000);

// --- Serve o app estático (dist) ---
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Tribe server rodando na porta http://localhost:${PORT}`);
  checkDMs();
});
