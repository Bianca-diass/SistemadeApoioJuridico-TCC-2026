// ==========================================================
// js/pages/advogado/relatorios.js
//
// Relatórios do Advogado com atualização automática.
//
// - Processos, Clientes e Compromissos vêm da API REST
//   (Express + JWT), então são atualizados por POLLING
//   (nova busca automática em intervalos curtos).
//
// - Notificações (usadas na seção "Prazos Concluídos") vêm
//   direto do Firestore com onSnapshot, então são
//   TEMPO REAL DE VERDADE: qualquer mudança no banco aparece
//   na hora, sem esperar nenhum intervalo.
// ==========================================================

import { getToken } from "../../services/authService.js";
import { listarClientes } from "../../services/clienteService.js";
import { listarProcessos } from "../../services/processoService.js";
import { listarCompromissos } from "../../services/agendaService.js";
import { listarNotificacoes } from "../../services/notificacaoService.js";


// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

const INTERVALO_ATUALIZACAO = 8000; // 8 segundos
const LIMITE_LINHAS = 5;


// ==========================================================
// ELEMENTOS
// ==========================================================

const processosTotal = document.getElementById("processosTotal");
const clientesTotal = document.getElementById("clientesTotal");
const prazosTotal = document.getElementById("prazosTotal");
const agendaTotal = document.getElementById("agendaTotal");

const listaProcessos = document.getElementById("listaProcessos");
const listaClientes = document.getElementById("listaClientes");
const listaPrazos = document.getElementById("listaPrazos");
const listaAgenda = document.getElementById("listaAgenda");

const statusProcessosEl = document.getElementById("statusProcessosRel");
const statusClientesEl = document.getElementById("statusClientesRel");
const statusPrazosEl = document.getElementById("statusPrazosRel");
const statusAgendaEl = document.getElementById("statusAgendaRel");


// ==========================================================
// PROTEÇÃO DE ROTA
// ==========================================================

if (!getToken()) {
    window.location.href = "login-adv.html";
}


// ==========================================================
// AUXILIARES DE STATUS
// ==========================================================

function marcarAtualizado(elemento) {

    if (!elemento) return;

    const agora = new Date();

    const hora = agora.toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit", second: "2-digit" }
    );

    elemento.textContent = `Atualizado às ${hora}`;
    elemento.classList.remove("erro", "pausado");

}

function marcarErro(elemento, mensagem) {

    if (!elemento) return;

    elemento.textContent = mensagem || "Erro ao atualizar";
    elemento.classList.add("erro");
    elemento.classList.remove("pausado");

}

function marcarPausado(elemento) {

    if (!elemento) return;

    elemento.textContent = "Pausado (aba em segundo plano)";
    elemento.classList.add("pausado");
    elemento.classList.remove("erro");

}


// ==========================================================
// CLIENTES  (REST - polling)
// ==========================================================

let carregandoClientes = false;

