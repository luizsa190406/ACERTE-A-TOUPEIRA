
const CHAVE_CONFIG = 'configuracaoJogo';
const PADRAO = { modo: 'normal', dificuldade: 'facil' };

const LAYOUTS = {
    facil:   [3, 3],
    medio:   [3, 4, 3],
    dificil: [4, 5, 4, 5]
};

function lerConfiguracao() {
    let salvo = {};
    try {
        salvo = JSON.parse(localStorage.getItem(CHAVE_CONFIG)) || {};
    } catch (e) {
        salvo = {};
    }
    const config = { ...PADRAO, ...salvo };
    if (!LAYOUTS[config.dificuldade]) config.dificuldade = PADRAO.dificuldade;
    if (config.modo !== 'normal' && config.modo !== 'explosivo') config.modo = PADRAO.modo;
    return config;
}

const configuracao = lerConfiguracao();

function desenharTabuleiro() {
    const tabuleiro = document.getElementById('tabuleiro');
    const linhas = LAYOUTS[configuracao.dificuldade];
    tabuleiro.innerHTML = '';
    tabuleiro.dataset.modo = configuracao.modo;
    tabuleiro.dataset.dificuldade = configuracao.dificuldade;

    let indice = 0;
    linhas.forEach(function (quantidade) {
        const linha = document.createElement('div');
        linha.className = 'row';
        if (quantidade > linhas[0]) linha.classList.add('row2');

        for (let i = 0; i < quantidade; i++) {
            const buraco = document.createElement('button');
            buraco.type = 'button';
            buraco.className = 'hole';
            buraco.dataset.indice = indice++;

            const img = document.createElement('img');
            img.src = 'imagens/buraco.png';
            img.className = 'holeimg';
            img.alt = 'Buraco';

            buraco.appendChild(img);
            linha.appendChild(buraco);
        }
        tabuleiro.appendChild(linha);
    });

    ajustarTamanhoBuracos();
}

function ajustarTamanhoBuracos() {
    const tabuleiro = document.getElementById('tabuleiro');
    const linhas = LAYOUTS[configuracao.dificuldade];
    const maxColunas = Math.max(...linhas);
    const porLargura = (window.innerWidth - 40) / maxColunas - 10;
    const porAltura = tabuleiro.clientHeight / linhas.length - 20;
    const tamanho = Math.max(60, Math.min(200, porLargura, porAltura));
    tabuleiro.style.setProperty('--tam-buraco', Math.floor(tamanho) + 'px');
}

window.addEventListener('resize', ajustarTamanhoBuracos);
desenharTabuleiro();



const estadoPartida = {
    pontuacao: 0,
    combo: 1,
    acertosSeguidos: 0,
    melhorCombo: 1,
    acertos: 0,
    erros: 0,
    tempoRestante: 60,
    pausado: false,
    jogoAtivo: true,
    intervaloSpawn: null,
    intervaloTempo: null,
    audioCtx: null
};

const VELOCIDADE_DIFICULDADE = {
    // Fácil: Aparece a cada 2 segundos, fica na tela por 1.7 segundos
    facil:   { intervalo: 2000, exposicao: 1700 },
    
    // Médio: Aparece a cada 1.4 segundos, fica na tela por 1.1 segundos
    medio:   { intervalo: 1400, exposicao: 1100 },
    
    // Difícil: Aparece a cada 1 segundos, fica na tela por 0.85 segundos
    dificil: { intervalo: 1000,  exposicao: 850 }
};

function obterElementoPontuacao() {
    return document.getElementById('pontValue') || document.querySelector('[name="pontValue"]');
}

function obterElementoTempo() {
    return document.getElementById('timeValue') || document.querySelector('[name="timeValue"]');
}

function atualizarPlacarDOM() {
    const elPont = obterElementoPontuacao();
    const elTime = obterElementoTempo();
    const elCombo = document.getElementById('comboValue');

    if (elPont) elPont.textContent = estadoPartida.pontuacao;
    if (elTime) elTime.textContent = estadoPartida.tempoRestante + 's';
    if (elCombo) elCombo.textContent = 'x' + estadoPartida.combo;
}

const containerTabuleiro = document.getElementById('tabuleiro');

containerTabuleiro.addEventListener('mousedown', function (evento) {
    if (!estadoPartida.jogoAtivo || estadoPartida.pausado) return;

    const buraco = evento.target.closest('.hole');
    if (!buraco) return;

    const img = buraco.querySelector('.holeimg');
    if (!img) return;

    processarCliqueBuraco(buraco, img);
});

