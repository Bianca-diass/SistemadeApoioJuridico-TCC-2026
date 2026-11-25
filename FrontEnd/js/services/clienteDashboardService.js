import { getToken } from "./authService.js";

const API_CLIENTE = "https://sistema-apoio-juridico.onrender.com/cliente";
const API_AGENDA = "https://sistema-apoio-juridico.onrender.com/agenda";

async function requisicao(url) {
  const token = getToken();

  if (!token) {
    const erro = new Error("Faça login novamente.");
    erro.status = 401;
    throw erro;
  }

  let resposta;

  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
  } catch (e) {
    const erro = new Error("Não foi possível conectar ao servidor.");
    erro.status = 0;
    throw erro;
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(
      dados.erro || dados.mensagem || "Erro ao carregar os dados."
    );
    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

export async function obterPerfilCliente() {
  return requisicao(`${API_CLIENTE}/perfil`);
}

export async function listarProcessosDoCliente() {
  const dados = await requisicao(`${API_CLIENTE}/processos`);

  if (Array.isArray(dados)) return dados;
  return Array.isArray(dados.processos) ? dados.processos : [];
}

export async function listarCompromissosDoCliente() {
  const dados = await requisicao(`${API_AGENDA}/cliente`);

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados.compromissos)) return dados.compromissos;
  if (Array.isArray(dados.agenda)) return dados.agenda;

  return [];
}

export function assinarEventosCliente(aoEvento) {
  const token = getToken();

  if (!token || typeof EventSource === "undefined") {
    return () => {};
  }

  const fonte = new EventSource(
    `${API_CLIENTE}/eventos?token=${encodeURIComponent(token)}`
  );

  ["agenda", "processos", "notificacoes"].forEach(tipo => {
    fonte.addEventListener(tipo, () => {
      try {
        aoEvento(tipo);
      } catch (erro) {
        console.error("Erro ao processar evento do cliente:", erro);
      }
    });
  });

  fonte.onerror = erro => {
    console.warn("Conexão de atualização em tempo real interrompida.", erro);
  };

  return () => fonte.close();
}