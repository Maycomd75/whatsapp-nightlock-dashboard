// ============ panel.js (versão aprimorada) ============

// Detecta automaticamente a URL correta do servidor WebSocket
const WS_URL = window.location.origin;

// Para debug
console.log("Conectando ao servidor WebSocket:", WS_URL);

// Conexão WebSocket com ajustes de estabilidade
const socket = io(WS_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 6000,
});

// Seletores
const statusText = document.getElementById("statusText");
const logsArea = document.getElementById("logs");
const qrArea = document.getElementById("qrArea");

// =====================================
// 🔥 ENVIO DE COMANDOS DE PAINEL
// =====================================
let lastCmdTime = 0; // anti-spam básico

function sendCmd(cmd) {
  const now = Date.now();

  // evita flood acidental
  if (now - lastCmdTime < 300) return;
  lastCmdTime = now;

  socket.emit("panel:command", cmd);

  printLog(`[PAINEL] Enviado comando: ${cmd}`);
}

// Função utilitária para imprimir logs corretamente
function printLog(line) {
  if (logsArea.textContent.trim() === "Aguardando logs...") {
    logsArea.textContent = "";
  }

  logsArea.textContent += line + "\n";
  logsArea.scrollTop = logsArea.scrollHeight;
}

// =====================================
// 🔥 EVENTOS DO SOCKET.IO
// =====================================

// Conectado ao servidor Render / local
socket.on("connect", () => {
  console.log("Painel conectado via WebSocket.");
  statusText.style.color = "#4ade80";
});

// Perdeu conexão
socket.on("disconnect", (reason) => {
  statusText.textContent = "🔴 DESCONECTADO — Tentando reconectar...";
  statusText.style.color = "#f87171";
  console.warn("Desconectado:", reason);
});

// Em caso de falha de conexão
socket.on("connect_error", (err) => {
  console.error("Erro de conexão:", err.message);
  statusText.textContent = "⚠️ Erro ao conectar ao servidor";
  statusText.style.color = "#facc15";
});

// =====================================
// 🔥 STATUS DO BOT / BRIDGE
// =====================================
socket.on("status", (st) => {
  if (!st || !st.connected) {
    statusText.textContent = "❌ OFFLINE — Bot ou bridge fora do ar";
    statusText.style.color = "#f87171";
    return;
  }

  statusText.innerHTML = `
    🟢 ONLINE<br>
    Status: <b>${st.status}</b><br>
    CPU: <b>${st.cpu}%</b> • RAM: <b>${st.memory} MB</b>
  `;
  statusText.style.color = "#4ade80";
});

// =====================================
// 🔥 LOGS EM TEMPO REAL
// =====================================
socket.on("log", (line) => {
  if (!line || typeof line !== "string") return;
  printLog(line);
});

// =====================================
// 🔥 QR-CODE (raw image OR ascii)
// =====================================
socket.on("qr", ({ qr, isRaw }) => {
  if (!qr) {
    qrArea.innerHTML = `<span style="color:#999;">Nenhum QR no momento</span>`;
    return;
  }

  // QR como imagem base64
  if (isRaw) {
    qrArea.innerHTML = `
      <img id="qrImg" src="${qr}" style="width:200px;height:200px;image-rendering:pixelated;">
    `;
    return;
  }

  // QR em formato ASCII
  qrArea.innerHTML = `<pre>${qr}</pre>`;
});
