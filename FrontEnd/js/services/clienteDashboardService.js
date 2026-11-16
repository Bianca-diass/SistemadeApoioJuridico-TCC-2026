import { getToken } from "./authService.js";

const API = "http://localhost:3000/cliente";

async function requisicao(caminho) {
  const token = getToken();

  if (!token) {
    throw new Error("Faça login novamente.");
  }

  const resposta = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(dados.erro || "Erro ao carregar os dados.");
    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

export async function obterPerfilCliente() {
  return requisicao("/perfil");
}

export async function listarProcessosDoCliente() {
  const dados = await requisicao("/processos");
  return Array.isArray(dados) ? dados : [];
}

export async function listarCompromissosDoCliente() {
  const dados = await requisicao("/compromissos");
  return Array.isArray(dados) ? dados : [];
}