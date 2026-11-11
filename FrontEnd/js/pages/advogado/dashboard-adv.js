import { getToken } from "../../services/authService.js";
import { listarProcessos } from "../../services/processoService.js";
import { listarCompromissos } from "../../services/agendaService.js";
import { listarNotificacoes, marcarComoLida } from "../../services/notificacaoService.js";


// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

const INTERVALO_ATUALIZACAO = 8000; // 8 segundos
const LIMITE_PROCESSOS = 5;
const LIMITE_COMPROMISSOS = 5;
const LIMITE_NOTIFICACOES = 8;


// ==========================================================
// ELEMENTOS
// ==========================================================

const listaProcessosEl = document.getElementById("listaProcessos");
const listaAgendaEl = document.getElementById("listaAgenda");
const listaNotificacoesEl = document.getElementById("listaNotificacoes");

const totalProcessosEl = document.getElementById("totalProcessos");
const totalAgendaEl = document.getElementById("totalAgenda");
const totalNotificacoesEl = document.getElementById("totalNotificacoes");

const statusProcessosEl = document.getElementById("statusProcessos");
const statusAgendaEl = document.getElementById("statusAgenda");
const statusNotificacoesEl = document.getElementById("statusNotificacoes");


// ==========================================================
// PROTEÇÃO DE ROTA
// ==========================================================

if (!getToken()) {
    window.location.href = "login-adv.html";
}


// ==========================================================
// ESTADO
// ==========================================================

let carregandoProcessos = false;
let carregandoAgenda = false;
let carregandoNotificacoes = false;

let idIntervalo = null;


// ==========================================================
// UTILIDADES
// ==========================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[c]);
}

function marcarAtualizado(el) {
    if (!el) return;

    const hora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    el.textContent = `Atualizado às ${hora}`;
    el.classList.remove("erro", "pausado");
}

function marcarErro(el, mensagem) {
    if (!el) return;

    el.textContent = mensagem || "Erro ao atualizar";
    el.classList.add("erro");
    el.classList.remove("pausado");
}

function marcarPausado(el) {
    if (!el) return;

    el.textContent = "Atualização pausada (aba em segundo plano)";
    el.classList.add("pausado");
    el.classList.remove("erro");
}

// Converte vários formatos de data para Date
function converterParaData(valor) {
    if (!valor) return null;

    if (typeof valor === "object" && typeof valor.toDate === "function") {
        return valor.toDate();
    }

    if (typeof valor === "object" && "_seconds" in valor) {
        return new Date(valor._seconds * 1000);
    }

    if (typeof valor === "string") {
        // "AAAA-MM-DD" ou "AAAA-MM-DDTHH:mm..." : lê como data LOCAL
        const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (partes) {
            return new Date(
                Number(partes[1]),
                Number(partes[2]) - 1,
                Number(partes[3])
            );
        }
    }

    const data = new Date(valor);
    return isNaN(data.getTime()) ? null : data;
}

// "2026-10-31" ou "2026-10-31T00:00:00Z" -> "31/10/2026"
function formatarData(valor) {
    if (!valor) return "-";

    const partes = String(valor).substring(0, 10).split("-");

    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return String(valor);
}

function possuiIntimacao(valor) {
    return valor === true ||
        valor === 1 ||
        ["true", "1", "sim", "pendente"].includes(
            String(valor ?? "").trim().toLowerCase()
        );
}


// ==========================================================
// PADRONIZAR CAMPOS VINDOS DA API (snake_case -> camelCase)
// ==========================================================

function padronizarProcesso(p) {
    return {
        ...p,
        numeroProcesso: p.numeroProcesso ?? p.numero_processo ?? "",
        ultimaMovimentacao: p.ultimaMovimentacao ?? p.ultima_movimentacao ?? "",
        tipoManifestacao: p.tipoManifestacao ?? p.tipo_manifestacao ?? "",
        criadoEm: p.criadoEm ?? p.criado_em ?? p.created_at ?? p.createdAt ?? null
    };
}

function padronizarCompromisso(c) {
    return {
        ...c,
        horario: String(c.horario ?? c.hora ?? "").substring(0, 5),
        data: c.data ? String(c.data).substring(0, 10) : "",
        dataPrazo: c.dataPrazo ?? c.data_prazo ?? "",
        horaPrazo: String(c.horaPrazo ?? c.hora_prazo ?? "").substring(0, 5),
        processo: c.processo ?? c.numero_processo ?? c.numeroProcesso ?? ""
    };
}