function processarCliqueBuraco(buraco, img) {
    const srcAtual = img.getAttribute('src') || '';

    if (buraco.dataset.armadilha === 'true') {
        processarExplosao(buraco, img);
        return;
    }

    if (buraco.dataset.bombaComum === 'true') {
        processarBombaComum(buraco, img);
        return;
    }

    if (srcAtual.includes('buraco.png')) {
        registrarFalha(buraco);
        return;
    }

    if (srcAtual.includes('topeira_capacete.png')) {
        const ptsCapacete = 50 * estadoPartida.combo;
        estadoPartida.pontuacao += ptsCapacete;
        tocarSomArcade(320, 'square', 0.08);

        img.src = 'imagens/topeira_base2.png';
        aplicarEfeitoBuraco(buraco, 'hit-capacete');
        mostrarTextoFlutuante(buraco, 'CAPACETE! +' + ptsCapacete, 'bonus');
        atualizarPlacarDOM();
        salvarPontuacaoLocal();
        return;
    }

    if (srcAtual.includes('topera-nerd.png')) {
        aumentarCombo();
        const ptsNerd = 250 * estadoPartida.combo;
        estadoPartida.pontuacao += ptsNerd;
        estadoPartida.tempoRestante = Math.min(99, estadoPartida.tempoRestante + 2);
        tocarSomArcade(680, 'triangle', 0.12);

        esconderToupeira(buraco, img);
        aplicarEfeitoBuraco(buraco, 'hit-acerto');
        mostrarTextoFlutuante(buraco, '+' + ptsNerd + ' (+2s)', 'bonus');
        atualizarPlacarDOM();
        salvarPontuacaoLocal();
        return;
    }

    if (srcAtual.includes('topera-base.png') || srcAtual.includes('topeira_base2.png')) {
        aumentarCombo();
        const ptsBase = 100 * estadoPartida.combo;
        estadoPartida.pontuacao += ptsBase;
        tocarSomArcade(520, 'sine', 0.09);

        esconderToupeira(buraco, img);
        aplicarEfeitoBuraco(buraco, 'hit-acerto');
        mostrarTextoFlutuante(buraco, '+' + ptsBase, 'positivo');
        atualizarPlacarDOM();
        salvarPontuacaoLocal();
    }
}

function aumentarCombo() {
    estadoPartida.acertos++;
    estadoPartida.acertosSeguidos++;
    estadoPartida.combo = Math.min(5, 1 + Math.floor(estadoPartida.acertosSeguidos / 3));
    if (estadoPartida.combo > estadoPartida.melhorCombo) {
        estadoPartida.melhorCombo = estadoPartida.combo;
    }
}

function registrarFalha(buraco) {
    estadoPartida.erros++;
    estadoPartida.acertosSeguidos = 0;
    estadoPartida.combo = 1;

    const perda = configuracao.modo === 'explosivo' ? 80 : 25;
    estadoPartida.pontuacao = Math.max(0, estadoPartida.pontuacao - perda);
    tocarSomArcade(150, 'sawtooth', 0.1);

    aplicarEfeitoBuraco(buraco, 'hit-erro');
    mostrarTextoFlutuante(buraco, '-' + perda, 'negativo');
    atualizarPlacarDOM();
    salvarPontuacaoLocal();
}

function processarExplosao(buraco, img) {
    estadoPartida.erros++;
    estadoPartida.acertosSeguidos = 0;
    estadoPartida.combo = 1;

    estadoPartida.pontuacao = Math.max(0, estadoPartida.pontuacao - 300);
    estadoPartida.tempoRestante = Math.max(0, estadoPartida.tempoRestante - 5);
    tocarSomArcade(90, 'sawtooth', 0.25);

    esconderToupeira(buraco, img);
    aplicarEfeitoBuraco(document.body, 'tremor-explosao');
    mostrarTextoFlutuante(buraco, 'BOOM! -300 (-5s)', 'negativo');
    atualizarPlacarDOM();
    salvarPontuacaoLocal();

    if (estadoPartida.tempoRestante <= 0) {
        encerrarPartida('EXPLOSÃO FATAL!');
    }
}

function processarBombaComum(buraco, img) {
    if (buraco.dataset.bombaComum !== 'true') return;

    estadoPartida.acertos++;
    estadoPartida.acertosSeguidos = 0;
    estadoPartida.combo = 1;
    tocarSomArcade(760, 'triangle', 0.1);
    esconderToupeira(buraco, img);
    aplicarEfeitoBuraco(buraco, 'hit-capacete');
    mostrarTextoFlutuante(buraco, 'DESARMADA!', 'bonus');
    atualizarPlacarDOM();
    salvarPontuacaoLocal();
}

