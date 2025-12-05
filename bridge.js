// bridge.js — roda local, NÃO modifica o bot
// Requisitos: node, pm2 instalado (já que seu bot usa pm2)
// npm i socket.io-client pm2

const io = require("socket.io-client");
const pm2 = require("pm2");
const os = require("os");

if (!process.env.RENDER_WS_URL) {
  console.error("Defina RENDER_WS_URL (ex: https://seu-painel.onrender.com)");
  process.exit(1);
}
const RENDER_WS_URL = process.env.RENDER_WS_URL; // exemplo: https://seu-painel.onrender.com

const socket = io(RENDER_WS_URL, { reconnectionDelayMax: 5000 });

let BOT_PM2_NAME = process.env.BOT_PM2_NAME || 'whatsapp-nightlock'; // ajuste se seu PM2 usa outro nome

socket.on('connect', () => {
  console.log('➤ Bridge conectado ao painel (Render)');
  sendStatus();
});

// recebe comandos do painel e aplica localmente (via pm2)
socket.on('command', async (cmd) => {
  console.log('Comando recebido do painel:', cmd);
  if (cmd === 'restart') {
    pm2.connect(() => {
      pm2.restart(BOT_PM2_NAME, (err) => {
        if (err) console.error('Erro ao restart pm2', err);
        else console.log('Bot reiniciado via bridge.');
        pm2.disconnect();
      });
    });
  } else if (cmd === 'stop') {
    pm2.connect(() => {
      pm2.stop(BOT_PM2_NAME, () => { pm2.disconnect(); });
    });
  } else if (cmd === 'start') {
    pm2.connect(() => {
      pm2.start(BOT_PM2_NAME, () => { pm2.disconnect(); });
    });
  }
});

// envia status com info do PM2
async function sendStatus() {
  pm2.connect((err) => {
    if (err) {
      console.error('pm2 connect err', err);
      socket.emit('bridge:status', { connected: false });
      return;
    }
    pm2.list((err, list) => {
      if (err) {
        socket.emit('bridge:status', { connected: false });
        pm2.disconnect();
        return;
      }
      const bot = list.find(p => p.name === BOT_PM2_NAME);
      if (!bot) {
        socket.emit('bridge:status', { connected: false });
        pm2.disconnect();
        return;
      }
      const st = {
        connected: bot.pm2_env.status === 'online',
        cpu: bot.monit?.cpu || 0,
        memory: bot.monit?.memory ? (bot.monit.memory/1024/1024).toFixed(2) : null,
        uptime: bot.pm2_env.pm_uptime,
        status: bot.pm2_env.status
      };
      socket.emit('bridge:status', st);
      pm2.disconnect();
    });
  });
}

// envia periodicamente status
setInterval(sendStatus, 15_000);

// conecta ao pm2 bus para enviar logs em tempo real
pm2.connect((err) => {
  if (err) {
    console.error('Erro pm2.connect', err);
    return;
  }
  pm2.launchBus((err, bus) => {
    if (err) return console.error(err);
    console.log('Bridge escutando logs do PM2...');
    bus.on('log:out', (packet) => {
      // packet.data contém a linha de stdout
      const line = `${packet.process.name}: ${packet.data}`;
      socket.emit('bridge:log', line);

      // Detect QR raw if bot prints a special prefix 'BRIDGE_QR:'
      if (typeof packet.data === 'string' && packet.data.includes('BRIDGE_QR:')) {
        const idx = packet.data.indexOf('BRIDGE_QR:');
        const qr = packet.data.slice(idx + 'BRIDGE_QR:'.length).trim();
        // se qr for uma url (startsWith 'http' or 'data:image'), set isRaw true
        const isRaw = true;
        socket.emit('bridge:qr', { qr, isRaw });
      }
    });

    bus.on('log:err', (packet) => {
      const line = `${packet.process.name} ERR: ${packet.data}`;
      socket.emit('bridge:log', line);
    });

    // opcional: reemit process events
    bus.on('process:event', () => sendStatus());
  });
});