function padronizarNotificacao(n) {
    return {
        ...n,
        dataEnvio: n.dataEnvio ?? n.data_envio ?? n.criado_em ?? n.created_at ?? null
    };
}


// ==========================================================
// ÚLTIMOS PROCESSOS
// ==========================================================

async function carregarProcessos({ mostrarCarregando = false } = {}) {
    if (carregandoProcessos) return;
    carregandoProcessos = true;

    try {
        if (mostrarCarregando && listaProcessosEl) {
            listaProcessosEl.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:24px;">
                        Carregando processos...
                    </td>
                </tr>
            `;
        }

        const dados = await listarProcessos();
        const processos = (Array.isArray(dados) ? dados : []).map(padronizarProcesso);

        if (totalProcessosEl) totalProcessosEl.textContent = processos.length;

        renderizarUltimosProcessos(processos);
        marcarAtualizado(statusProcessosEl);
    } catch (erro) {
        console.error("Erro ao carregar processos:", erro);
        marcarErro(statusProcessosEl, "Não foi possível atualizar os processos.");

        if (listaProcessosEl && listaProcessosEl.children.length === 0) {
            listaProcessosEl.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:24px; color:#c0392b;">
                        Erro ao carregar os processos.
                    </td>
                </tr>
            `;
        }
    } finally {
        carregandoProcessos = false;
    }
}

