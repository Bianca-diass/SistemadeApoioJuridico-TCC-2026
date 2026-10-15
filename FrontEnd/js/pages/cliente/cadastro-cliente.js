import {
    initializeApp,
    getApp,
    getApps
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_BUCKET",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

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
// TRATAMENTO DOS ERROS DO FIREBASE
// ==========================================

function obterMensagemErro(erro) {
    switch (erro.code) {
        case "auth/email-already-in-use":
            return "Este e-mail já está cadastrado.";

        case "auth/invalid-email":
            return "Informe um endereço de e-mail válido.";

        case "auth/weak-password":
            return "A senha é muito fraca. Utilize pelo menos 6 caracteres.";

        case "auth/operation-not-allowed":
            return "O cadastro por e-mail e senha não está habilitado no Firebase.";

        case "auth/network-request-failed":
            return "Falha de conexão. Verifique sua internet e tente novamente.";

        case "auth/too-many-requests":
            return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";

        case "permission-denied":
        case "firestore/permission-denied":
            return "O Firebase não permitiu salvar os dados. Verifique as regras do Firestore.";

        default:
            return "Não foi possível concluir o cadastro. Verifique a configuração do Firebase e tente novamente.";
    }
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

    let usuarioCriado = null;
    let perfilSalvo = false;

    try {
        // 1. Cria a conta de autenticação.
        const resultado =
            await createUserWithEmailAndPassword(
                auth,
                email,
                senha
            );

        usuarioCriado = resultado.user;

        // 2. Define o nome do cliente no perfil Firebase.
        await updateProfile(usuarioCriado, {
            displayName: nome
        });

        // 3. Salva os dados na coleção "clientes".
        // O UID vincula o perfil à conta autenticada.
        await setDoc(
            doc(db, "clientes", usuarioCriado.uid),
            {
                uid: usuarioCriado.uid,
                nome: nome,
                cpf: cpf,
                email: usuarioCriado.email,
                tipo: "cliente",
                criadoEm: serverTimestamp()
            }
        );

        perfilSalvo = true;

        // 4. Encerra a sessão aberta automaticamente
        // pelo Firebase após a criação da conta.
        await signOut(auth);

        // 5. Informa o sucesso e redireciona para o login.
        mostrarMensagem(
            "Cadastro realizado com sucesso! Redirecionando para o login...",
            "sucesso"
        );

        formulario.reset();

        window.location.href = "login.html";

    } catch (erro) {
        console.error("Erro ao cadastrar cliente:", erro);

        if (usuarioCriado && !perfilSalvo) {
            mostrarMensagem(
                "Sua conta foi criada, mas não foi possível salvar o perfil do cliente. Não tente criar outra conta com o mesmo e-mail. Verifique o Firestore ou solicite suporte.",
                "erro"
            );
        } else if (usuarioCriado && perfilSalvo) {
            // O perfil já foi salvo. Se apenas a saída da
            // sessão falhou, não repita a criação da conta.
            mostrarMensagem(
                "Seu cadastro foi salvo. Não foi possível encerrar a sessão automaticamente. Acesse o login após sair da conta atual.",
                "erro"
            );
        } else {
            mostrarMensagem(
                obterMensagemErro(erro),
                "erro"
            );
        }
    } finally {
        botaoCadastrar.disabled = false;
        botaoCadastrar.textContent = "Criar cadastro";
    }
}
