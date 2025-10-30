const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// só serve os estáticos para testes locais; em produto o Vercel serve
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', socket => {
  console.log('Jogador conectado:', socket.id);
  socket.emit('message', 'Bem-vindo ao Triple Run!');

  socket.on('darCartas', () => {
    console.log('darCartas recebido');
    // gera 13 cartas aleatórias
    const NAIPES = ['♠','♥','♦','♣'];
    const VALORES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const BARALHO = [];
    for (let b = 0; b < 2; b++) for (let n of NAIPES) for (let v of VALORES) BARALHO.push({n,v});
    for (let j = 0; j < 4; j++) BARALHO.push({n:'Joker',v:'JOKER'});
    for (let i = BARALHO.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [BARALHO[i], BARALHO[j]] = [BARALHO[j], BARALHO[i]]; }
    const mao = BARALHO.slice(0,13);
    socket.emit('cartasDistribuidas', mao);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));
