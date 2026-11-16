// js/pages/cliente/cliente.js
// Notificações do dashboard do cliente, vindas do banco (rota GET /notificacoes).
// Atualiza sozinho a cada 8 segundos: quando o advogado cadastra ou altera
// um processo (ou agenda algo), a notificação aparece aqui sem recarregar.

import { getToken } from "../../services/authService.js";
import {
  listarNotificacoes,
  marcarComoLida
} from "../../services/notificacaoService.js";

// Protege a página: sem login, volta para o login do cliente.
if (!getToken()) {
  window.location.href = "login.html";
}

const list = document.getElementById("list");

if (list) {
  let filtro = "all";
  let notificacoes = [];

  const contador = document.getElementById("qtd-notif"); // oculto, opcional
  const sub = document.getElementById("sub");           // opcional

  function formatarData(valor) {
    if (!valor) return "";
    const d = new Date(valor);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR") + " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function naoLidas() {
    return notificacoes.filter(n => n.lida !== true);
  }

  function atualizarContagem() {
    const qtd = naoLidas().length;

    if (contador) contador.textContent = qtd;

    if (sub) {
      sub.textContent = qtd === 1
        ? "Você tem 1 notificação nova."
        : `Você tem ${qtd} notificações novas.`;
    }
  }

  function criarItem(n) {
    const item = document.createElement("div");
    item.className = "nt" + (n.lida === true ? " read" : "");
    item.dataset.id = n.id;

    const dot = document.createElement("span");
    dot.className = "dot";

    // textContent evita injetar HTML vindo do banco
    const texto = document.createElement("span");
    const titulo = document.createElement("b");
    titulo.textContent = n.titulo || "Notificação";
    texto.appendChild(titulo);

    if (n.mensagem) {
      texto.appendChild(document.createTextNode(" — " + n.mensagem));
    }

    const quando = formatarData(n.data_envio || n.criado_em);
    if (quando) {
      const small = document.createElement("small");
      small.style.display = "block";
      small.style.opacity = ".7";
      small.textContent = quando;
      texto.appendChild(small);
    }

    item.append(dot, texto);

    if (n.lida !== true) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = "Marcar como lida";
      botao.setAttribute(
        "aria-label",
        "Marcar como lida: " + (n.titulo || "notificação")
      );
      item.appendChild(botao);
    }

    return item;
  }

  function renderizar() {
    const visiveis = notificacoes.filter(
      n => filtro === "all" || n.lida !== true
    );

    list.replaceChildren();

    if (visiveis.length === 0) {
      const vazio = document.createElement("div");
      vazio.className = "nt read";
      const dot = document.createElement("span");
      dot.className = "dot";
      const msg = document.createElement("span");
      msg.textContent = filtro === "new"
        ? "Nenhuma notificação não lida."
        : "Nenhuma notificação por enquanto.";
      vazio.append(dot, msg);
      list.appendChild(vazio);
    } else {
      visiveis.forEach(n => list.appendChild(criarItem(n)));
    }

    atualizarContagem();
  }

  // Marcar como lida (salva no banco)
  list.addEventListener("click", async e => {
    const botao = e.target.closest("button");
    if (!botao) return;

    const item = botao.closest(".nt");
    const id = item?.dataset.id;
    if (!id) return;

    const notificacao = notificacoes.find(n => String(n.id) === id);
    if (!notificacao) return;

    notificacao.lida = true; // atualiza na hora
    renderizar();

    try {
      await marcarComoLida(id);
    } catch (erro) {
      console.error("Erro ao marcar como lida:", erro);
      notificacao.lida = false; // desfaz se o servidor recusar
      renderizar();
    }
  });

  // Filtro Todas / Não lidas
  document.querySelectorAll(".tabs button").forEach(b => {
    b.addEventListener("click", () => {
      filtro = b.dataset.f;
      document.querySelectorAll(".tabs button").forEach(x =>
        x.setAttribute("aria-pressed", x === b)
      );
      renderizar();
    });
  });

  // Busca no servidor agora e a cada 8 segundos
  listarNotificacoes(lista => {
    notificacoes = lista;
    renderizar();
  });
}