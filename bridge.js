// bridge.js — roda local com PM2
const io = require("socket.io-client");
const pm2 = require("pm2");

if (!process.env.RENDER_WS_URL) {
  console.error("❌ Defina RENDER_WS_URL exemplo:");
  console.error("SET RENDER_WS_URL=https://whatsapp-nightlock-dashboard.onrender.com/");
  process.exit(1);
}

const RENDER_WS_URL = process.env.RENDER_WS_URL;
const BOT_PM2_NAME = process.env.BOT_PM2_NAME || "whatsapp-nightlock";

const socket = io(RENDER_WS_URL, {
  reconnection: true,
  reconnectionDelayMax: 5000,
  transports: ["websocket"]
});

// ==============================
// Conectou ao painel
// ==============================
socket.on("connect", () => {
  console.log("🟢 Bridge conectado ao painel Render");
  sendStatus();
});

// ==============================
// Painel → Server → Bridge
// ==============================
socket.on("command", (cmd) => {
  console.log("⚙ Comando recebido:", cmd);

  pm2.connect(() => {
    if (cmd === "restart") {
      pm2.restart(BOT_PM2_NAME, () => pm2.disconnect());
    } else if (cmd === "stop") {
      pm2.stop(BOT_PM2_NAME, () => pm2.disconnect());
    } else if (cmd === "start") {
      pm2.start(BOT_PM2_NAME, () => pm2.disconnect());
    }
  });
});

// ==============================
// Função para enviar status
// ==============================
function sendStatus() {
  pm2.connect((err) => {
    if (err) {
      socket.emit("bridge:status", { connected: false });
      return;
    }

    pm2.list((err, list) => {
      if (err) {
        socket.emit("bridge:status", { connected: false });
        pm2.disconnect();
        return;
      }

      const bot = list.find(p => p.name === BOT_PM2_NAME);

      if (!bot) {
        socket.emit("bridge:status", { connected: false });
        pm2.disconnect();
        return;
      }

      const st = {
        connected: bot.pm2_env.status === "online",
        status: bot.pm2_env.status,
        cpu: bot.monit?.cpu || 0,
        memory: bot.monit?.memory ? (bot.monit.memory / 1024 / 1024).toFixed(2) : "0",
        uptime: bot.pm2_env.pm_uptime
      };

      socket.emit("bridge:status", st);
      pm2.disconnect();
    });
  });
}

// envia status a cada 15s
setInterval(sendStatus, 15000);

// ==============================
// Logs e QR code
// ==============================
pm2.connect((err) => {
  if (err) return console.error("Erro conectando no PM2:", err);

  pm2.launchBus((err, bus) => {
    if (err) return console.error("Erro PM2 bus:", err);

    console.log("📡 Escutando logs do PM2...");

    bus.on("log:out", (packet) => {
      socket.emit("bridge:log", `${packet.process.name}: ${packet.data}`);

      if (String(packet.data).includes("BRIDGE_QR:")) {
        const qr = packet.data.split("BRIDGE_QR:")[1].trim();
        socket.emit("bridge:qr", { qr, isRaw: true });
      }
    });

    bus.on("log:err", (packet) => {
      socket.emit("bridge:log", `${packet.process.name} ERR: ${packet.data}`);
    });

    bus.on("process:event", () => sendStatus());
  });
});
