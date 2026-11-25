import { fazerCadastro } from "../../services/authService.js";

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

const formulario = document.getElementById("formCadastro");
const campoNome = document.getElementById("nome");
const campoCpf = document.getElementById("cpf");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmarSenha =
    document.getElementById("confirmarSenha");

const mensagem = document.getElementById("mensagem");
const botaoCadastrar = document.getElementById("btnCadastrar");

// Verifica se o HTML possui os elementos necessários.
if (
    !formulario ||
    !campoNome ||
    !campoCpf ||
    !campoEmail ||
    !campoSenha ||
    !campoConfirmarSenha ||
    !mensagem ||
    !botaoCadastrar
) {
    console.error(
        "Erro: não foram encontrados todos os elementos do formulário de cadastro."
    );
} else {
    iniciarCadastro();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

function iniciarCadastro() {
    // Formata o CPF enquanto o usuário digita.
    campoCpf.addEventListener("input", () => {
        campoCpf.value = formatarCpf(campoCpf.value);
    });

    // Processa o envio do formulário.
    formulario.addEventListener("submit", cadastrarCliente);
}

// ==========================================
// FORMATAÇÃO DO CPF
// ==========================================

function formatarCpf(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);

    return numeros
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// ==========================================
// VALIDAÇÃO DO CPF
// ==========================================

function cpfValido(cpf) {
    cpf = cpf.replace(/\D/g, "");

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;
        const digito = resto === 10 ? 0 : resto;

        if (digito !== Number(cpf[tamanho])) {
            return false;
        }
    }

    return true;
}

// ==========================================
// EXIBIÇÃO DE MENSAGENS
// ==========================================

function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;
    mensagem.className = tipo;
}

// ==========================================
// MENSAGEM DE ERRO
// ==========================================

function obterMensagemErro(erro) {
    const msg = String(erro?.message || "");

    if (/failed to fetch|networkerror/i.test(msg)) {
        return "Falha de conexão com o servidor. Verifique se o backend está rodando e tente novamente.";
    }

    return msg || "Não foi possível concluir o cadastro. Tente novamente.";
}

// ==========================================
// CADASTRAR CLIENTE
// ==========================================

async function cadastrarCliente(evento) {
    evento.preventDefault();

    // Obtém os dados preenchidos.
    const nome = campoNome.value.trim();
    const cpf = campoCpf.value.replace(/\D/g, "");
    const email = campoEmail.value.trim();
    const senha = campoSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    // --------------------------------------
    // VALIDAÇÕES
    // --------------------------------------

    if (nome.length < 3) {
        mostrarMensagem(
            "Informe seu nome completo.",
            "erro"
        );

        campoNome.focus();
        return;
    }

    if (!cpfValido(cpf)) {
        mostrarMensagem(
            "Informe um CPF válido.",
            "erro"
        );

        campoCpf.focus();
        return;
    }

    if (!campoEmail.checkValidity() || !email) {
        mostrarMensagem(
            "Informe um e-mail válido.",
            "erro"
        );

        campoEmail.focus();
        return;
    }

    if (senha.length < 6) {
        mostrarMensagem(
            "A senha deve ter pelo menos 6 caracteres.",
            "erro"
        );

        campoSenha.focus();
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarMensagem(
            "As senhas não coincidem.",
            "erro"
        );

        campoConfirmarSenha.focus();
        return;
    }

    // --------------------------------------
    // INICIA O CADASTRO
    // --------------------------------------

    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = "Cadastrando...";

    mostrarMensagem("");

    try {
        // O backend cria a conta e o Supabase envia um link de confirmação
        // para o e-mail. Depois de confirmar e fazer login, o cliente já vê
        // no Dashboard os processos que o advogado cadastrou para ele.
        await fazerCadastro(email, senha, {
            nome,
            cpf,
            tipo: "cliente"
        });

        formulario.reset();

        mostrarMensagem(
            "Cadastro criado! Enviamos um link de confirmação para " +
            email +
            ". Confirme seu e-mail (veja também o spam) e depois faça " +
            "login. Redirecionando...",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 8000);

    } catch (erro) {
        console.error("Erro ao cadastrar cliente:", erro);

        mostrarMensagem(
            obterMensagemErro(erro),
            "erro"
        );
    } finally {
        botaoCadastrar.disabled = false;
        botaoCadastrar.textContent = "Criar cadastro";
    }
}