function renderizarUltimosProcessos(processos) {
    if (!listaProcessosEl) return;

    if (processos.length === 0) {
        listaProcessosEl.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:24px;">
                    Nenhum processo cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    const ordenados = [...processos].sort((a, b) => {
        const dataA = converterParaData(a.criadoEm) || new Date(0);
        const dataB = converterParaData(b.criadoEm) || new Date(0);
        return dataB - dataA;
    });

    listaProcessosEl.innerHTML = ordenados
        .slice(0, LIMITE_PROCESSOS)
        .map(processo => {
            const numero = escaparHTML(processo.numeroProcesso || "-");
            const cliente = escaparHTML(processo.cliente || "-");

            return `
                <tr>
                    <td title="${numero}">${numero}</td>
                    <td class="colTexto" title="${cliente}">${cliente}</td>
                    <td>${escaparHTML(processo.tribunal || processo.comarca || "-")}</td>
                    <td>${escaparHTML(processo.status || "-")}</td>
                    <td>${escaparHTML(processo.tipoManifestacao || "Nenhuma")}</td>
                    <td>${escaparHTML(processo.ultimaMovimentacao || "-")}</td>
                    <td>${possuiIntimacao(processo.intimacao) ? "Sim" : "Não"}</td>
                    <td>${escaparHTML(formatarData(processo.prazo))}</td>
                </tr>
            `;
        })
        .join("");
}


// ==========================================================
// PRÓXIMOS COMPROMISSOS
// ==========================================================

async function carregarProximosCompromissos({ mostrarCarregando = false } = {}) {
    if (carregandoAgenda) return;
    carregandoAgenda = true;

    try {
        if (mostrarCarregando && listaAgendaEl) {
            listaAgendaEl.innerHTML = `<li>Carregando compromissos...</li>`;
        }

        const dados = await listarCompromissos();
        const compromissos = (Array.isArray(dados) ? dados : []).map(padronizarCompromisso);

        if (totalAgendaEl) totalAgendaEl.textContent = compromissos.length;

        renderizarProximosCompromissos(compromissos);
        marcarAtualizado(statusAgendaEl);
    } catch (erro) {
        console.error("Erro ao carregar compromissos:", erro);
        marcarErro(statusAgendaEl, "Não foi possível atualizar a agenda.");

        if (listaAgendaEl && listaAgendaEl.children.length === 0) {
            listaAgendaEl.innerHTML = `
                <li style="color:#c0392b;">Erro ao carregar os compromissos.</li>
            `;
        }
    } finally {
        carregandoAgenda = false;
    }
}

function renderizarProximosCompromissos(compromissos) {
    if (!listaAgendaEl) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Remove só os concluídos e cancelados
    const ativos = compromissos.filter(compromisso => {
        const status = String(compromisso.status || "").toLowerCase();

        return !(
            status === "concluído" ||
            status === "concluido" ||
            status === "cancelado" ||
            compromisso.concluido === true
        );
    });

    if (ativos.length === 0) {
        listaAgendaEl.innerHTML = `<li>Nenhum compromisso pendente.</li>`;
        return;
    }

    const dataHora = c => new Date(`${c.data || ""}T${c.horario || "00:00"}`);

    const ehAtrasado = c => {
        const d = converterParaData(c.data);
        return d ? d < hoje : false;
    };

    // Futuros primeiro (mais próximo antes), depois os atrasados (mais recente antes)
    const futuros = ativos
        .filter(c => !ehAtrasado(c))
        .sort((a, b) => dataHora(a) - dataHora(b));

    const atrasados = ativos
        .filter(ehAtrasado)
        .sort((a, b) => dataHora(b) - dataHora(a));

    const lista = [...futuros, ...atrasados].slice(0, LIMITE_COMPROMISSOS);

    listaAgendaEl.innerHTML = lista.map(compromisso => {
        const atrasado = ehAtrasado(compromisso);

        return `
            <li class="itemCompromissoDash">

                <div class="horaCompromissoDash">
                    ${escaparHTML(compromisso.horario || "--:--")}
                </div>

                <div class="infoCompromissoDash">

                    <h3>
                        ${escaparHTML(compromisso.titulo || "Sem título")}
                        ${atrasado ? `
                            <span style="
                                background:#fdecea;
                                color:#c0392b;
                                border:1px solid #f5c6c0;
                                border-radius:20px;
                                padding:2px 10px;
                                font-size:11px;
                                font-weight:700;
                                margin-left:8px;
                                text-transform:uppercase;
                            ">Atrasado</span>
                        ` : ""}
                    </h3>

                    ${compromisso.descricao ? `
                        <p><strong>Descrição:</strong> ${escaparHTML(compromisso.descricao)}</p>
                    ` : ""}

                    ${compromisso.tipo ? `
                        <p><strong>Tipo:</strong> ${escaparHTML(compromisso.tipo)}</p>
                    ` : ""}

                    ${compromisso.cliente ? `
                        <p><strong>Cliente:</strong> ${escaparHTML(compromisso.cliente)}</p>
                    ` : ""}

                    ${compromisso.processo ? `
                        <p><strong>Processo:</strong> ${escaparHTML(compromisso.processo)}</p>
                    ` : ""}

                    ${compromisso.local ? `
                        <p><strong>Local:</strong> ${escaparHTML(compromisso.local)}</p>
                    ` : ""}

                    <p><strong>Data:</strong> ${escaparHTML(formatarData(compromisso.data))}</p>

                    ${compromisso.dataPrazo ? `
                        <p><strong>Data do prazo:</strong> ${escaparHTML(formatarData(compromisso.dataPrazo))}</p>
                    ` : ""}

                    ${compromisso.horaPrazo ? `
                        <p><strong>Horário limite:</strong> ${escaparHTML(compromisso.horaPrazo)}</p>
                    ` : ""}

                    <p><strong>Status:</strong> ${escaparHTML(compromisso.status || "Agendado")}</p>

                </div>

            </li>
        `;
    }).join("");
}


// ==========================================================
// NOTIFICAÇÕES (ATUALIZAÇÃO AUTOMÁTICA)
// ==========================================================

const ICONE_POR_TIPO = {
    processo: "📌",
    prazo: "⏰",
    audiencia: "📅",
    sistema: "🔔"
};

// Busca as notificações uma vez, aceitando as duas formas
// do service: função que retorna Promise OU que usa callback.
function buscarNotificacoesUmaVez() {
    return new Promise((resolve, reject) => {
        let resolvido = false;
        let cancelar = null;

        const finalizar = (lista) => {
            if (resolvido) return;
            resolvido = true;

            if (typeof cancelar === "function") {
                try { cancelar(); } catch (_) { /* ignora */ }
            }

            resolve(Array.isArray(lista) ? lista : []);
        };

        try {
            const retorno = listarNotificacoes(
                (lista) => finalizar(lista),
                (erro) => { if (!resolvido) { resolvido = true; reject(erro); } }
            );

            if (retorno && typeof retorno.then === "function") {
                retorno.then(finalizar).catch((erro) => {
                    if (!resolvido) { resolvido = true; reject(erro); }
                });
            } else if (typeof retorno === "function") {
                cancelar = retorno;
                if (resolvido) cancelar();
            } else if (Array.isArray(retorno)) {
                finalizar(retorno);
            }
        } catch (erro) {
            reject(erro);
        }
    });
}

async function carregarNotificacoes({ mostrarCarregando = false } = {}) {
    if (!listaNotificacoesEl) return;
    if (carregandoNotificacoes) return;
    carregandoNotificacoes = true;

    try {
        if (mostrarCarregando) {
            listaNotificacoesEl.innerHTML = `<li>Carregando notificações...</li>`;
        }

        const dados = await buscarNotificacoesUmaVez();
        const lista = dados.map(padronizarNotificacao);

        const naoLidas = lista.filter(item => item.lida !== true);

        if (totalNotificacoesEl) totalNotificacoesEl.textContent = naoLidas.length;

        renderizarNotificacoes(lista);
        marcarAtualizado(statusNotificacoesEl);
    } catch (erro) {
        console.error("Erro ao carregar notificações:", erro);
        marcarErro(statusNotificacoesEl, "Não foi possível carregar as notificações.");

        if (listaNotificacoesEl.querySelector("li[data-id]") === null) {
            listaNotificacoesEl.innerHTML = `<li>Erro ao carregar as notificações.</li>`;
        }
    } finally {
        carregandoNotificacoes = false;
    }
}

function renderizarNotificacoes(notificacoes) {
    if (!listaNotificacoesEl) return;

    if (notificacoes.length === 0) {
        listaNotificacoesEl.innerHTML = `<li>Nenhuma notificação por enquanto.</li>`;
        return;
    }

    const ordenadas = [...notificacoes].sort((a, b) => {
        const dataA = converterParaData(a.dataEnvio) || new Date(0);
        const dataB = converterParaData(b.dataEnvio) || new Date(0);
        return dataB - dataA;
    });

    listaNotificacoesEl.innerHTML = ordenadas
        .slice(0, LIMITE_NOTIFICACOES)
        .map(item => {
            const icone = ICONE_POR_TIPO[item.tipo] || ICONE_POR_TIPO.sistema;
            const naoLida = item.lida !== true;

            return `
                <li
                    data-id="${escaparHTML(item.id)}"
                    class="notificacao ${naoLida ? "naoLida" : ""}"
                    style="cursor:pointer;"
                    title="Clique para marcar como lida"
                >
                    ${icone}
                    <strong>${escaparHTML(item.titulo || "Notificação")}:</strong>
                    ${escaparHTML(item.mensagem || "")}
                </li>
            `;
        })
        .join("");
}

// Clique em uma notificação -> marca como lida
listaNotificacoesEl?.addEventListener("click", async (evento) => {
    const li = evento.target.closest("li[data-id]");
    if (!li) return;

    try {
        await marcarComoLida(li.dataset.id);
        await carregarNotificacoes();
    } catch (erro) {
        console.error("Erro ao marcar notificação como lida:", erro);
    }
});


// ==========================================================
// ATUALIZAÇÃO AUTOMÁTICA (POLLING)
// ==========================================================

function atualizarTudo({ mostrarCarregando = false } = {}) {
    carregarProcessos({ mostrarCarregando });
    carregarProximosCompromissos({ mostrarCarregando });
    carregarNotificacoes({ mostrarCarregando });
}

function iniciarAtualizacaoAutomatica() {
    pararAtualizacaoAutomatica();
    idIntervalo = setInterval(() => atualizarTudo(), INTERVALO_ATUALIZACAO);
}

function pararAtualizacaoAutomatica() {
    if (idIntervalo) clearInterval(idIntervalo);
    idIntervalo = null;
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pararAtualizacaoAutomatica();
        marcarPausado(statusProcessosEl);
        marcarPausado(statusAgendaEl);
        marcarPausado(statusNotificacoesEl);
    } else {
        atualizarTudo();
        iniciarAtualizacaoAutomatica();
    }
});

window.addEventListener("beforeunload", pararAtualizacaoAutomatica);


// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

atualizarTudo({ mostrarCarregando: true });
iniciarAtualizacaoAutomatica();