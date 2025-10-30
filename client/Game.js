const NAIPES = ['♠','♥','♦','♣'];
const VALORES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const BARALHO = [];
for (let b = 0; b < 2; b++) for (let n of NAIPES) for (let v of VALORES) BARALHO.push({n,v});
for (let j = 0; j < 4; j++) BARALHO.push({n:'Joker',v:'JOKER'});

let mao = [], idGlobal = 0;
let deck = [], discardPile = [];
let dragIdx = null, descartando = false;

const $ = sel => document.querySelector(sel);
const log = msg => $('#log').innerHTML = msg;
const corNaipe = n => (n === '♥' || n === '♦') ? 'vermelho' : 'preto';
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

function criarSlots() {
  const h = $('#hand');
  h.innerHTML = '';
  for (let i = 0; i < 13; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.idx = i;
    s.ondragover = e => e.preventDefault();
    s.ondrop = e => { const to = Number(s.dataset.idx); [mao[dragIdx], mao[to]] = [mao[to], mao[dragIdx]]; renderMao(); };
    h.appendChild(s);
  }
}

function renderMao() {
  const slots = document.querySelectorAll('#hand .slot');
  slots.forEach((s, idx) => {
    s.innerHTML = '';
    const c = mao[idx];
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'card' + (c.n === 'Joker' ? ' joker' : '');
    d.innerHTML = `<div class="val ${c.n === 'Joker' ? '' : corNaipe(c.n)}">${c.v}</div><div class="naipe ${c.n === 'Joker' ? '' : corNaipe(c.n)}">${c.n}</div>`;
    d.draggable = true; d.ondragstart = e => dragIdx = idx; d.ondblclick = () => { if (!descartando) descarta(idx); };
    s.appendChild(d);
  });
}

function descarta(idx) {
  if (descartando) return;
  const c = mao[idx]; if (!c) return;
  descartando = true;
  discardPile.push({...c}); mao[idx] = null; renderMao();
  $('#discard').innerHTML = `<span class="${corNaipe(c.n)}">${c.v} ${c.n}</span>`;
  log('Carta descartada. Clique no MONTE ou na carta do descarte para repor (1 por vez).');
}

// ---------- VALIDAÇÃO REAL DE 12 CARTAS ----------
function idxValor(v){return VALORES.indexOf(v);}
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
  const cartas=mao.filter(c=>c);                 // todas na mão
  if (cartas.length!==12) return 0;              // tem de ser 12

  let total=0;

  // 1. TRIOS/QUADRAS (mesmo valor, naipes diferentes)
  const porValor={};
  for (const c of cartas) {
    const v=c.v;
    if (!porValor[v]) porValor[v]=[];
    porValor[v].push(c);
  }
  for (const g of Object.values(porValor)) {
    if ((g.length===3 || g.length===4) && validaConjunto(g)) total+=g.length;
  }

  // 2. SEQUÊNCIAS (mesmo naipe, valores consecutivos)
  const porNaipe={};
  for (const c of cartas) {
    const n=c.n;
    if (!porNaipe[n]) porNaipe[n]=[];
    porNaipe[n].push(c);
  }
  for (const g of Object.values(porNaipe)) {
    g.sort((a,b)=>VALORES.indexOf(a.v)-VALORES.indexOf(b.v));
    let seq=[];
    for (const c of g) {
      if (seq.length===0||VALORES.indexOf(seq[seq.length-1].v)===VALORES.indexOf(c.v)-1){
        seq.push(c);
      } else {
        if (seq.length>=3 && validaConjunto(seq)) total+=seq.length;
        seq=[c];
      }
    }
    if (seq.length>=3 && validaConjunto(seq)) total+=seq.length;
  }
  return total;
}

// ---------- FECHO: QUALQUER CARTA QUE SOBRE ----------
$('#btnPrincipal').onclick = () => {
  if ($('#btnPrincipal').textContent === 'Dar Cartas') {
    deck = [...BARALHO]; shuffle(deck);
    mao = Array(13).fill(null);
    for (let i = 0; i < 13; i++) mao[i] = { ...deck.pop(), id: idGlobal++ };
    mao.sort((a, b) => VALORES.indexOf(a.v) - VALORES.indexOf(b.v));
    discardPile = []; renderMao(); $('#discard').innerHTML = '';
    $('#btnPrincipal').textContent = 'Fechar'; log('13 cartas. Duplo clique numa carta para descartar ou clique em "Fechar" para terminar (12 válidas obrigatórias).');
  } else {
    const validas = contaValidas();
    if (validas !== 12) return log(`Faltam cartas válidas: ${12 - validas}`);
    const vazio = mao.findIndex(c => !c);           // vazio que já existe
    if (vazio === -1) return log('Mão cheia.');
    // vitória: NÃO remove nada — o "fecho" é o vazio que já existe
    log('🎉 VITÓRIA! Fecho aplicado (12 cartas válidas).');
  }
};

$('#stock').onclick = () => {
  const vazio = mao.findIndex(c => !c); if (vazio === -1) return log('Mão cheia');
  if (deck.length === 0 && discardPile.length === 0) return log('Sem cartas');
  if (deck.length === 0) { deck = [...discardPile]; shuffle(deck); discardPile = []; log('Monte reabastecido.'); }
  const nova = deck.pop(); mao[vazio] = { ...nova, id: idGlobal++ }; descartando = false; renderMao();
};

$('#discard').onclick = () => {
  const vazio = mao.findIndex(c => !c); if (vazio === -1) return log('Mão cheia');
  if (discardPile.length === 0) return log('Descarte vazio');
  const c = discardPile.pop(); mao[vazio] = { ...c, id: idGlobal++ }; descartando = false; renderMao();
};

const socket = io(); // liga ao servidor

socket.on('message', (msg) => {
  console.log(msg);
});

$('#btnPrincipal').onclick = () => {
  socket.emit('darCartas'); // envia para o servidor
};

socket.on('cartasDistribuidas', (data) => {
  // recebe cartas do servidor
  mao = data;
  renderMao();
});

criarSlots();