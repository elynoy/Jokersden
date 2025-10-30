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
let baralhoCompleto = []; // baralho com IDs únicos
let monte = []; // monte de cartas
let descarte = []; // descarte de cartas

function baralhar() {
  const baralho = [...BARALHO].map(c => ({ ...c, id: ++idGlobal }));
  shuffle(baralho);
  return baralho;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

io.on('connection', socket => {
  console.log('Jogador conectado:', socket.id);
  socket.emit('message', 'Bem-vindo ao Jokers Den');

  socket.on('darCartas', () => {
    console.log('darCartas recebido');
    // cria baralho com ID único
    baralhoCompleto = baralhar();
    const mao = baralhoCompleto.splice(0,13); // remove 13 cartas
    monte = baralhoCompleto; // resto vai para o monte
    descarte = []; // limpa descarte
    socket.emit('cartasDistribuidas', mao);
  });

 socket.on('tirarCarta', () => {
  if (monte.length === 0 && descarte.length === 0) {
    socket.emit('message', 'Sem cartas');
    return;
  }
  if (monte.length === 0) {
    // reabastece o monte com as cartas do descarte (baralhadas)
    monte = descarte.splice(0);
    shuffle(monte);
    socket.emit('message', 'Monte reabastecido.');
  }
  const carta = monte.pop();
  socket.emit('cartaTirada', carta);
  console.log('Carta tirada:', carta);
});

  socket.on('descartarCarta', (carta) => {
    descarte.push(carta);
    console.log('Carta descartada:', carta);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));


