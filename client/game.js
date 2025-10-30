/* ---------- baralho base: 108 cartas ---------- */
const NAIPES = ['♠','♥','♦','♣'];
const VALORES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const BARALHO = [];
for (let b = 0; b < 2; b++) for (let n of NAIPES) for (let v of VALORES) BARALHO.push({n,v});
for (let j = 0; j < 4; j++) BARALHO.push({n:'Joker',v:'JOKER'});

let mao = [];
let discardPile = [];
let dragIdx = null, descartando = false;

/* ---------- helpers ---------- */
const $ = sel => document.querySelector(sel);
const log = msg => $('#log').innerHTML = msg;
const corNaipe = n => (n === '♥' || n === '♦') ? 'vermelho' : 'preto';
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

/* ---------- desenha 13 slots vazios ---------- */
function criarSlots() {
  const h = $('#hand');
  if (!h) return;
  h.innerHTML = '';
  for (let i = 0; i < 13; i++) {
    const s = document.createElement('div');
    s.className = 'slot'; s.dataset.idx = i;
    s.ondragover = e => e.preventDefault();
    s.ondrop = e => { const to = Number(s.dataset.idx); [mao[dragIdx], mao[to]] = [mao[to], mao[dragIdx]]; renderMao(); };
    h.appendChild(s);
  }
}

/* ---------- renderiza a mão ---------- */
function renderMao() {
  console.log('[renderMao] mao:', mao);                // TESTE
  console.log('[renderMao] slots encontrados:', document.querySelectorAll('#hand .slot').length);
  const slots = document.querySelectorAll('#hand .slot');
  slots.forEach((slot, idx) => {
    slot.innerHTML = '';
    const c = mao[idx];
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'card' + (c.n === 'Joker' ? ' joker' : '');
    d.innerHTML = `<div class="val ${c.n === 'Joker' ? '' : corNaipe(c.n)}">${c.v}</div>
                   <div class="naipe ${c.n === 'Joker' ? '' : corNaipe(c.n)}">${c.n}</div>`;
    d.draggable = true;
    d.ondragstart = () => dragIdx = idx;
    d.ondblclick = () => { if (!descartando) descarta(idx); };
    slot.appendChild(d);
  });
}

/* ---------- descarte ---------- */
function descarta(idx) {
  if (descartando) return;
  const c = mao[idx]; if (!c) return;
  descartando = true;
  discardPile.push(c);
  mao[idx] = null; renderMao();
  $('#discard').innerHTML = `<span class="${corNaipe(c.n)}">${c.v} ${c.n}</span>`;
  log('Carta descartada. Clique no MONTE ou na carta do descarte para repor (1 por vez).');
  socket.emit('descartarCarta', c);
}

/* ---------- validações (rummy) ---------- */
function idxValor(v){
  if (v==='A') return 1;
  if (v==='J') return 11;
  if (v==='Q') return 12;
  if (v==='K') return 13;
  return parseInt(v);
}
function mesmoNaipe(seq){return seq.every(c=>c.n===seq[0].n);}
function sequenciaReal(seq){
  if(seq.length<3||!mesmoNaipe(seq))return false;
  const idx=seq.map(c=>idxValor(c.v)).sort((a,b)=>a-b);
  for(let i=1;i<idx.length;i++)if(idx[i]-idx[i-1]!==1)return false;
  return true;
}
function valorUnico(seq){return seq.every(c=>c.v===seq[0].v);}
function validaConjunto(seq){
  if(seq.length<3)return false;
  const nj=seq.filter(c=>c.n==='Joker').length;
  if(nj>1)return false;
  if(nj===1){
    const base=seq.filter(c=>c.n!=='Joker');
    if(base.length<2)return false;
    if(valorUnico(base))return seq.length;
    if(mesmoNaipe(base)){
      const idx=base.map(c=>idxValor(c.v)).sort((a,b)=>a-b);
      const faltas=[];
      for(let i=1;i<idx.length;i++)if(idx[i]-idx[i-1]>1)faltas.push(idx[i-1]+1);
      if(faltas.length===1 && seq.length-base.length===1)return seq.length;
    }
    return false;
  }
  if(valorUnico(seq))return seq.length;
  if(sequenciaReal(seq))return seq.length;
  return false;
}
function contaValidas(){
  const cartas=mao.filter(c=>c);
  if (cartas.length<12) return 0;
  let total=0;
  const usadas=new Set();
  const porValor={};
  for (const c of cartas) { const v=c.v; if (!porValor[v]) porValor[v]=[]; porValor[v].push(c); }
  for (const g of Object.values(porValor)) {
    if ((g.length===3 || g.length===4) && validaConjunto(g)) {
      for (const c of g) usadas.add(c.id);
      total+=g.length;
    }
  }
  const porNaipe={};
  for (const c of cartas) { const n=c.n; if (!porNaipe[n]) porNaipe[n]=[]; porNaipe[n].push(c); }
  for (const g of Object.values(porNaipe)) {
    g.sort((a,b)=>idxValor(a.v)-idxValor(b.v));
    let seq=[];
    for (const c of g) {
      if (usadas.has(c.id)) continue;
      if (seq.length===0||idxValor(seq[seq.length-1].v)===idxValor(c.v)-1) seq.push(c);
      else { if (seq.length>=3 && validaConjunto(seq)) { for (const s of seq) usadas.add(s.id); total+=seq.length; } seq=[c]; }
    }
    if (seq.length>=3 && validaConjunto(seq)) { for (const s of seq) usadas.add(s.id); total+=seq.length; }
  }
  return total;
}

/* ---------- ligação ao servidor ---------- */
const socket = io("https://jokersden.onrender.com");

socket.on('connect', () => log("Ligado ao servidor"));

socket.on('message', msg => log(msg));

/* ---------- recebe as 13 cartas iniciais ---------- */
socket.on('cartasDistribuidas', payload => {
  console.log('[SOCKET] cartasDistribuidas', payload);
  mao = payload;
  renderMao();
  $('#btnPrincipal').textContent = 'Fechar';
  log('13 cartas. Duplo clique numa carta para descartar ou clique em "Fechar" para terminar (12 válidas obrigatórias).');
});

/* ---------- compra carta do monte ---------- */
socket.on('cartaTirada', carta => {
  const vazio = mao.findIndex(c => !c);
  if (vazio === -1) return log('Mão cheia');
  mao[vazio] = carta;
  descartando = false;
  renderMao();
  log(`Tiraste: ${carta.v} ${carta.n}`);
});

/* ---------- botão DAR CARTAS ---------- */
$('#btnDar').onclick = () => {
  console.log('[UI] clicou Dar cartas');
  socket.emit('pedirCartasIniciais');
};

/* ---------- fecho ---------- */
$('#btnPrincipal').onclick = () => {
  const validas = contaValidas();
  if (validas < 12) return log(`Faltam cartas válidas: ${12 - validas}`);
  log('🎉 VITÓRIA! Fecho aplicado (12 cartas válidas).');
};

/* ---------- monte / descarte ---------- */
$('#stock').onclick = () => {
  const vazio = mao.findIndex(c => !c);
  if (vazio === -1) return log('Mão cheia');
  socket.emit('tirarCarta');
};

$('#discard').onclick = () => {
  const vazio = mao.findIndex(c => !c);
  if (vazio === -1) return log('Mão cheia');
  if (discardPile.length === 0) return log('Descarte vazio');
  const c = discardPile.pop();
  mao[vazio] = c;
  descartando = false;
  renderMao();
};

/* ---------- inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  criarSlots();
  renderMao();
});
