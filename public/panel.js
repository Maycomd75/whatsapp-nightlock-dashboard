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
  socket.emit("command", cmd);
  logsArea.textContent += `\n[PAINEL] Enviado comando: ${cmd}`;
}

// Quando o painel conecta no Render
socket.on("connect", () => {
  console.log("Painel conectado ao servidor Render.");
});

// Recebe status do bridge.js
socket.on("bridge:status", (st) => {
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
socket.on("bridge:log", (line) => {
  logsArea.textContent += `\n${line}`;
  logsArea.scrollTop = logsArea.scrollHeight;
});

// QR enviado pelo bridge.js
socket.on("bridge:qr", ({ qr, isRaw }) => {
  if (!qr) {
    qrArea.innerHTML = "Nenhum QR no momento.";
    return;
  }

  // QR bruto (imagem base64 ou data:image)
  if (isRaw) {
    qrArea.innerHTML = `<img id="qrImg" src="${qr}">`;
    return;
  }

  // Fallback
  qrArea.textContent = qr;
});
