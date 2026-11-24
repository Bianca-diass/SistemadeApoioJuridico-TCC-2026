
import { getToken } from "../../services/authService.js";

import {
  listarNotificacoes,
  marcarComoLida
} from "../../services/notificacaoService.js";

if (!getToken()) {
  window.location.href = "login.html";
}

const lista = document.getElementById("list");
const contador = document.getElementById("qtd-notif");
const subtitulo = document.getElementById("sub");

if (lista) {

  let notificacoes = [];
  let filtro = "all";
  const processando = new Set();

  function formatarData(valor) {
    if (!valor) return "";

    const data = new Date(valor);

    if (isNaN(data.getTime())) return "";

    return data.toLocaleDateString("pt-BR") +
      " às " +
      data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
  }

  function naoLidas() {
    return notificacoes.filter(n => n.lida !== true);
  }

  function atualizarContagem() {
    const quantidade = naoLidas().length;

    if (contador) {
      contador.textContent = quantidade;
    }

    if (subtitulo) {
      subtitulo.textContent =
        quantidade === 1
          ? "Você tem 1 notificação nova."
          : `Você tem ${quantidade} notificações novas.`;
    }
  }

  function criarItem(n) {

    const item = document.createElement("div");

    item.className =
      "nt" + (n.lida === true ? " read" : "");

    item.dataset.id = n.id;

    const ponto = document.createElement("span");
    ponto.className = "dot";

    const conteudo = document.createElement("span");

    const titulo = document.createElement("b");

    titulo.textContent = n.titulo || "Notificação";

    conteudo.appendChild(titulo);

    if (n.mensagem) {
      conteudo.appendChild(
        document.createTextNode(" — " + n.mensagem)
      );
    }

    const data = formatarData(
      n.data_envio || n.criado_em
    );

    if (data) {
      const horario = document.createElement("small");

      horario.style.display = "block";
      horario.style.opacity = ".7";
      horario.textContent = data;

      conteudo.appendChild(horario);
    }

    item.append(ponto, conteudo);

    if (n.lida !== true) {

      const botao = document.createElement("button");

      botao.type = "button";
      botao.textContent = "Marcar como lida";
      botao.dataset.acao = "marcar-lida";

      item.appendChild(botao);
    }

    return item;
  }

  function renderizar() {

    const visiveis = notificacoes.filter(n =>
      filtro === "all" || n.lida !== true
    );

    lista.replaceChildren();

    if (visiveis.length === 0) {

      const vazio = document.createElement("div");

      vazio.className = "nt read";

      const mensagem = document.createElement("span");

      mensagem.textContent =
        filtro === "new"
          ? "Nenhuma notificação não lida."
          : "Nenhuma notificação por enquanto.";

      vazio.appendChild(mensagem);

      lista.appendChild(vazio);

    } else {

      visiveis.forEach(n => {
        lista.appendChild(criarItem(n));
      });

    }

    atualizarContagem();
  }

  // MARCAR NOTIFICAÇÃO COMO LIDA NO SUPABASE
  lista.addEventListener("click", async (evento) => {

    const botao = evento.target.closest(
      '[data-acao="marcar-lida"]'
    );

    if (!botao) return;

    const item = botao.closest(".nt");

    const id = item?.dataset.id;

    if (!id || processando.has(id)) return;

    const notificacao = notificacoes.find(
      n => String(n.id) === String(id)
    );

    if (!notificacao || notificacao.lida === true) {
      return;
    }

    processando.add(id);

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {

      // Atualiza primeiro no banco de dados.
      await marcarComoLida(id);

      // Atualiza a interface após confirmação do servidor.
      notificacao.lida = true;
      notificacao.status = "Lida";

      renderizar();

    } catch (erro) {

      console.error(
        "Erro ao marcar notificação como lida:",
        erro
      );

      alert(
        "Não foi possível marcar a notificação como lida. Tente novamente."
      );

      botao.disabled = false;
      botao.textContent = "Marcar como lida";

    } finally {

      processando.delete(id);

    }

  });

  // FILTRO TODAS / NÃO LIDAS
  document.querySelectorAll(".tabs button").forEach(botao => {

    botao.addEventListener("click", () => {

      filtro = botao.dataset.f;

      document.querySelectorAll(".tabs button").forEach(outro => {

        outro.setAttribute(
          "aria-pressed",
          String(outro === botao)
        );

      });

      renderizar();

    });

  });

  // ATUALIZA AS NOTIFICAÇÕES AUTOMATICAMENTE
  listarNotificacoes(listaAtualizada => {

    notificacoes = listaAtualizada;

    renderizar();

  });

}
