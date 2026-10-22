const form = document.getElementById('formCadastro');
const senha = document.getElementById('senha');
const confirmaSenha = document.getElementById('confirma_senha');
const erroSenha = document.getElementById('erroSenha');

function senhasCoincidem() {
    return senha.value === confirmaSenha.value;
}

function atualizarMensagem(mostrarErro) {
    const ok = senhasCoincidem();
    confirmaSenha.setCustomValidity(ok ? '' : 'As senhas não coincidem.');
    erroSenha.textContent = ok ? '' : 'AS SENHAS NÃO COINCIDEM';
    erroSenha.hidden = ok || !mostrarErro;
}

[senha, confirmaSenha].forEach(function (campo) {
    campo.addEventListener('input', function () {
        atualizarMensagem(confirmaSenha.value.length > 0);
    });
});

form.addEventListener('submit', function (evento) {
    atualizarMensagem(true);
    if (!senhasCoincidem()) {
        evento.preventDefault();
        confirmaSenha.focus();
    }
});
