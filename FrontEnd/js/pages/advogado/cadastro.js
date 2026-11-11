
import { authController } from "../../controllers/authController.js";

const form = document.getElementById("formCadastro");
const btnCadastrar = document.getElementById("btnCadastrar");
const btnVoltar = document.getElementById("btnVoltar");
const msgErro = document.getElementById("msgErro");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const oab = document.getElementById("oab").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    msgErro.style.display = "none";

    if (!nome || !oab || !email || !senha || !confirmarSenha) {
        msgErro.textContent = "Preencha todos os campos.";
        msgErro.style.display = "block";
        return;
    }

    if (senha !== confirmarSenha) {
        msgErro.textContent = "As senhas não são iguais.";
        msgErro.style.display = "block";
        return;
    }

    if (senha.length < 6) {
        msgErro.textContent = "A senha deve possuir pelo menos 6 caracteres.";
        msgErro.style.display = "block";
        return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = "Cadastrando...";

    try {
        await authController.cadastrar(email, senha, {
            nome,
            oab,
            tipo: "advogado"
        });

        alert("Advogado cadastrado com sucesso!");
        window.location.href = "login-adv.html";

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        msgErro.textContent = erro.message || "Erro ao cadastrar advogado.";
        msgErro.style.display = "block";

    } finally {
        btnCadastrar.disabled = false;
        btnCadastrar.innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar';
    }
});

btnVoltar.addEventListener("click", () => {
    window.location.href = "login-adv.html";
});
