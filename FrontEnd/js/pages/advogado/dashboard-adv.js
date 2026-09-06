// ==========================================================
// js/pages/advogado/dashboard-adv.js
//
// Dashboard do Advogado com atualização automática
// (Últimos Processos e Próximos Compromissos "em tempo real")
//
// Como este projeto usa uma API REST (Express + JWT) e não
// leitura direta do Firestore no navegador, a forma correta
// de manter os dados "em tempo real" aqui é fazer POLLING:
// buscar os dados de novo no backend em intervalos curtos,
// sem precisar recarregar a página.
// ==========================================================

import { getToken } from "../../services/authService.js";
import { listarProcessos } from "../../services/processoService.js";
import { listarCompromissos } from "../../services/agendaService.js";
import { listarNotificacoes, marcarComoLida } from "../../services/notificacaoService.js";


// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

// Intervalo entre as atualizações automáticas (em milissegundos)
const INTERVALO_ATUALIZACAO = 8000; // 8 segundos

// Quantos itens mostrar em cada painel do dashboard
const LIMITE_PROCESSOS = 5;
const LIMITE_COMPROMISSOS = 5;


// ==========================================================
// ELEMENTOS
// ==========================================================

const listaProcessosEl =
    document.getElementById("listaProcessos");

const listaAgendaEl =
    document.getElementById("listaAgenda");

const totalProcessosEl =
    document.getElementById("totalProcessos");

const totalAgendaEl =
    document.getElementById("totalAgenda");

const statusProcessosEl =
    document.getElementById("statusProcessos");

const statusAgendaEl =
    document.getElementById("statusAgenda");

const listaNotificacoesEl =
    document.getElementById("listaNotificacoes");

const totalNotificacoesEl =
    document.getElementById("totalNotificacoes");

const statusNotificacoesEl =
    document.getElementById("statusNotificacoes");


// ==========================================================
// PROTEÇÃO DE ROTA
// ==========================================================

if (!getToken()) {

    window.location.href = "login-adv.html";

}


// ==========================================================
// CONTROLE DE ESTADO
// ==========================================================

let carregandoProcessos = false;
let carregandoAgenda = false;

let idIntervaloProcessos = null;
let idIntervaloAgenda = null;


// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================

// Mostra o horário da última atualização em um "status"
function marcarAtualizado(elementoStatus) {

    if (!elementoStatus) return;

    const agora = new Date();

    const hora = agora.toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit", second: "2-digit" }
    );

    elementoStatus.textContent = `Atualizado às ${hora}`;
    elementoStatus.classList.remove("erro", "pausado");

}

function marcarErro(elementoStatus, mensagem) {

    if (!elementoStatus) return;

    elementoStatus.textContent = mensagem || "Erro ao atualizar";
    elementoStatus.classList.add("erro");
    elementoStatus.classList.remove("pausado");

}

function marcarPausado(elementoStatus) {

    if (!elementoStatus) return;

    elementoStatus.textContent = "Atualização pausada (aba em segundo plano)";
    elementoStatus.classList.add("pausado");
    elementoStatus.classList.remove("erro");

}

// Tenta converter datas em vários formatos (Timestamp do Firestore,
// string "yyyy-mm-dd" ou objeto Date) para um objeto Date válido
function converterParaData(valor) {

    if (!valor) return null;

    // Timestamp do Firestore (SDK do navegador, via onSnapshot)
    if (typeof valor === "object" && typeof valor.toDate === "function") {

        return valor.toDate();

    }

    // Timestamp vindo em JSON puro (via API REST): { _seconds, _nanoseconds }
    if (typeof valor === "object" && "_seconds" in valor) {

        return new Date(valor._seconds * 1000);

    }

    const data = new Date(valor);

    return isNaN(data.getTime()) ? null : data;

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

        const processos = Array.isArray(dados) ? dados : [];

        if (totalProcessosEl) {

            totalProcessosEl.textContent = processos.length;

        }

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

    // Ordena pelo mais recente primeiro (criadoEm) e pega só os últimos N
    const ordenados = [...processos].sort((a, b) => {

        const dataA = converterParaData(a.criadoEm) || new Date(0);
        const dataB = converterParaData(b.criadoEm) || new Date(0);

        return dataB - dataA;

    });

    const ultimos = ordenados.slice(0, LIMITE_PROCESSOS);

    listaProcessosEl.innerHTML = ultimos.map((processo) => `
        <tr>
            <td title="${processo.numeroProcesso || "-"}">${processo.numeroProcesso || "-"}</td>
            <td class="colTexto" title="${processo.cliente || "-"}">${processo.cliente || "-"}</td>
            <td>${processo.tribunal || processo.comarca || "-"}</td>
            <td>${processo.status || "-"}</td>
            <td>${processo.tipoManifestacao || "Nenhuma"}</td>
            <td>${processo.ultimaMovimentacao || "-"}</td>
            <td>${processo.intimacao === true ? "Sim" : "Não"}</td>
            <td>${processo.prazo || "-"}</td>
        </tr>
    `).join("");

}


