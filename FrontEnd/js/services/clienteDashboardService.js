import { getToken } from "./authService.js";

const API = "http://localhost:3000/cliente";

async function requisicao(caminho) {
  const token = getToken();

  if (!token) {
    const erro = new Error("Faça login novamente.");
    erro.status = 401;
    throw erro;
  }

  const resposta = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(dados.erro || dados.mensagem || "Erro ao carregar os dados.");
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
  if (Array.isArray(dados)) return dados;
  return Array.isArray(dados.processos) ? dados.processos : [];
}

export async function listarCompromissosDoCliente() {
  const dados = await requisicao("/compromissos");
  if (Array.isArray(dados)) return dados;
  return Array.isArray(dados.compromissos) ? dados.compromissos : [];
}

// Tempo real (SSE): o backend avisa quando o advogado mexe em agenda,
// processos ou notificações. Chama aoEvento("agenda" | "processos" | "notificacoes").
// Devolve uma função para fechar a conexão.
export function assinarEventosCliente(aoEvento) {
  const token = getToken();
  if (!token || typeof EventSource === "undefined") return () => {};

  const fonte = new EventSource(`${API}/eventos?token=${encodeURIComponent(token)}`);

  ["agenda", "processos", "notificacoes"].forEach(tipo => {
    fonte.addEventListener(tipo, () => {
      try { aoEvento(tipo); } catch (e) { console.error(e); }
    });
  });

  // O navegador reconecta sozinho em caso de erro.
  return () => fonte.close();
}