function explodirBombaComum(buraco, img) {
    if (buraco.dataset.bombaComum !== 'true') return;

    estadoPartida.erros++;
    estadoPartida.acertosSeguidos = 0;
    estadoPartida.combo = 1;
    estadoPartida.pontuacao = Math.max(0, estadoPartida.pontuacao - 150);
    tocarSomArcade(90, 'sawtooth', 0.2);
    esconderToupeira(buraco, img);
    aplicarEfeitoBuraco(document.body, 'tremor-explosao');
    mostrarTextoFlutuante(buraco, 'BOOM! -150', 'negativo');
    atualizarPlacarDOM();
    salvarPontuacaoLocal();
}

function esconderTodasToupeiras() {
    const buracos = document.querySelectorAll('.hole');
    buracos.forEach(function(b) {
        const img = b.querySelector('.holeimg');
        if (img && !img.src.includes('buraco.png')) {
            esconderToupeira(b, img);
        }
    });
}

function esconderToupeira(buraco, img) {
    if (buraco.dataset.timerId) {
        clearTimeout(Number(buraco.dataset.timerId));
        delete buraco.dataset.timerId;
    }
    delete buraco.dataset.armadilha;
    delete buraco.dataset.bombaComum;
    buraco.classList.remove('armadilha-ativa');
    img.src = 'imagens/buraco.png';
    img.alt = 'Buraco';
}

function mostrarTextoFlutuante(buraco, texto, tipoCor) {
    const aviso = document.createElement('span');
    aviso.className = 'feedback-flutuante ' + tipoCor;
    aviso.textContent = texto;
    buraco.appendChild(aviso);
    setTimeout(function () {
        aviso.remove();
    }, 700);
}

function aplicarEfeitoBuraco(elemento, classe) {
    elemento.classList.add(classe);
    setTimeout(function () {
        elemento.classList.remove(classe);
    }, 220);
}

function salvarPontuacaoLocal() {
    try {
        localStorage.setItem('ultimaPontuacao', String(estadoPartida.pontuacao));
        const recorde = parseInt(localStorage.getItem('recordePontuacao') || '0', 10);
        if (estadoPartida.pontuacao > recorde) {
            localStorage.setItem('recordePontuacao', String(estadoPartida.pontuacao));
        }
    } catch (e) {}
}

function tocarSomArcade(freq, tipo, duracao) {
    try {
        if (!estadoPartida.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            estadoPartida.audioCtx = new AudioContextClass();
        }
        const osc = estadoPartida.audioCtx.createOscillator();
        const gain = estadoPartida.audioCtx.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(freq, estadoPartida.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.07, estadoPartida.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, estadoPartida.audioCtx.currentTime + duracao);
        osc.connect(gain);
        gain.connect(estadoPartida.audioCtx.destination);
        osc.start();
        osc.stop(estadoPartida.audioCtx.currentTime + duracao);
    } catch (e) {}
}

function sortearToupeira() {
    if (!estadoPartida.jogoAtivo || estadoPartida.pausado) return;

    esconderTodasToupeiras();

    const buracos = Array.from(document.querySelectorAll('.hole'));
    const escolhido = buracos[Math.floor(Math.random() * buracos.length)];
    const img = escolhido.querySelector('.holeimg');
    const sorteio = Math.random();

    if (configuracao.modo === 'explosivo') {
        if (configuracao.dificuldade === 'dificil'){
            if (sorteio < 0.10) {       // 10 de chance
                img.src = 'imagens/bomba.png';
                img.alt = 'Bomba';
                escolhido.dataset.bombaComum = 'true';
                escolhido.classList.add('armadilha-ativa');
            } else if (sorteio < 0.30) {        // 20 de chance
                img.src = 'imagens/mina_terrestre.png';
                img.alt = 'Mina Explosiva';
                escolhido.dataset.armadilha = 'true';
                escolhido.classList.add('armadilha-ativa');
            } else if (sorteio < 0.55) {        // 25 de chance
                img.src = 'imagens/topeira_capacete.png';
                img.alt = 'Toupeira de Capacete';
            } else if (sorteio < 0.65) {        // 10 de chance
                img.src = 'imagens/topera-nerd.png';
                img.alt = 'Toupeira Bônus';
            } else {                    // 35 de chance
                img.src = 'imagens/topera-base.png';
                img.alt = 'Toupeira';
            }
        } else {
            if (sorteio < 0.20) {
                img.src = 'imagens/mina_terrestre.png';
                img.alt = 'Mina Explosiva';
                escolhido.dataset.armadilha = 'true';
                escolhido.classList.add('armadilha-ativa');
            } else if (sorteio < 0.40) {
                img.src = 'imagens/topeira_capacete.png';
                img.alt = 'Toupeira de Capacete';
            } else if (sorteio < 0.50) {
                img.src = 'imagens/topera-nerd.png';
                img.alt = 'Toupeira Bônus';
            } else {
                img.src = 'imagens/topera-base.png';
                img.alt = 'Toupeira';
            }
        }
    } else {
        // MODO NORMAL (Sem armadilhas)
        if (sorteio < 0.20) {
            img.src = 'imagens/topeira_capacete.png';
            img.alt = 'Toupeira de Capacete';
        } else if (sorteio < 0.35) {
            img.src = 'imagens/topera-nerd.png';
            img.alt = 'Toupeira Bônus';
        } else {
            img.src = 'imagens/topera-base.png';
            img.alt = 'Toupeira';
        }
    }

    const eBombaComum = escolhido.dataset.bombaComum === 'true';
    const tempoExp = (VELOCIDADE_DIFICULDADE[configuracao.dificuldade] || VELOCIDADE_DIFICULDADE.facil).exposicao;

    escolhido.dataset.timerId = setTimeout(function () {
        if (eBombaComum && escolhido.dataset.bombaComum === 'true') {
            explodirBombaComum(escolhido, img);
        } else if (!img.getAttribute('src').includes('buraco.png')) {
            esconderToupeira(escolhido, img);
        }
    }, tempoExp);
}