// ==========================================================
// PRÓXIMOS COMPROMISSOS
// ==========================================================

async function carregarProximosCompromissos({ mostrarCarregando = false } = {}) {

    if (carregandoAgenda) return;

    carregandoAgenda = true;

    try {

        if (mostrarCarregando && listaAgendaEl) {

            listaAgendaEl.innerHTML = `
                <li>Carregando compromissos...</li>
            `;

        }

        const dados = await listarCompromissos();

        const compromissos = Array.isArray(dados) ? dados : [];

        if (totalAgendaEl) {

            totalAgendaEl.textContent = compromissos.length;

        }

        renderizarProximosCompromissos(compromissos);

        marcarAtualizado(statusAgendaEl);

    } catch (erro) {

        console.error("Erro ao carregar compromissos:", erro);

        marcarErro(statusAgendaEl, "Não foi possível atualizar a agenda.");

        if (listaAgendaEl && listaAgendaEl.children.length === 0) {

            listaAgendaEl.innerHTML = `
                <li style="color:#c0392b;">
                    Erro ao carregar os compromissos.
                </li>
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

    // Só mostra compromissos de hoje em diante e ainda não concluídos
    const futuros = compromissos.filter((compromisso) => {

        if (compromisso.status === "Concluído" || compromisso.concluido === true) {

            return false;

        }

        const dataCompromisso = converterParaData(compromisso.data);

        if (!dataCompromisso) return true; // sem data definida, mostra mesmo assim

        return dataCompromisso >= hoje;

    });

    if (futuros.length === 0) {

        listaAgendaEl.innerHTML = `
            <li>Nenhum compromisso futuro cadastrado.</li>
        `;

        return;

    }

    // Ordena por data + horário (mais próximo primeiro)
    const ordenados = [...futuros].sort((a, b) => {

        const dataA = new Date(`${a.data || ""}T${a.horario || "00:00"}`);
        const dataB = new Date(`${b.data || ""}T${b.horario || "00:00"}`);

        return dataA - dataB;

    });

    const proximos = ordenados.slice(0, LIMITE_COMPROMISSOS);

    listaAgendaEl.innerHTML = proximos.map((compromisso) => {

        const dataFormatada = compromisso.data
            ? new Date(`${compromisso.data}T00:00:00`).toLocaleDateString("pt-BR")
            : "Sem data";

        const dataPrazoFormatada = compromisso.dataPrazo
            ? new Date(`${compromisso.dataPrazo}T00:00:00`).toLocaleDateString("pt-BR")
            : "";

        return `
            <li class="itemCompromissoDash">

                <div class="horaCompromissoDash">
                    ${compromisso.horario || "--:--"}
                </div>

                <div class="infoCompromissoDash">

                    <h3>${compromisso.titulo || "Sem título"}</h3>

                    ${compromisso.descricao ? `
                        <p><strong>Descrição:</strong> ${compromisso.descricao}</p>
                    ` : ""}

                    ${compromisso.tipo ? `
                        <p><strong>Tipo:</strong> ${compromisso.tipo}</p>
                    ` : ""}

                    ${compromisso.cliente ? `
                        <p><strong>Cliente:</strong> ${compromisso.cliente}</p>
                    ` : ""}

                    ${compromisso.processo ? `
                        <p><strong>Processo:</strong> ${compromisso.processo}</p>
                    ` : ""}

                    ${compromisso.local ? `
                        <p><strong>Local:</strong> ${compromisso.local}</p>
                    ` : ""}

                    <p><strong>Data:</strong> ${dataFormatada}</p>

                    ${dataPrazoFormatada ? `
                        <p><strong>Data do prazo:</strong> ${dataPrazoFormatada}</p>
                    ` : ""}

                    ${compromisso.horaPrazo ? `
                        <p><strong>Horário limite:</strong> ${compromisso.horaPrazo}</p>
                    ` : ""}

                    <p><strong>Status:</strong> ${compromisso.status || "Agendado"}</p>

                </div>

            </li>
        `;

    }).join("");

}


// ==========================================================
// NOTIFICAÇÕES AUTOMÁTICAS (RF007 - TEMPO REAL / onSnapshot)
// ==========================================================
//
// listarNotificacoes já é implementada com onSnapshot do
// Firestore, então essa lista atualiza sozinha, na hora,
// sempre que o backend criar uma notificação nova
// (processo cadastrado/atualizado, audiência marcada,
// prazo se aproximando, etc.) — sem precisar de polling.

const ICONE_POR_TIPO = {
    processo: "📌",
    prazo: "⏰",
    audiencia: "📅",
    sistema: "🔔"
};

let cancelarNotificacoes = null;

function iniciarNotificacoesTempoReal() {

    if (!listaNotificacoesEl) return;

    try {

        cancelarNotificacoes = listarNotificacoes((notificacoes) => {

            const lista = Array.isArray(notificacoes) ? notificacoes : [];

            const naoLidas = lista.filter((item) => item.lida !== true);

            if (totalNotificacoesEl) {

                totalNotificacoesEl.textContent = naoLidas.length;

            }

            renderizarNotificacoes(lista);

            marcarAtualizado(statusNotificacoesEl);

        });

    } catch (erro) {

        console.error("Erro ao observar notificações:", erro);

        marcarErro(statusNotificacoesEl, "Não foi possível conectar às notificações.");

    }

}

function renderizarNotificacoes(notificacoes) {

    if (notificacoes.length === 0) {

        listaNotificacoesEl.innerHTML = `
            <li>Nenhuma notificação por enquanto.</li>
        `;

        return;

    }

    // Mais recentes primeiro
    const ordenadas = [...notificacoes].sort((a, b) => {

        const dataA = converterParaData(a.dataEnvio) || new Date(0);
        const dataB = converterParaData(b.dataEnvio) || new Date(0);

        return dataB - dataA;

    });

    const ultimas = ordenadas.slice(0, 8);

    listaNotificacoesEl.innerHTML = ultimas.map((item) => {

        const icone = ICONE_POR_TIPO[item.tipo] || ICONE_POR_TIPO.sistema;

        const naoLida = item.lida !== true;

        return `
            <li
                data-id="${item.id}"
                class="notificacao ${naoLida ? "naoLida" : ""}"
                style="cursor:pointer;"
                title="Clique para marcar como lida"
            >
                ${icone}
                <strong>${item.titulo || "Notificação"}:</strong>
                ${item.mensagem || ""}
            </li>
        `;

    }).join("");

    // Clique em uma notificação -> marca como lida
    listaNotificacoesEl
        .querySelectorAll("li[data-id]")
        .forEach((li) => {

            li.addEventListener("click", async () => {

                const id = li.dataset.id;

                try {

                    await marcarComoLida(id);

                } catch (erro) {

                    console.error("Erro ao marcar notificação como lida:", erro);

                }

            });

        });

}


// ==========================================================
// ATUALIZAÇÃO AUTOMÁTICA (POLLING)
// ==========================================================

function atualizarTudo({ mostrarCarregando = false } = {}) {

    carregarProcessos({ mostrarCarregando });
    carregarProximosCompromissos({ mostrarCarregando });

}

function iniciarAtualizacaoAutomatica() {

    pararAtualizacaoAutomatica();

    idIntervaloProcessos = setInterval(
        () => carregarProcessos(),
        INTERVALO_ATUALIZACAO
    );

    idIntervaloAgenda = setInterval(
        () => carregarProximosCompromissos(),
        INTERVALO_ATUALIZACAO
    );

}

function pararAtualizacaoAutomatica() {

    if (idIntervaloProcessos) clearInterval(idIntervaloProcessos);
    if (idIntervaloAgenda) clearInterval(idIntervaloAgenda);

    idIntervaloProcessos = null;
    idIntervaloAgenda = null;

}

// Pausa o polling quando a aba está em segundo plano
// (economiza requisições) e retoma + atualiza na hora
// em que o usuário volta para a aba.
document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        pararAtualizacaoAutomatica();
        marcarPausado(statusProcessosEl);
        marcarPausado(statusAgendaEl);

    } else {

        atualizarTudo();
        iniciarAtualizacaoAutomatica();

    }

});

// Garante que os intervalos são encerrados ao sair da página
window.addEventListener("beforeunload", () => {

    pararAtualizacaoAutomatica();

    if (typeof cancelarNotificacoes === "function") {

        cancelarNotificacoes();

    }

});


// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

atualizarTudo({ mostrarCarregando: true });
iniciarAtualizacaoAutomatica();
iniciarNotificacoesTempoReal();