
import { authController } from "../../controllers/authController.js";
import { parseOab, validarOab, aplicarMascaraOab } from "../../utils/oab.js";

const form = document.getElementById("formCadastro");
const btnCadastrar = document.getElementById("btnCadastrar");
const btnVoltar = document.getElementById("btnVoltar");
const msgErro = document.getElementById("msgErro");

// Campo OAB
aplicarMascaraOab(document.getElementById("oab"));

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const oab = document.getElementById("oab").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    msgErro.style.display = "none";
    msgErro.textContent = "";

    // Verificar campos obrigatórios
    if (!nome || !oab || !email || !senha || !confirmarSenha) {
        msgErro.textContent = "Preencha todos os campos.";
        msgErro.style.display = "block";
        return;
    }

    // Validar OAB
    const erroOab = validarOab(oab);

    if (erroOab) {
        msgErro.textContent = erroOab;
        msgErro.style.display = "block";
        return;
    }

    // Validar tamanho, letras, números e símbolos
    const senhaValida =
        senha.length >= 8 &&
        /[A-Za-z]/.test(senha) &&
        /[0-9]/.test(senha) &&
        /[^A-Za-z0-9]/.test(senha);

    if (!senhaValida) {
        msgErro.textContent =
            "A senha deve conter, no mínimo, 8 caracteres, incluindo letras, números e símbolos especiais.";

        msgErro.style.display = "block";
        return;
    }

    // Confirmar senhas
    if (senha !== confirmarSenha) {
        msgErro.textContent = "As senhas não são iguais.";
        msgErro.style.display = "block";
        return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = "Cadastrando...";

    try {

        await authController.cadastrar(email, senha, {
            nome,
            oab: parseOab(oab).completo,
            tipo: "advogado"
        });

        alert("Advogado cadastrado com sucesso!");

        window.location.href = "login-adv.html";

    } catch (erro) {

        console.error("Erro no cadastro:", erro);

        msgErro.textContent =
            erro.message || "Erro ao cadastrar advogado.";

        msgErro.style.display = "block";

    } finally {

        btnCadastrar.disabled = false;

        btnCadastrar.innerHTML =
            '<i class="fas fa-user-plus"></i> Cadastrar';

    }
});

// Voltar para login
btnVoltar.addEventListener("click", () => {
    window.location.href = "login-adv.html";
});
