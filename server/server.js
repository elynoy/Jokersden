const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// serve o cliente estático (só para testes locais; em produto o Vercel serve)
app.use(express.static(path.join(__dirname, '../client')));

/* ---------- baralho base: 108 cartas ---------- */
const NAIPES = ['♠','♥','♦','♣'];
const VALORES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const BARALHO = [];
for (let b = 0; b < 2; b++) for (let n of NAIPES) for (let v of VALORES) BARALHO.push({n,v});
for (let j = 0; j < 4; j++) BARALHO.push({n:'Joker',v:'JOKER'});

let idGlobal = 0; // ID único global

io.on('connection', socket => {
  console.log('Jogador conectado:', socket.id);
  socket.emit('message', 'Bem-vindo ao Triple Run!');

  socket.on('darCartas', () => {
    console.log('darCartas recebido');
    // cria baralho com ID único
    const baralho = [...BARALHO].map(c => ({ ...c, id: ++idGlobal }));
    shuffle(baralho);
    const mao = baralho.splice(0,13); // remove 13 cartas
    socket.emit('cartasDistribuidas', mao);
  });
});

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));
