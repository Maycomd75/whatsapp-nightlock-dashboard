// ============ panel.js CORRIGIDO ============

// Usa a URL da própria página (Render)
const WS_URL = window.location.origin;

console.log("Conectando ao servidor:", WS_URL);

const socket = io(WS_URL, { reconnectionDelayMax: 5000 });

const statusText = document.getElementById("statusText");
const logsArea = document.getElementById("logs");
const qrArea = document.getElementById("qrArea");

// Enviar comando ao bridge.js → pm2 → bot
function sendCmd(cmd) {
  socket.emit("panel:command", cmd);   // <<< CORREÇÃO AQUI
  logsArea.textContent += `\n[PAINEL] Enviado comando: ${cmd}`;
}

// Quando o painel conecta no Render
socket.on("connect", () => {
  console.log("Painel conectado ao servidor Render.");
});

// Recebe status reenviado pelo server.js
socket.on("status", (st) => {  // <<< CORREÇÃO AQUI
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

// Logs em tempo real
socket.on("log", (line) => {   // <<< CORREÇÃO AQUI
  logsArea.textContent += `\n${line}`;
  logsArea.scrollTop = logsArea.scrollHeight;
});

// QR reenviado pelo server.js
socket.on("qr", ({ qr, isRaw }) => {   // <<< CORREÇÃO AQUI
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
