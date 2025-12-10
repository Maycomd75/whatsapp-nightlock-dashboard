// ==================== panel.js (versão atualizada pelo ChatGPT) ====================

// Detecta automaticamente o servidor WebSocket
const WS_URL = window.location.origin;
console.log("Conectando ao servidor WebSocket:", WS_URL);

// Conexão WebSocket
const socket = io(WS_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1200,
  reconnectionDelayMax: 8000,
  timeout: 10000,
});

// Seletores
const statusText = document.getElementById("statusText");
const logsArea = document.getElementById("logs");
const qrArea = document.getElementById("qrArea");

// ------------------------------------
// HEARTBEAT
// ------------------------------------
setInterval(() => {
  if (socket.connected) socket.emit("panel:ping");
}, 5000);

// ------------------------------------
// ENVIAR COMANDOS
// ------------------------------------
let lastCmdTime = 0;

function sendCmd(cmd) {
  const now = Date.now();
  if (now - lastCmdTime < 300) return;
  lastCmdTime = now;

  printLog(`[PAINEL] Enviando comando: ${cmd}`);
  socket.emit("panel:command", cmd);
}

// Logs
function printLog(line) {
  if (logsArea.textContent.trim() === "Aguardando logs...") {
    logsArea.textContent = "";
  }
  logsArea.textContent += line + "\n";
  logsArea.scrollTop = logsArea.scrollHeight;
}

// ------------------------------------
// EVENTOS SOCKET.IO
// ------------------------------------
socket.on("connect", () => {
  statusText.textContent = "🟢 Conectado ao servidor";
  statusText.style.color = "#4ade80";
});

socket.on("disconnect", () => {
  statusText.textContent = "🔴 DESCONECTADO — Tentando reconectar...";
  statusText.style.color = "#ef4444";
});

socket.on("connect_error", () => {
  statusText.textContent = "⚠️ Erro ao conectar — Retentando...";
  statusText.style.color = "#facc15";
});

// ------------------------------------
// STATUS DO BOT
// ------------------------------------
socket.on("status", (st) => {
  if (!st || !st.connected) {
    statusText.textContent = "❌ OFFLINE — Bridge/Bot não encontrado";
    statusText.style.color = "#ef4444";
    return;
  }

  statusText.innerHTML = `
    🟢 ONLINE<br>
    Status: <b>${st.status}</b><br>
    CPU: <b>${st.cpu}%</b> • RAM: <b>${st.memory} MB</b>
  `;
});

// ------------------------------------
// LOGS
// ------------------------------------
socket.on("log", (line) => {
  if (!line) return;
  printLog(line);
});

// ------------------------------------
// QR CODE
// ------------------------------------
socket.on("qr", ({ qr, isRaw }) => {
  if (!qr) {
    qrArea.innerHTML = `<span style="color:#888;">Nenhum QR disponível</span>`;
    return;
  }

  if (isRaw) {
    qrArea.innerHTML = `<img id="qrImg" src="${qr}" style="width:220px; image-rendering:pixelated;">`;
    return;
  }

  qrArea.innerHTML = `<pre>${qr}</pre>`;
});

// ------------------------------------
// GRUPOS (A PARTE QUE VOCÊ PEDIU)
// ------------------------------------
const selector = document.getElementById("groupSelector");
const allowedList = document.getElementById("allowedList");
const blockedList = document.getElementById("blockedList");

// solicitar a lista
function requestGroupList() {
  selector.innerHTML = `<option>Carregando...</option>`;
  sendCmd("list-groups");
}

// receber listas do bridge
socket.on("groups", (data) => {
  if (!data) return;

  // preencher select
  selector.innerHTML = "";
  data.all.forEach(g => {
    const op = document.createElement("option");
    op.value = g.id;
    op.textContent = g.name;
    selector.appendChild(op);
  });

  // preencher PERMITIDOS (grupos desbloqueados)
  allowedList.innerHTML = "";
  data.allowed.forEach(g => {
    allowedList.innerHTML += `<li>${g.name}</li>`;
  });

  // preencher BLOQUEADOS
  blockedList.innerHTML = "";
  data.blocked.forEach(g => {
    blockedList.innerHTML += `<li>${g.name}</li>`;
  });
});

// comandos
function addAllowedGroup() {
  const id = selector.value;
  if (!id) return;
  sendCmd(`allow:${id}`);
}

function addBlockedGroup() {
  const id = selector.value;
  if (!id) return;
  sendCmd(`block:${id}`);
}
