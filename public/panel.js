// ============ panel.js ============

// Usa a URL da própria página (Render)
const WS_URL = window.location.origin;

console.log("Conectando ao servidor:", WS_URL);

const socket = io(WS_URL, { reconnectionDelayMax: 5000 });

const statusText = document.getElementById("statusText");
const logsArea = document.getElementById("logs");
const qrArea = document.getElementById("qrArea");

// Enviar comando ao bridge.js → pm2 → bot
function sendCmd(cmd) {
  socket.emit("panel:command", cmd);

  // Garante quebra de linha correta
  if (logsArea.textContent.trim() === "Aguardando logs...") {
    logsArea.textContent = "";
  }

  logsArea.textContent += `[PAINEL] Enviado comando: ${cmd}\n`;
  logsArea.scrollTop = logsArea.scrollHeight;
}

// Quando o painel conecta no Render
socket.on("connect", () => {
  console.log("Painel conectado ao servidor Render.");
});

// Recebe status reemitido pelo server.js
socket.on("status", (st) => {
  if (!st || !st.connected) {
    statusText.textContent = "❌ OFFLINE — Bridge ou bot fora do ar";
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
// 🔥 Logs em tempo real (corrigido)
// =====================================
socket.on("log", (line) => {

  // Caso o painel ainda esteja com texto inicial
  if (logsArea.textContent.trim() === "Aguardando logs...") {
    logsArea.textContent = "";
  }

  // Garante formatação correta
  if (!line || typeof line !== "string") return;

  logsArea.textContent += line + "\n";

  // Auto scroll
  logsArea.scrollTop = logsArea.scrollHeight;
});

// QR enviado pelo bridge.js (repassado pelo server.js)
socket.on("qr", ({ qr, isRaw }) => {
  if (!qr) {
    qrArea.innerHTML = "Nenhum QR no momento.";
    return;
  }

  if (isRaw) {
    qrArea.innerHTML = `<img id="qrImg" src="${qr}">`;
    return;
  }

  qrArea.textContent = qr;
});
