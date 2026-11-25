import { getToken } from "../../services/authService.js";
import { listarClientes } from "../../services/clienteService.js";
import { listarProcessos } from "../../services/processoService.js";
import { listarCompromissos } from "../../services/agendaService.js";
import { listarNotificacoes } from "../../services/notificacaoService.js";

// CONFIGURAÇÃO
const INTERVALO_ATUALIZACAO = 8000;
const LIMITE_LINHAS = 5;

// ELEMENTOS
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

// PROTEÇÃO DE ROTA
if (!getToken()) {
    window.location.href = "login-adv.html";
}

// AUXILIARES
function marcarAtualizado(elemento) {
    if (!elemento) return;

    const hora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

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

// AUXILIAR PARA IDENTIFICAR O NÚMERO DO PROCESSO
function obterNumeroProcesso(processo) {
    return (
        processo.numeroProcesso ||
        processo.numero_processo ||
        processo.numeroCNJ ||
        processo.numero_cnj ||
        processo.numero ||
        "-"
    );
}

// ==========================================================
// DOCUMENTOS E TELEFONE DO CLIENTE
// ==========================================================

function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

// Descobre CPF e CNPJ do cliente, mesmo que estejam em campos diferentes
// (cnpj, cpf_cnpj, documento...) ou que o CNPJ tenha sido salvo no campo CPF.
function obterDocumentos(cliente) {

    let cpf = "";
    let cnpj = "";

    const candidatos = [
        [cliente.cnpj, "cnpj"],
        [cliente.CNPJ, "cnpj"],
        [cliente.cpf, "cpf"],
        [cliente.CPF, "cpf"],
        [cliente.cpf_cnpj, ""],
        [cliente.cpfCnpj, ""],
        [cliente.documento, ""]
    ];

    candidatos.forEach(([valor, tipoPadrao]) => {

        const texto = String(valor ?? "").trim();

        if (!texto || texto === "-") return;

        const digitos = somenteDigitos(texto).length;

        const tipo = digitos === 14
            ? "cnpj"
            : digitos === 11
                ? "cpf"
                : tipoPadrao;

        if (tipo === "cnpj" && !cnpj) cnpj = texto;
        if (tipo === "cpf" && !cpf) cpf = texto;
    });

    return {
        cpf: cpf || "-",
        cnpj: cnpj || "-"
    };
}

function obterTelefone(cliente) {
    return (
        cliente.telefone ||
        cliente.celular ||
        cliente.whatsapp ||
        cliente.fone ||
        cliente.contato ||
        "-"
    );
}

// CLIENTES
let carregandoClientes = false;

async function carregarClientes() {
    if (carregandoClientes) return;

    carregandoClientes = true;

    try {
        await listarClientes((clientes) => {
            clientes = Array.isArray(clientes) ? clientes : [];

            clientesTotal.textContent = clientes.length;

            const ultimos = [...clientes]
                .slice(-LIMITE_LINHAS)
                .reverse();

            if (ultimos.length === 0) {
                listaClientes.innerHTML = `
                    <tr>
                        <td colspan="4" class="vazio">
                            Nenhum cliente cadastrado.
                        </td>
                    </tr>
                `;
            } else {
                listaClientes.innerHTML = ultimos.map(cliente => {

                    const { cpf, cnpj } = obterDocumentos(cliente);
                    const telefone = obterTelefone(cliente);

                    return `
                        <tr>
                            <td title="${cliente.nome || "-"}">
                                ${cliente.nome || "-"}
                            </td>
                            <td>${cpf}</td>
                            <td>${cnpj}</td>
                            <td>${telefone}</td>
                        </tr>
                    `;

                }).join("");
            }

            marcarAtualizado(statusClientesEl);
        });

    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
        marcarErro(statusClientesEl, "Não foi possível atualizar os clientes.");

        if (listaClientes.children.length === 0) {
            listaClientes.innerHTML = `
                <tr>
                    <td colspan="4" class="vazio">
                        Não foi possível carregar os clientes.
                    </td>
                </tr>
            `;
        }

    } finally {
        carregandoClientes = false;
    }
}

// PROCESSOS
let carregandoProcessos = false;

async function carregarProcessos() {
    if (carregandoProcessos) return;

    carregandoProcessos = true;

    try {
        const processos = await listarProcessos();
        const lista = Array.isArray(processos) ? processos : [];

        processosTotal.textContent = lista.length;

        const ultimos = [...lista]
            .slice(-LIMITE_LINHAS)
            .reverse();

        if (ultimos.length === 0) {
            listaProcessos.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Nenhum processo cadastrado.
                    </td>
                </tr>
            `;
        } else {
            listaProcessos.innerHTML = ultimos.map(processo => {
                const numero = obterNumeroProcesso(processo);

                return `
                    <tr>
                        <td title="${numero}">${numero}</td>
                        <td title="${processo.cliente || "-"}">
                            ${processo.cliente || "-"}
                        </td>
                        <td>${processo.status || "-"}</td>
                    </tr>
                `;
            }).join("");
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

// COMPROMISSOS
let carregandoAgenda = false;

async function carregarAgenda() {
    if (carregandoAgenda) return;

    carregandoAgenda = true;

    try {
        const compromissos = await listarCompromissos();
        const lista = Array.isArray(compromissos) ? compromissos : [];

        agendaTotal.textContent = lista.length;

        const ultimos = [...lista]
            .slice(-LIMITE_LINHAS)
            .reverse();

        if (ultimos.length === 0) {
            listaAgenda.innerHTML = `
                <tr>
                    <td colspan="3" class="vazio">
                        Nenhum compromisso cadastrado.
                    </td>
                </tr>
            `;
        } else {
            listaAgenda.innerHTML = ultimos.map(item => `
                <tr>
                    <td title="${item.titulo || "-"}">
                        ${item.titulo || "-"}
                    </td>
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

// PRAZOS CONCLUÍDOS - TEMPO REAL
let cancelarNotificacoes = null;

function iniciarPrazosTempoReal() {
    try {
        cancelarNotificacoes = listarNotificacoes((notificacoes) => {
            const lista = Array.isArray(notificacoes)
                ? notificacoes
                : [];

            const concluidos = lista.filter(item => {
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
                listaPrazos.innerHTML = ultimos.map(prazo => `
                    <tr>
                        <td title="${prazo.titulo || prazo.descricao || "-"}">
                            ${prazo.titulo || prazo.descricao || "-"}
                        </td>
                        <td>
                            ${prazo.numeroProcesso ||
                            prazo.numero_processo ||
                            prazo.processo || "-"}
                        </td>
                        <td>${prazo.data || "-"}</td>
                    </tr>
                `).join("");
            }

            marcarAtualizado(statusPrazosEl);
        });

    } catch (erro) {
        console.error("Erro ao observar prazos:", erro);
        marcarErro(statusPrazosEl, "Não foi possível observar os prazos.");
    }
}

// ATUALIZAÇÃO AUTOMÁTICA
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
    if (idIntervalo) {
        clearInterval(idIntervalo);
    }

    idIntervalo = null;
}

// VISIBILIDADE DA PÁGINA
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

// ENCERRAMENTO
window.addEventListener("beforeunload", () => {
    pararPolling();

    if (typeof cancelarNotificacoes === "function") {
        cancelarNotificacoes();
    }
});

// INICIALIZAÇÃO
atualizarDadosRest();
iniciarPolling();
iniciarPrazosTempoReal();