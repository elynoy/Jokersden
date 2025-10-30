const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IMPORTANTE: serve a pasta client que está ao mesmo nível que server/
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', socket => {
  console.log('Jogador conectado:', socket.id);
  socket.emit('message', 'Bem-vindo ao Triple Run!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));