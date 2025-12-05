// dashboard/server.js
// Socket.IO server + static frontend (para subir no Render)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Conexões de bridges (clients locais) e de navegadores (painel)
io.on('connection', socket => {
  console.log('Socket conectado:', socket.id);

  // Recebe eventos vindos do bridge local
  socket.on('bridge:status', (data) => {
    // reemitir para todos os painéis (browsers)
    io.emit('status', data);
  });

  socket.on('bridge:log', (data) => {
    io.emit('log', data);
  });

  socket.on('bridge:qr', (data) => {
    // data: { qr: 'data-or-raw-string', isRaw:true/false }
    io.emit('qr', data);
  });

  socket.on('bridge:groups', (data) => {
    io.emit('groups', data);
  });

  // Painel pediu comando (ex: restart) -> repassa para bridge (apenas 1 bridge normalmente)
  socket.on('panel:command', (cmd) => {
    console.log('Comando vindo do painel:', cmd);
    // envia para all bridges (bridge local deverá escutar)
    io.emit('command', cmd);
  });
});

server.listen(PORT, () => console.log(`Painel rodando em :${PORT}`));
