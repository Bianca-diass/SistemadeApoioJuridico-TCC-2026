/* ==========================================
   CONFIGURAÇÕES - ADVOGADO
========================================== */

/* ==========================================
   CONEXÃO COM O BACKEND
   Se algo não bater com o seu backend, ajuste
   SOMENTE este bloco (API_URL, token e rotas).
========================================== */

const API_URL = "http://localhost:3000";

const ROTAS = {
  perfil: "/advogado/perfil",   // GET (carregar) e PUT (salvar)
  senha: "/advogado/senha"      // PUT (alterar senha)
};

// Procura o token salvo no login. Ajuste o nome da chave se o seu for outro.
function obterToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// Faz a chamada ao backend já com o token e trata os erros.
async function api(caminho, opcoes = {}) {
  const token = obterToken();

  const resposta = await fetch(API_URL + caminho, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opcoes.headers || {})
    }
  });

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }

  if (resposta.status === 401) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!resposta.ok) {
    throw new Error(
      (corpo && (corpo.erro || corpo.error || corpo.message || corpo.mensagem)) ||
        "Erro ao comunicar com o servidor."
    );
  }
  return corpo;
}

// Deve retornar { nome, email, telefone, cpf, oab }
async function carregarPerfil() {
  const dados = await api(ROTAS.perfil, { method: "GET" });
  return (dados && (dados.perfil || dados.advogado || dados.usuario)) || dados || {};
}

// Recebe { nome, email, telefone, cpf, oab }
async function salvarPerfil(dados) {
  return api(ROTAS.perfil, {
    method: "PUT",
    body: JSON.stringify(dados)
  });
}

async function alterarSenha(senhaAtual, novaSenha) {
  return api(ROTAS.senha, {
    method: "PUT",
    body: JSON.stringify({ senhaAtual, novaSenha })
  });
}

async function sairDoSistema() {
  localStorage.clear();
  sessionStorage.clear();
}

/* ==========================================
   ELEMENTOS
========================================== */

const $ = (id) => document.getElementById(id);

const formPerfil = $("formPerfil");
const formSenha = $("formSenha");

const campos = {
  nome: $("nome"),
  email: $("email"),
  telefone: $("telefone"),
  cpf: $("cpf"),
  oab: $("oab")
};

const msgPerfil = $("mensagemPerfil");
const msgSenha = $("mensagemSenha");

/* ==========================================
   UTILITÁRIOS
========================================== */

function mostrarMensagem(el, texto, tipo) {
  el.textContent = texto;
  el.style.color = tipo === "ok" ? "#1e7a3c" : "#c0392b";
}

function limparMensagem(el) {
  el.textContent = "";
}

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

/* ==========================================
   MÁSCARAS
========================================== */

function mascaraCPF(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascaraTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Formato: 123456/MS  (até 6 números + barra + 2 letras)
function mascaraOAB(valor) {
  const limpo = String(valor || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const numeros = limpo.replace(/\D/g, "").slice(0, 6);
  const letras = limpo.replace(/[0-9]/g, "").slice(0, 2);
  return letras ? `${numeros}/${letras}` : numeros;
}

campos.cpf.addEventListener("input", () => {
  campos.cpf.value = mascaraCPF(campos.cpf.value);
});

campos.telefone.addEventListener("input", () => {
  campos.telefone.value = mascaraTelefone(campos.telefone.value);
});

campos.oab.addEventListener("input", () => {
  campos.oab.value = mascaraOAB(campos.oab.value);
});

/* ==========================================
   VALIDAÇÕES
========================================== */

function cpfValido(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(d[t])) return false;
  }
  return true;
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function oabValida(oab) {
  return /^\d{3,6}\/[A-Z]{2}$/.test(oab);
}

/* ==========================================
   PREENCHER TELA
========================================== */

function preencherMenu(nome) {
  const nomeLimpo = (nome || "").trim() || "Advogado";
  $("nomeUsuario").textContent = nomeLimpo;
  $("inicialUsuario").textContent = nomeLimpo.charAt(0).toUpperCase();
}

async function iniciar() {
  try {
    const perfil = await carregarPerfil();

    campos.nome.value = perfil.nome || "";
    campos.email.value = perfil.email || "";
    campos.telefone.value = mascaraTelefone(perfil.telefone);
    campos.cpf.value = mascaraCPF(perfil.cpf);
    campos.oab.value = mascaraOAB(perfil.oab);

    preencherMenu(perfil.nome);
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(msgPerfil, erro.message || "Erro ao carregar perfil.", "erro");
  }
}

/* ==========================================
   SALVAR PERFIL
========================================== */

formPerfil.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparMensagem(msgPerfil);

  const nome = campos.nome.value.trim();
  const email = campos.email.value.trim();
  const telefone = campos.telefone.value.trim();
  const cpf = campos.cpf.value.trim();
  const oab = campos.oab.value.trim();

  if (nome.length < 3) {
    return mostrarMensagem(msgPerfil, "Informe seu nome completo.", "erro");
  }
  if (!emailValido(email)) {
    return mostrarMensagem(msgPerfil, "Informe um e-mail válido.", "erro");
  }
  if (telefone && somenteDigitos(telefone).length < 10) {
    return mostrarMensagem(msgPerfil, "Telefone incompleto.", "erro");
  }
  if (cpf && !cpfValido(cpf)) {
    return mostrarMensagem(msgPerfil, "CPF inválido.", "erro");
  }
  if (oab && !oabValida(oab)) {
    return mostrarMensagem(msgPerfil, "OAB inválida. Use o formato 29588/MS.", "erro");
  }

  const botao = $("btnSalvarPerfil");
  botao.disabled = true;

  try {
    await salvarPerfil({
      nome,
      email,
      telefone: somenteDigitos(telefone),
      cpf: somenteDigitos(cpf),
      oab
    });

    preencherMenu(nome);
    mostrarMensagem(msgPerfil, "Dados salvos com sucesso!", "ok");
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(msgPerfil, erro.message || "Erro ao salvar.", "erro");
  } finally {
    botao.disabled = false;
  }
});

/* ==========================================
   ALTERAR SENHA
========================================== */

formSenha.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparMensagem(msgSenha);

  const senhaAtual = $("senhaAtual").value;
  const novaSenha = $("novaSenha").value;
  const confirmar = $("confirmarSenha").value;

  if (!senhaAtual) {
    return mostrarMensagem(msgSenha, "Informe sua senha atual.", "erro");
  }
  if (novaSenha.length < 6) {
    return mostrarMensagem(msgSenha, "A senha deve ter no mínimo 6 caracteres.", "erro");
  }
  if (novaSenha !== confirmar) {
    return mostrarMensagem(msgSenha, "As senhas não coincidem.", "erro");
  }

  const botao = $("btnAlterarSenha");
  botao.disabled = true;

  try {
    await alterarSenha(senhaAtual, novaSenha);
    formSenha.reset();
    mostrarMensagem(msgSenha, "Senha alterada com sucesso!", "ok");
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(msgSenha, erro.message || "Erro ao alterar a senha.", "erro");
  } finally {
    botao.disabled = false;
  }
});

/* ==========================================
   SAIR
========================================== */

async function sair(e) {
  e.preventDefault();
  try {
    await sairDoSistema();
  } finally {
    window.location.href = "login.html";
  }
}

$("btnLogout").addEventListener("click", sair);
$("btnSair").addEventListener("click", sair);

/* ==========================================
   INICIAR
========================================== */

iniciar();