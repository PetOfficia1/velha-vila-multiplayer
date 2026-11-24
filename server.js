import { archipelago } from './multiplayer/archipelago.js';
import { createWorld } from './multiplayer/world.js';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

// Protótipo de um ÚNICO mundo compartilhado. Dados ficam em memória.
// Requer exatamente uma instância do serviço no Render (sem scale-out).
const PORT = Number(process.env.PORT || 10000);
const WORLD = 'velha-vila-principal';
const MAX_PLAYERS = 150;
const clients = new Map();
const world = createWorld();
const maps = new Set(['house','surface','cave1','cave2','cave3','castle']);
function updateState(player, event) {
  for (const key of ['x','y']) {
    if (Number.isFinite(event[key]) && Math.abs(event[key]) <= 100000) player[key] = event[key];
  }
  if (maps.has(event.zone) || archipelago.owns(event.zone)) player.zone = event.zone;
  if (Number.isSafeInteger(event.level) && event.level > 0) player.level = Math.min(event.level, 1e9);
}
const bornAt = Date.now();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(x => x.trim()).filter(Boolean);

function onlinePlayers() {
  return [...clients.values()].filter(c => c.player).map(c => c.player);
}
function send(ws, value) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));
}
function broadcast(value, except = null) {
  for (const { ws } of clients.values()) {
    if (ws !== except) send(ws, value);
  }
}
function cleanName(raw) {
  return typeof raw === 'string' ? raw.trim().replace(/[<>\\\x00-\x1f]/g, '').slice(0, 24) : '';
}
function coordinate(value, fallback) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 9999 ? value : fallback;
}
function jsonReply(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/status' || req.url === '/')) {
    return jsonReply(res, 200, {
      ok: true, game: 'Velha Vila', status: 'prototype', world: WORLD,
      online: onlinePlayers().length, uptimeSeconds: Math.floor((Date.now() - bornAt) / 1000)
    });
  }
  return jsonReply(res, 404, { ok: false, error: 'Not found' });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    return socket.destroy();
  }
  if (allowedOrigins.length && !allowedOrigins.includes(req.headers.origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    return socket.destroy();
  }
  if (clients.size >= MAX_PLAYERS) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
});

wss.on('connection', ws => {
  const id = randomUUID();
  const connection = { ws, player: null, alive: true, lastMove: 0 };
  clients.set(id, connection);
  send(ws, { type: 'connected', id, world: WORLD, protocol: 1 });

  ws.on('pong', () => { connection.alive = true; });
  ws.on('message', data => {
    let event;
    try { event = JSON.parse(data.toString()); } catch {
      return send(ws, { type: 'error', message: 'Mensagem JSON inválida' });
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') return;

    if (event.type === 'join') {
      if (connection.player) return send(ws, { type: 'error', message: 'Já entrou no mundo' });
      const name = cleanName(event.name);
      if (!name) return send(ws, { type: 'error', message: 'Informe um nome válido' });
      const p = { id, name, x: coordinate(event.x, 10), y: coordinate(event.y, 10), world: WORLD };
      connection.shared = event.sharedMobs === true;
      if (connection.shared) {
        Object.assign(p,{zone:'house',level:1,family:cleanName(event.family),gender:cleanName(event.gender)});
        updateState(p,event);
      }
      connection.player = p;
      if (connection.shared) send(ws,{type:'welcome',you:id,players:onlinePlayers(),sharedMobs:true});
      send(ws, { type: 'snapshot', you: id, world: WORLD, players: onlinePlayers() });
      broadcast({ type: 'player_joined', player: p }, ws);
      return;
    }

    if (!connection.player) return send(ws, { type: 'error', message: 'Entre primeiro com join' });
    if(connection.shared && event.type==='state') {
      if(Date.now()-connection.lastMove<70) return;
      connection.lastMove=Date.now();
      updateState(connection.player,event);
      broadcast({type:'state',player:connection.player},ws);
      return;
    }
    if(connection.shared && event.type==='mob_hit') {
      const shares=world.hit(connection.player,event,Date.now());
      for(const share of shares || []) {
        const receiver=clients.get(share.id);
        if(receiver) send(receiver.ws,{type:'mob_reward',id:event.id,generation:event.generation,
          xp:share.xp,finisher:share.id===id});
      }
      return;
    }
    if (event.type === 'move') {
      // Apenas sincroniza posições. Ainda não valida mapa, velocidade ou colisões.
      const now = Date.now();
      if (now - connection.lastMove < 70) return;
      connection.lastMove = now;
      const p = connection.player;
      p.x = coordinate(event.x, p.x);
      p.y = coordinate(event.y, p.y);
      broadcast({ type: 'player_moved', player: p });
    } else if (event.type === 'say') {
      const text = typeof event.text === 'string' ? event.text.trim().slice(0, 160) : '';
      if (text) broadcast({ type: 'chat', id, name: connection.player.name, text });
    } else if (event.type === 'ping') {
      send(ws, { type: 'pong', timestamp: Date.now() });
    }
  });
  ws.on('close', () => {
    clients.delete(id);
    if (connection.player) broadcast({ type: 'player_left', id });
  });
  ws.on('error', err => console.warn('WebSocket:', err.message));
});

setInterval(()=>{
  const participants=[...clients.values()].filter(c=>c.shared && c.player);
  if(!participants.length) return;
  world.tick(participants.map(c=>c.player),Date.now(),(p,m)=>send(clients.get(p.id).ws,
    {type:'mob_attack',id:m.id,zone:m.map,dmg:m.dmg,name:m.type}));
  const views=new Map();
  for(const c of participants) {
    const zone=c.player.zone;
    if(!views.has(zone)) views.set(zone,JSON.stringify(world.snapshot(zone)));
    const view=views.get(zone);
    if(c.lastZone===zone && c.lastView===view) continue;
    c.lastZone=zone;c.lastView=view;
    send(c.ws,{type:'mob_world',zone,mobs:JSON.parse(view)});
  }
},100).unref();

const keepalive = setInterval(() => {
  for (const { ws, alive } of clients.values()) {
    if (!alive) { ws.terminate(); continue; }
    const c = [...clients.values()].find(x => x.ws === ws);
    if (c) c.alive = false;
    ws.ping();
  }
}, 30000);
keepalive.unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Velha Vila multiplayer (protótipo) ouvindo na porta ${PORT}; endpoint /ws`);
});
