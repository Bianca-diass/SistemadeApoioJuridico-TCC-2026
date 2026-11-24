import { getToken } from "../../services/authService.js";
import {
  obterPerfilCliente,
  listarProcessosDoCliente
} from "../../services/clienteDashboardService.js";
import {
  MESES,
  escaparHTML,
  texto,
  pegar,
  formatarData,
  formatarHora,
  momentoDoCompromisso,
  compromissosFuturos,
  observarCompromissos
} from "../../services/compromissosCliente.js";

if (!getToken()) {
  window.location.href = "login.html";
}

const INTERVALO = 8000;

const el = {
  nome: document.getElementById("nome-cliente"),
  protituloCard: document.getElementById("prox-titulo"),
  proxQuando: document.getElementById("prox-quando"),
  listaCompromissos: document.getElementById("lista-compromissos"),
  tabelaProcessos: document.getElementById("tabela-processos")
};

let processos = [];
let compromissos = [];
const processosAbertos = new Set();

function formatarDataHoraISO(valor) {
  const d = new Date(valor);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR") + " às " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarValor(chave, valor) {
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (/(^|_)(data|prazo|criado|atualizado)/i.test(chave) && /^\d{4}-\d{2}-\d{2}/.test(texto(valor))) {
    return /T\d{2}:\d{2}/.test(texto(valor))
      ? formatarDataHoraISO(valor)
      : formatarData(valor);
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return texto(valor);
}

const CAMPOS_PROCESSO = [
  ["numero_processo", "Número do processo"],
  ["cliente", "Cliente"],
  ["nome", "Nome do processo"],
  ["nome_processo", "Nome do processo"],
  ["titulo", "Título"],
  ["acao", "Ação"],
  ["tipo_acao", "Tipo de ação"],
  ["tipo", "Tipo"],
  ["tipo_manifestacao", "Manifestação"],
  ["status", "Situação atual"],
  ["descricao", "Descrição"],
  ["observacoes", "Descrição / observações"],
  ["data_abertura", "Data de abertura"],
  ["ultima_movimentacao", "Última movimentação"],
  ["intimacao", "Intimação"],
  ["prazo", "Próximo prazo"],
  ["vara", "Vara"],
  ["tribunal", "Tribunal"],
  ["comarca", "Comarca"],
  ["advogado", "Advogado responsável"]
];

const CAMPOS_OCULTOS = new Set([
  "id", "cliente_id", "advogado_id", "auth_user_id", "user_id",
  "criado_em", "atualizado_em", "created_at", "updated_at"
]);

function rotulo(chave) {
  const t = chave.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function paraSnake(chave) {
  return chave.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function padronizarProcesso(p) {
  const r = {};
  Object.entries(p).forEach(([k, v]) => { r[paraSnake(k)] = v; });
  return r;
}

function manifestacaoDoProcesso(p) {
  const t = texto(p.tipo_manifestacao);
  return t && t.toLowerCase() !== "nenhuma" ? t : "";
}

function tituloDoProcesso(p) {
  // Se o processo tiver um nome/título próprio, usa ele.
  const proprio = texto(
    pegar(p, "nome", "nome_processo", "titulo", "acao", "tipo_acao")
  );
  if (proprio) return proprio;

  // Senão monta um título com a vara e o tribunal.
  const local = [texto(p.vara), texto(p.tribunal)].filter(Boolean).join(" · ");
  if (local) return local;

  const manifestacao = manifestacaoDoProcesso(p);
  return manifestacao ? "Processo · " + manifestacao : "Processo";
}

// Texto explicando a intimação (aparece abaixo do selo "Nova intimação").
function textoDaIntimacao(p) {
  const manifestacao = manifestacaoDoProcesso(p);
  const prazo = formatarData(p.prazo);

  const partes = [];
  if (manifestacao) partes.push("Manifestação: " + manifestacao);
  if (prazo) partes.push("Prazo: " + prazo);

  return partes.length
    ? partes.join(" · ")
    : "Fale com seu advogado para saber como responder.";
}

function classeSituacao(status) {
  return /aguard|recurso|pend/i.test(status) ? "b-warn" : "b-info";
}

function detalhesDoProcesso(p) {
  const usados = new Set();
  const linhas = [];

  CAMPOS_PROCESSO.forEach(([chave, nome]) => {
    if (!(chave in p) || usados.has(chave)) return;
    usados.add(chave);

    const valor = p[chave];

    if (chave === "intimacao") {
      linhas.push([nome, valor === true ? "Nova intimação" : "Sem intimação"]);
      return;
    }

    if (valor === null || valor === undefined || texto(valor) === "") return;

    linhas.push([nome, formatarValor(chave, valor)]);
  });

  Object.entries(p).forEach(([chave, valor]) => {
    if (usados.has(chave) || CAMPOS_OCULTOS.has(chave)) return;
    if (valor === null || valor === undefined || texto(valor) === "") return;
    linhas.push([rotulo(chave), formatarValor(chave, valor)]);
  });

  return linhas;
}

function renderProcessos() {
  const corpo = el.tabelaProcessos;
  if (!corpo) return;

  if (!processos.length) {
    corpo.innerHTML = `
      <tr>
        <td colspan="4" class="vazio-tabela">Nenhum processo cadastrado por enquanto.</td>
      </tr>`;
    return;
  }

  corpo.innerHTML = processos.map(bruto => {
    const p = padronizarProcesso(bruto);
    const id = String(p.id);
    const aberto = processosAbertos.has(id);

    const numero = texto(p.numero_processo);
    const nomeCliente = texto(p.cliente);
    const situacao = texto(p.status);
    const movimentacao = texto(p.ultima_movimentacao);
    const prazo = formatarData(p.prazo);

    const detalhes = detalhesDoProcesso(p).map(([nome, valor]) => `
      <div class="det-item">
        <span>${escaparHTML(nome)}</span>
        <p>${escaparHTML(valor)}</p>
      </div>`).join("");

    return `
      <tr class="linha-processo">
        <td>
          <b>${escaparHTML(tituloDoProcesso(p))}</b>
          <small>${escaparHTML(numero || "Sem número")}</small>
          ${nomeCliente ? `<small>Cliente: ${escaparHTML(nomeCliente)}</small>` : ""}
          <button type="button" class="btn-detalhes" data-id="${escaparHTML(id)}"
                  aria-expanded="${aberto}">
            ${aberto ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        </td>
        <td>
          ${p.intimacao === true
            ? `<small style="display:block;margin-bottom:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#b26a00;">Atualização processual</small>`
            : ""}
          ${situacao
            ? `<span class="badge ${classeSituacao(situacao)}">${escaparHTML(situacao)}</span>`
            : "—"}
          ${p.intimacao === true
            ? `<span class="badge b-warn badge-intimacao">Nova intimação</span>
               <small style="display:block;margin-top:6px;">${escaparHTML(textoDaIntimacao(p))}</small>`
            : ""}
        </td>
        <td>${escaparHTML(movimentacao || "—")}</td>
        <td>${prazo ? `<b>${escaparHTML(prazo)}</b>` : "—"}</td>
      </tr>
      <tr class="linha-detalhes" ${aberto ? "" : "hidden"}>
        <td colspan="4"><div class="det-grid">${detalhes}</div></td>
      </tr>`;
  }).join("");
}

el.tabelaProcessos?.addEventListener("click", e => {
  const botao = e.target.closest(".btn-detalhes");
  if (!botao) return;

  const id = botao.dataset.id;

  if (processosAbertos.has(id)) processosAbertos.delete(id);
  else processosAbertos.add(id);

  renderProcessos();
});

function chipsDoCompromisso(c) {
  const d = momentoDoCompromisso(c);
  const chips = [];

  const hora = formatarHora(pegar(c, "horario", "hora"));
  const tipo = texto(c.tipo);
  const local = texto(c.local);
  const processo = texto(c.processo);
  const dataPrazo = formatarData(pegar(c, "data_prazo", "dataPrazo"));
  const horaPrazo = formatarHora(pegar(c, "hora_prazo", "horaPrazo"));

  chips.push(d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }));
  if (hora) chips.push(hora);
  if (tipo) chips.push(tipo);
  if (local) chips.push(local);
  if (processo) chips.push("Processo: " + processo);
  if (dataPrazo) chips.push("Prazo: " + dataPrazo + (horaPrazo ? " às " + horaPrazo : ""));

  return chips;
}

function renderCompromissos() {
  const futuros = compromissosFuturos(compromissos);

  if (futuros.length) {
    const c = futuros[0];

    el.protituloCard.textContent = texto(c.titulo) || "Compromisso";

    const descricao = texto(c.descricao);

    el.proxQuando.innerHTML =
      chipsDoCompromisso(c).map(t => `<span>${escaparHTML(t)}</span>`).join("") +
      (descricao ? `<p class="prox-desc">${escaparHTML(descricao)}</p>` : "");
  } else {
    el.protituloCard.textContent = "Nenhum compromisso futuro";
    el.proxQuando.innerHTML = "";
  }

  if (!futuros.length) {
    el.listaCompromissos.innerHTML = `<p class="vazio">Nenhum compromisso futuro.</p>`;
    return;
  }

  el.listaCompromissos.innerHTML = futuros.map(c => {
    const d = momentoDoCompromisso(c);
    const hora = formatarHora(pegar(c, "horario", "hora"));
    const tipo = texto(c.tipo);
    const local = texto(c.local);
    const processo = texto(c.processo);
    const descricao = texto(c.descricao);
    const dataPrazo = formatarData(pegar(c, "data_prazo", "dataPrazo"));
    const horaPrazo = formatarHora(pegar(c, "hora_prazo", "horaPrazo"));
    const status = texto(c.status);

    const meta = [
      hora ? `<time>${escaparHTML(hora)}</time>` : "",
      local ? escaparHTML(local) : "",
      processo ? "Processo: " + escaparHTML(processo) : "",
      dataPrazo ? "Prazo: " + escaparHTML(dataPrazo + (horaPrazo ? " às " + horaPrazo : "")) : "",
      status ? escaparHTML(status) : ""
    ].filter(Boolean).join(" · ");

    return `
      <div class="ev ev-detalhado">
        <div class="date">
          ${String(d.getDate()).padStart(2, "0")}
          <small>${MESES[d.getMonth()]}</small>
        </div>
        <p>
          <b>${escaparHTML(texto(c.titulo) || "Compromisso")}
            ${tipo ? `<span class="tag-tipo">${escaparHTML(tipo)}</span>` : ""}
          </b>
          ${meta}
          ${descricao ? `<span class="ev-desc">${escaparHTML(descricao)}</span>` : ""}
        </p>
      </div>`;
  }).join("");
}

observarCompromissos(
  lista => {
    compromissos = lista;
    renderCompromissos();
  },
  erro => {
    console.error("Erro ao atualizar os compromissos:", erro);
    if (erro.status === 401) {
      window.location.href = "login.html";
      return;
    }
    if (!compromissos.length) {
      el.protituloCard.textContent = "Não foi possível carregar";
      el.listaCompromissos.innerHTML =
        `<p class="vazio">${escaparHTML(erro.message)}</p>`;
    }
  }
);

let carregandoProcessos = false;

async function atualizarProcessos() {
  if (carregandoProcessos) return;
  carregandoProcessos = true;

  try {
    processos = await listarProcessosDoCliente();
    renderProcessos();
  } catch (erro) {
    console.error("Erro ao atualizar os processos:", erro);

    if (erro.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!processos.length && el.tabelaProcessos) {
      el.tabelaProcessos.innerHTML = `
        <tr>
          <td colspan="4" class="vazio-tabela">${escaparHTML(erro.message)}</td>
        </tr>`;
    }
  } finally {
    carregandoProcessos = false;
  }
}

async function carregarNome() {
  if (!el.nome) return;

  try {
    const perfil = await obterPerfilCliente();
    const primeiroNome = texto(perfil.nome).split(/\s+/)[0];
    if (primeiroNome) el.nome.textContent = primeiroNome;
  } catch (erro) {
    console.error("Erro ao carregar o nome do cliente:", erro);
  }
}

carregarNome();
atualizarProcessos();

setInterval(() => {
  if (!document.hidden) atualizarProcessos();
}, INTERVALO);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) atualizarProcessos();
});

setInterval(renderCompromissos, 60000);