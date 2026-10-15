// js/pages/advogado/login.js

import { authController } from "../../controllers/authController.js";

const oabInput = document.getElementById("oab");
const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const btnCadastrar = document.getElementById("btnCadastrar");
const msgErro = document.getElementById("msgErro");

function mostrarErro(texto) {
  msgErro.textContent = texto;
  msgErro.style.display = "block";
}

function limparErro() {
  msgErro.textContent = "";
  msgErro.style.display = "none";
}

btnEntrar.addEventListener("click", async () => {
  limparErro();

  if (!oabInput.value || !nomeInput.value || !emailInput.value || !senhaInput.value) {
    mostrarErro("Preencha todos os campos");
    return;
  }

  try {
    await authController.login(emailInput.value.trim(), senhaInput.value.trim());
    window.location.href = "dashboard-adv.html";
  } catch (erro) {
    mostrarErro(erro.message || "Erro no login");
  }
});

btnCadastrar.addEventListener("click", () => {
  window.location.href = "cadastro-advogado.html";
});