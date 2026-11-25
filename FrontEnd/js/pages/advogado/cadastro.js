import { authController } from "../../controllers/authController.js";

const form = document.getElementById("formCadastro");
const nome = document.getElementById("nome");
const oab = document.getElementById("oab");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const msgErro = document.getElementById("msgErro");
const btnCadastrar = document.getElementById("btnCadastrar");
const btnVoltar = document.getElementById("btnVoltar");

// OAB: aceita somente números (o "/MS" é fixo na tela)
oab.addEventListener("input", () => {
    oab.value = oab.value.replace(/\D/g, "");
});

function mostrarMensagem(texto, sucesso = false) {
    msgErro.style.display = "block";
    msgErro.style.color = sucesso ? "#218838" : "#dc3545";
    msgErro.textContent = texto;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msgErro.style.display = "none";

    const nomeCompleto = nome.value.trim();
    const numeroOab = oab.value.replace(/\D/g, "");
    const emailUsuario = email.value.trim();
    const senhaUsuario = senha.value;

    if (!nomeCompleto || !numeroOab || !emailUsuario || !senhaUsuario || !confirmarSenha.value) {
        mostrarMensagem("Preencha todos os campos.");
        return;
    }

    if (!/^[1-9]\d{0,5}$/.test(numeroOab)) {
        mostrarMensagem("OAB inválida. Digite somente o número da inscrição (até 6 dígitos).");
        return;
    }

    const senhaValida =
        senhaUsuario.length >= 8 &&
        /[A-Za-z]/.test(senhaUsuario) &&
        /[0-9]/.test(senhaUsuario) &&
        /[^A-Za-z0-9]/.test(senhaUsuario);

    if (!senhaValida) {
        mostrarMensagem("A senha deve conter, no mínimo, 8 caracteres, incluindo letras, números e símbolos especiais.");
        return;
    }

    if (senhaUsuario !== confirmarSenha.value) {
        mostrarMensagem("As senhas não são iguais.");
        return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = "Cadastrando...";

    try {
        await authController.cadastrar(emailUsuario, senhaUsuario, {
            nome: nomeCompleto,
            oab: `${numeroOab}/MS`,
            tipo: "advogado"
        });

        alert("Advogado cadastrado com sucesso!");
        window.location.href = "login-adv.html";

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        mostrarMensagem(erro.message || "Erro ao cadastrar advogado.");

    } finally {
        btnCadastrar.disabled = false;
        btnCadastrar.innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar';
    }
});

btnVoltar.addEventListener("click", () => {
    window.location.href = "login-adv.html";
});