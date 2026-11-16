import { getToken } from "../../services/authService.js";
import {
  MESES,
  escaparHTML,
  texto,
  pegar,
  formatarData,
  formatarHora,
  momentoDoCompromisso,
  compromissosFuturos,
  compromissosAnteriores,
  observarCompromissos
} from "../../services/compromissosCliente.js";

if (!getToken()) {
  window.location.href = "login.html";
}

let compromissos = [];
let carregou = false;
let erroCarregar = "";
let filtroAtual = "proximos";

const elLista = document.getElementById("lista-agenda");
const elResumo = document.getElementById("resumo-agenda");
const elBusca = document.getElementById("busca");

function getLista() {
  const termo = texto(elBusca.value).toLowerCase();

  let lista;

  if (filtroAtual === "proximos") lista = compromissosFuturos(compromissos);
  else if (filtroAtual === "anteriores") lista = compromissosAnteriores(compromissos);
  else {
    lista = compromissos
      .filter(c => momentoDoCompromisso(c))
      .sort((a, b) => momentoDoCompromisso(a) - momentoDoCompromisso(b));
  }

  if (!termo) return lista;

  return lista.filter(c =>
    [c.titulo, c.local, c.tipo, c.descricao, c.processo]
      .some(campo => texto(campo).toLowerCase().includes(termo))
  );
}

function renderResumo() {
  const agora = new Date();
  const futuros = compromissosFuturos(compromissos);
  const n = futuros.length;

  const noMes = compromissos.filter(c => {
    const d = momentoDoCompromisso(c);
    return d && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  });

  elResumo.textContent = erroCarregar && !carregou
    ? erroCarregar
    : `Você tem ${n} compromisso${n === 1 ? "" : "s"} futuro${n === 1 ? "" : "s"}.`;

  document.getElementById("stat-total").textContent = compromissos.length;
  document.getElementById("stat-mes").textContent = noMes.length;

  if (n) {
    const p = futuros[0];
    const d = momentoDoCompromisso(p);
    const hora = texto(pegar(p, "horario", "hora")).substring(0, 5);

    document.getElementById("stat-proximo").textContent =
      `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()].toLowerCase()}` +
      (hora ? ` às ${hora}` : "");
  } else {
    document.getElementById("stat-proximo").textContent = "—";
  }
}

function classeStatus(status) {
  const s = texto(status).toLowerCase();
  if (s === "concluído" || s === "concluido") return "badge-verde";
  if (s === "cancelado") return "badge-vermelho";
  return "badge-azul";
}

function renderAgenda() {
  if (!carregou) {
    elLista.innerHTML = erroCarregar
      ? `<p class="vazio">${escaparHTML(erroCarregar)}</p>`
      : '<p class="vazio">Carregando compromissos...</p>';
    return;
  }

  const lista = getLista();

  if (!lista.length) {
    const mensagens = {
      proximos: "Nenhum compromisso futuro.",
      anteriores: "Nenhum compromisso anterior.",
      todos: "Nenhum compromisso encontrado."
    };

    elLista.innerHTML = `<p class="vazio">${
      texto(elBusca.value) ? "Nenhum compromisso encontrado." : mensagens[filtroAtual]
    }</p>`;
    return;
  }

  elLista.innerHTML = lista.map(c => {
    const d = momentoDoCompromisso(c);
    const hora = formatarHora(pegar(c, "horario", "hora"));
    const local = texto(c.local);
    const tipo = texto(c.tipo);
    const processo = texto(c.processo);
    const descricao = texto(c.descricao);
    const status = texto(c.status);
    const dataPrazo = formatarData(pegar(c, "data_prazo", "dataPrazo"));
    const horaPrazo = formatarHora(pegar(c, "hora_prazo", "horaPrazo"));

    const extras = [
      tipo ? `Tipo: ${tipo}` : "",
      processo ? `Processo: ${processo}` : "",
      dataPrazo ? `Prazo: ${dataPrazo}${horaPrazo ? " às " + horaPrazo : ""}` : ""
    ].filter(Boolean).join(" · ");

    return `
      <div class="compromisso-card">
        <div class="data-box">
          <strong>${String(d.getDate()).padStart(2, "0")}</strong>
          <span>${MESES[d.getMonth()]}</span>
        </div>

        <div class="compromisso-info">
          <h4>${escaparHTML(texto(c.titulo) || "Compromisso")}</h4>
          <p>
            ${hora ? `<span class="meta"><i data-lucide="clock"></i> ${escaparHTML(hora)}</span>` : ""}
            ${local ? `<span class="meta"><i data-lucide="map-pin"></i> ${escaparHTML(local)}</span>` : ""}
          </p>
          ${extras ? `<p class="info-extra">${escaparHTML(extras)}</p>` : ""}
          ${descricao ? `<p class="info-extra info-descricao">${escaparHTML(descricao)}</p>` : ""}
        </div>

        ${status ? `<span class="badge ${classeStatus(status)}">${escaparHTML(status)}</span>` : ""}
      </div>`;
  }).join("");

  if (window.lucide) window.lucide.createIcons();
}

function atualizarTudo() {
  renderResumo();
  renderAgenda();
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filtroAtual = btn.dataset.filtro;
    renderAgenda();
  });
});

elBusca.addEventListener("input", renderAgenda);

observarCompromissos(
  lista => {
    compromissos = lista;
    carregou = true;
    erroCarregar = "";
    atualizarTudo();
  },
  erro => {
    console.error("Erro ao carregar a agenda:", erro);

    if (erro.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!carregou) {
      erroCarregar = "Não foi possível carregar os compromissos.";
      atualizarTudo();
    }
  }
);

setInterval(atualizarTudo, 60000);