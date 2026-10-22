const CHAVE_CONFIG = 'configuracaoJogo';
const PADRAO = { modo: 'normal', dificuldade: 'facil' };

const botoes = document.querySelectorAll('.divSelecao');
const btnJogar = document.getElementById('btnJogar');

const escolha = { ...PADRAO, ...lerSalvo() };

function lerSalvo() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_CONFIG)) || {};
    } catch (e) {
        return {};
    }
}

function atualizarDestaque() {
    botoes.forEach(function (botao) {
        const ativo = escolha[botao.dataset.grupo] === botao.dataset.valor;
        botao.classList.toggle('selecionado', ativo);
        botao.setAttribute('aria-pressed', ativo);
    });
}

botoes.forEach(function (botao) {
    botao.addEventListener('click', function () {
        escolha[botao.dataset.grupo] = botao.dataset.valor;
        atualizarDestaque();
    });
});

btnJogar.addEventListener('click', function () {
    try {
        localStorage.setItem(CHAVE_CONFIG, JSON.stringify(escolha));
    } catch (e) {
        console.warn('Não foi possível salvar a configuração:', e);
    }
});

atualizarDestaque();