async function carregarClientes() {

    if (carregandoClientes) return;

    carregandoClientes = true;

    try {

        await listarClientes((clientes) => {

            clientes = Array.isArray(clientes) ? clientes : [];

            clientesTotal.textContent = clientes.length;

            const ultimos = [...clientes].slice(-LIMITE_LINHAS).reverse();

            if (ultimos.length === 0) {

                listaClientes.innerHTML = `
                    <tr>
                        <td colspan="3" class="vazio">
                            Nenhum cliente cadastrado.
                        </td>
                    </tr>
                `;

            } else {

                listaClientes.innerHTML = ultimos.map((cliente) => `
                    <tr>
                        <td title="${cliente.nome || "-"}">${cliente.nome || "-"}</td>
                        <td>${cliente.cpf || "-"}</td>
                        <td>${cliente.telefone || cliente.contato || "-"}</td>
                    </tr>
                `).join("");

            }

            marcarAtualizado(statusClientesEl);

        });

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

        marcarErro(statusClientesEl, "Não foi possível atualizar os clientes.");

        if (listaClientes.children.length === 0) {

            listaClientes.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Não foi possível carregar os clientes.
                    </td>
                </tr>
            `;

        }

    } finally {

        carregandoClientes = false;

    }

}


// ==========================================================
// PROCESSOS  (REST - polling)
// ==========================================================

let carregandoProcessos = false;

async function carregarProcessos() {

    if (carregandoProcessos) return;

    carregandoProcessos = true;

    try {

        const processos = await listarProcessos();

        const lista = Array.isArray(processos) ? processos : [];

        processosTotal.textContent = lista.length;

        const ultimos = [...lista].slice(-LIMITE_LINHAS).reverse();

        if (ultimos.length === 0) {

            listaProcessos.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Nenhum processo cadastrado.
                    </td>
                </tr>
            `;

        } else {

            listaProcessos.innerHTML = ultimos.map((processo) => `
                <tr>
                    <td title="${processo.numeroProcesso || "-"}">${processo.numeroProcesso || "-"}</td>
                    <td title="${processo.cliente || "-"}">${processo.cliente || "-"}</td>
                    <td>${processo.status || "-"}</td>
                </tr>
            `).join("");

        }

        marcarAtualizado(statusProcessosEl);

    } catch (erro) {

        console.error("Erro ao carregar processos:", erro);

        marcarErro(statusProcessosEl, "Não foi possível atualizar os processos.");

        if (listaProcessos.children.length === 0) {

            listaProcessos.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Não foi possível carregar os processos.
                    </td>
                </tr>
            `;

        }

    } finally {

        carregandoProcessos = false;

    }

}


// ==========================================================
// COMPROMISSOS  (REST - polling)
// ==========================================================

let carregandoAgenda = false;

async function carregarAgenda() {

    if (carregandoAgenda) return;

    carregandoAgenda = true;

    try {

        const compromissos = await listarCompromissos();

        const lista = Array.isArray(compromissos) ? compromissos : [];

        agendaTotal.textContent = lista.length;

        const ultimos = [...lista].slice(-LIMITE_LINHAS).reverse();

        if (ultimos.length === 0) {

            listaAgenda.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Nenhum compromisso cadastrado.
                    </td>
                </tr>
            `;

        } else {

            listaAgenda.innerHTML = ultimos.map((item) => `
                <tr>
                    <td title="${item.titulo || "-"}">${item.titulo || "-"}</td>
                    <td>${item.data || "-"}</td>
                    <td>${item.horario || "-"}</td>
                </tr>
            `).join("");

        }

        marcarAtualizado(statusAgendaEl);

    } catch (erro) {

        console.error("Erro ao carregar compromissos:", erro);

        marcarErro(statusAgendaEl, "Não foi possível atualizar os compromissos.");

        if (listaAgenda.children.length === 0) {

            listaAgenda.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Não foi possível carregar os compromissos.
                    </td>
                </tr>
            `;

        }

    } finally {

        carregandoAgenda = false;

    }

}


// ==========================================================
// PRAZOS CONCLUÍDOS  (Firestore - TEMPO REAL / onSnapshot)
// ==========================================================
//
// listarNotificacoes já é feito com onSnapshot, então o
// callback dispara sozinho toda vez que algo muda no
// Firestore — não precisa de setInterval aqui.

let cancelarNotificacoes = null;

function iniciarPrazosTempoReal() {

    try {

        cancelarNotificacoes = listarNotificacoes((notificacoes) => {

            const lista = Array.isArray(notificacoes) ? notificacoes : [];

            const concluidos = lista.filter((item) => {

                const status = String(item.status || "").toLowerCase();

                return status === "concluído" || status === "concluido";

            });

            prazosTotal.textContent = concluidos.length;

            const ultimos = concluidos.slice(0, LIMITE_LINHAS);

            if (ultimos.length === 0) {

                listaPrazos.innerHTML = `
                    <tr>
                        <td colspan="3" class="vazio">
                            Nenhum prazo concluído.
                        </td>
                    </tr>
                `;

            } else {

                listaPrazos.innerHTML = ultimos.map((prazo) => `
                    <tr>
                        <td title="${prazo.titulo || prazo.descricao || "-"}">
                            ${prazo.titulo || prazo.descricao || "-"}
                        </td>
                        <td>${prazo.processo || prazo.numeroProcesso || "-"}</td>
                        <td>${prazo.data || "-"}</td>
                    </tr>
                `).join("");

            }

            marcarAtualizado(statusPrazosEl);

        });

    } catch (erro) {

        console.error("Erro ao observar prazos em tempo real:", erro);

        marcarErro(statusPrazosEl, "Não foi possível observar os prazos.");

    }

}


// ==========================================================
// ATUALIZAÇÃO AUTOMÁTICA (POLLING PARA REST)
// ==========================================================

let idIntervalo = null;

function atualizarDadosRest() {

    carregarClientes();
    carregarProcessos();
    carregarAgenda();

}

function iniciarPolling() {

    pararPolling();

    idIntervalo = setInterval(
        atualizarDadosRest,
        INTERVALO_ATUALIZACAO
    );

}

function pararPolling() {

    if (idIntervalo) clearInterval(idIntervalo);

    idIntervalo = null;

}

// Pausa o polling quando a aba fica em segundo plano
// (o listener de Firestore continua funcionando normalmente).
document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        pararPolling();

        marcarPausado(statusProcessosEl);
        marcarPausado(statusClientesEl);
        marcarPausado(statusAgendaEl);

    } else {

        atualizarDadosRest();
        iniciarPolling();

    }

});

// Encerra o polling e o listener do Firestore ao sair da página
window.addEventListener("beforeunload", () => {

    pararPolling();

    if (typeof cancelarNotificacoes === "function") {

        cancelarNotificacoes();

    }

});


// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

atualizarDadosRest();
iniciarPolling();
iniciarPrazosTempoReal();