function iniciarCicloPartida() {
    clearInterval(estadoPartida.intervaloSpawn);
    clearInterval(estadoPartida.intervaloTempo);

    estadoPartida.pontuacao = 0;
    estadoPartida.combo = 1;
    estadoPartida.acertosSeguidos = 0;
    estadoPartida.acertos = 0;
    estadoPartida.erros = 0;
    estadoPartida.tempoRestante = 60;
    estadoPartida.pausado = false;
    estadoPartida.jogoAtivo = true;

    esconderTodasToupeiras();
    atualizarPlacarDOM();

    const modal = document.getElementById('modalFimPause');
    if (modal) modal.hidden = true;

    const vel = VELOCIDADE_DIFICULDADE[configuracao.dificuldade] || VELOCIDADE_DIFICULDADE.facil;

    estadoPartida.intervaloSpawn = setInterval(sortearToupeira, vel.intervalo);
    estadoPartida.intervaloTempo = setInterval(function () {
        if (!estadoPartida.pausado && estadoPartida.jogoAtivo) {
            estadoPartida.tempoRestante--;
            atualizarPlacarDOM();
            if (estadoPartida.tempoRestante <= 0) {
                encerrarPartida('FIM DO TEMPO!');
            }
        }
    }, 1000);
}

function encerrarPartida(titulo) {
    estadoPartida.jogoAtivo = false;
    clearInterval(estadoPartida.intervaloSpawn);
    clearInterval(estadoPartida.intervaloTempo);
    esconderTodasToupeiras();
    salvarPontuacaoLocal();
    abrirModal(titulo, false);
}

function abrirModal(titulo, podeContinuar) {
    const modal = document.getElementById('modalFimPause');
    if (!modal) return;

    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalSubtitulo').textContent = 'PONTUAÇÃO ATUAL: ' + estadoPartida.pontuacao;
    
    // Mostra as estatísticas extras que estavam a faltar
    const modalStats = document.getElementById('modalStats');
    if (modalStats) {
        modalStats.innerHTML = 
            'ACERTOS: ' + estadoPartida.acertos + '<br>' +
            'ERROS (VAZIO/EXPLOSÕES): ' + estadoPartida.erros + '<br>' +
            'MAIOR COMBO: x' + estadoPartida.melhorCombo;
    }

    const btnCont = document.getElementById('btnContinuar');
    if (btnCont) btnCont.hidden = !podeContinuar;

    modal.hidden = false;
}

const btnPause = document.querySelector('.pause');
if (btnPause) {
    btnPause.addEventListener('click', function () {
        if (!estadoPartida.jogoAtivo) return;
        estadoPartida.pausado = !estadoPartida.pausado;
        if (estadoPartida.pausado) {
            abrirModal('JOGO PAUSADO', true);
        } else {
            const modal = document.getElementById('modalFimPause');
            if (modal) modal.hidden = true;
        }
    });
}

const btnContinuar = document.getElementById('btnContinuar');
if (btnContinuar) {
    btnContinuar.addEventListener('click', function () {
        estadoPartida.pausado = false;
        document.getElementById('modalFimPause').hidden = true;
    });
}

const btnReiniciar = document.getElementById('btnReiniciar');
if (btnReiniciar) {
    btnReiniciar.addEventListener('click', iniciarCicloPartida);
}

iniciarCicloPartida();
