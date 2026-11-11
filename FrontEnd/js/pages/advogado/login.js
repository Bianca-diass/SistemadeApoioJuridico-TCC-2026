
import { authController } from "../../controllers/authController.js";

const form = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const btnCadastro = document.getElementById("btnCadastro");
const msgErro = document.getElementById("msgErro");

function mostrarErro(texto) {
    msgErro.textContent = texto;
    msgErro.style.display = "block";
}

function limparErro() {
    msgErro.textContent = "";
    msgErro.style.display = "none";
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    limparErro();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
        mostrarErro("Preencha o e-mail e a senha.");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";

    try {
        await authController.login(email, senha);

        window.location.href = "dashboard-adv.html";

    } catch (erro) {
        console.error("Erro no login:", erro);
        mostrarErro(erro.message || "Erro ao realizar login.");

    } finally {
        btnEntrar.disabled = false;
        btnEntrar.innerHTML =
            '<i class="fas fa-right-to-bracket"></i> Entrar';
    }
});

btnCadastro.addEventListener("click", () => {
    window.location.href = "cadastro-adv.html";
});
