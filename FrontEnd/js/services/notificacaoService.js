
import { getToken } from "./authService.js";

const API = "http://localhost:3000/notificacoes";
const INTERVALO = 8000;

function headers() {
  const token = getToken();

  if (!token) {
    throw new Error("Faça login novamente.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

async function requisicao(url, options = {}) {
  const resposta = await fetch(url, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      dados.erro || "Erro ao processar notificação."
    );
  }

  return dados;
}

export async function listarTodasNotificacoes() {
  const dados = await requisicao(API);
  return Array.isArray(dados) ? dados : [];
}

export function listarNotificacoes(callback) {
  let ativo = true;
  let carregando = false;

  async function atualizar() {
    if (!ativo || carregando) return;

    carregando = true;

    try {
      const notificacoes = await listarTodasNotificacoes();

      if (ativo) callback(notificacoes);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      carregando = false;
    }
  }

  atualizar();

  const intervalo = setInterval(atualizar, INTERVALO);

  return () => {
    ativo = false;
    clearInterval(intervalo);
  };
}

export async function listarPorCliente(clienteId) {
  const notificacoes = await listarTodasNotificacoes();

  return notificacoes.filter(
    item => item.clienteId === clienteId
  );
}

export async function enviarNotificacao({
  clienteId = null,
  titulo,
  mensagem,
  tipo = "sistema",
  processoId = null,
  compromissoId = null
}) {
  return requisicao(API, {
    method: "POST",
    body: JSON.stringify({
      clienteId,
      titulo,
      mensagem,
      tipo,
      processoId,
      compromissoId
    })
  });
}

export async function editarNotificacao({
  id,
  titulo,
  mensagem
}) {
  return requisicao(`${API}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ titulo, mensagem })
  });
}

export async function excluirNotificacao(id) {
  return requisicao(`${API}/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function marcarComoLida(id) {
  return requisicao(`${API}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ lida: true })
  });
}

export async function listarLidas() {
  const notificacoes = await listarTodasNotificacoes();

  return notificacoes.filter(item => item.lida === true);
}

export async function listarNaoLidas() {
  const notificacoes = await listarTodasNotificacoes();

  return notificacoes.filter(item => item.lida !== true);
}
