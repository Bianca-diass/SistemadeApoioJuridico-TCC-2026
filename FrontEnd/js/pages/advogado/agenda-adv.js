import { getToken } from "../../services/authService.js";

// ======================================================
// CONFIGURAÇÃO (ajuste se o seu backend for diferente)
// ======================================================

const API = "http://localhost:3000/agenda";
const PAGINA_EDICAO = "cadastro-agenda-adv.html";

// ======================================================
// ELEMENTOS
// ======================================================

const listaProximos = document.getElementById("listaProximos");
const cardsNumeros = document.querySelectorAll(".cardAgenda h3");

let compromissos = [];

// ======================================================
// UTILIDADES
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[c]);
}

function slug(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function authHeaders() {
    const token = getToken();

    if (!token) {
        throw new Error("Usuário não está autenticado. Faça login novamente.");
    }

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

// PADRONIZAR NOMES DOS CAMPOS (aceita snake_case e camelCase)
function padronizar(c) {
    return {
        ...c,
        id: c.id ?? c.id_compromisso,
        titulo: c.titulo ?? c.title ?? "",
        descricao: c.descricao ?? c.description ?? "",
        tipo: c.tipo ?? "",
        cliente: c.cliente ?? c.nome_cliente ?? "",
        processo: c.processo ?? c.numero_processo ?? c.numeroProcesso ?? "",
        local: c.local ?? c.localizacao ?? "",
        data: c.data ?? c.data_compromisso ?? c.dataCompromisso ?? "",
        hora: String(c.hora ?? c.horario ?? "").substring(0, 5),
        status: c.status ?? "Agendado"
    };
}

function dataHoje() {
    const h = new Date();
    const mes = String(h.getMonth() + 1).padStart(2, "0");
    const dia = String(h.getDate()).padStart(2, "0");
    return `${h.getFullYear()}-${mes}-${dia}`;
}

// ======================================================
// API
// ======================================================

async function listarCompromissos() {
    const resposta = await fetch(API, {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store"
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao listar compromissos");
    }

    console.log("COMPROMISSOS RECEBIDOS DO BACKEND:", dados);

    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados?.compromissos)) return dados.compromissos;
    if (Array.isArray(dados?.agenda)) return dados.agenda;

    return [];
}

async function excluirCompromisso(id) {
    const resposta = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: authHeaders()
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao excluir compromisso");
    }

    return dados;
}

// ======================================================
// CARDS DE NÚMEROS
// ======================================================

function atualizarCards() {
    const hoje = dataHoje();

    const total = compromissos.length;

    const deHoje = compromissos.filter(
        c => String(c.data).substring(0, 10) === hoje
    ).length;

    const prazos = compromissos.filter(
        c => slug(c.tipo).includes("prazo")
    ).length;

    if (cardsNumeros[0]) cardsNumeros[0].textContent = total;
    if (cardsNumeros[1]) cardsNumeros[1].textContent = deHoje;
    if (cardsNumeros[2]) cardsNumeros[2].textContent = prazos;
}

// ======================================================
// CARD DO COMPROMISSO
// ======================================================

function montarCard(c) {
    const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

    const [ano, mes, dia] = String(c.data ?? "").substring(0, 10).split("-");
    const mesNome = MESES[Number(mes) - 1] ?? "";
    const dataBR = ano && mes && dia ? `${dia}/${mes}/${ano}` : "-";

    return `
        <article class="compromisso status-${escaparHTML(slug(c.status))}">

            <div class="compromisso-data">
                <span class="dia">${escaparHTML(dia ?? "--")}</span>
                <span class="mes">${escaparHTML(mesNome)}</span>
                <span class="hora">
                    <i class="fa-regular fa-clock"></i>
                    ${escaparHTML(c.hora || "--:--")}
                </span>
            </div>

            <div class="compromisso-corpo">

                <div class="compromisso-topo">
                    <h3 class="compromisso-titulo">${escaparHTML(c.titulo || "Sem título")}</h3>
                    <span class="badge badge-tipo">${escaparHTML(c.tipo || "-")}</span>
                    <span class="badge badge-status">${escaparHTML(c.status || "-")}</span>
                </div>

                <p class="compromisso-descricao">${escaparHTML(c.descricao)}</p>

                <div class="compromisso-detalhes">

                    <div class="detalhe">
                        <i class="fa-solid fa-user"></i>
                        <div>
                            <small>Cliente</small>
                            <span>${escaparHTML(c.cliente || "-")}</span>
                        </div>
                    </div>

                    <div class="detalhe">
                        <i class="fa-solid fa-scale-balanced"></i>
                        <div>
                            <small>Processo</small>
                            <span>${escaparHTML(c.processo || "-")}</span>
                        </div>
                    </div>

                    <div class="detalhe">
                        <i class="fa-solid fa-location-dot"></i>
                        <div>
                            <small>Local</small>
                            <span>${escaparHTML(c.local || "-")}</span>
                        </div>
                    </div>

                    <div class="detalhe">
                        <i class="fa-solid fa-calendar-day"></i>
                        <div>
                            <small>Data</small>
                            <span>${escaparHTML(dataBR)}</span>
                        </div>
                    </div>

                </div>
            </div>

            <div class="compromisso-acoes">
                <button type="button" class="btn-editar" data-id="${escaparHTML(c.id)}">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button type="button" class="btn-excluir" data-id="${escaparHTML(c.id)}">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
            </div>

        </article>
    `;
}

// ======================================================
// RENDERIZAR LISTA
// ======================================================

function renderizar() {
    if (!listaProximos) return;

    if (!compromissos.length) {
        listaProximos.innerHTML = `
            <div class="semCompromissos">
                <i class="fa-regular fa-calendar-xmark"></i>
                <p>Nenhum compromisso cadastrado.</p>
            </div>
        `;
        return;
    }

    const ordenados = [...compromissos].sort((a, b) => {
        const da = `${String(a.data).substring(0, 10)} ${a.hora}`;
        const db = `${String(b.data).substring(0, 10)} ${b.hora}`;
        return da.localeCompare(db);
    });

    listaProximos.innerHTML = ordenados.map(montarCard).join("");
}

// ======================================================
// CARREGAR
// ======================================================

async function carregar() {
    if (listaProximos) {
        listaProximos.innerHTML = `
            <div class="semCompromissos">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Carregando compromissos...</p>
            </div>
        `;
    }

    try {
        const dados = await listarCompromissos();
        compromissos = dados.map(padronizar);
        atualizarCards();
        renderizar();
    } catch (erro) {
        console.error("Erro ao carregar compromissos:", erro);

        if (listaProximos) {
            listaProximos.innerHTML = `
                <div class="semCompromissos">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>${escaparHTML(erro.message || "Não foi possível carregar os compromissos.")}</p>
                </div>
            `;
        }
    }
}

// ======================================================
// EVENTOS (EDITAR / EXCLUIR)
// ======================================================

listaProximos?.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-id]");
    if (!botao) return;

    const id = botao.dataset.id;
    if (!id) return;

    if (botao.classList.contains("btn-editar")) {
        window.location.href = `${PAGINA_EDICAO}?id=${encodeURIComponent(id)}`;
        return;
    }

    if (botao.classList.contains("btn-excluir")) {
        if (!confirm("Deseja realmente excluir este compromisso?")) return;

        botao.disabled = true;

        try {
            await excluirCompromisso(id);

            compromissos = compromissos.filter(c => String(c.id) !== String(id));

            atualizarCards();
            renderizar();
        } catch (erro) {
            console.error("Erro ao excluir compromisso:", erro);
            alert(erro.message || "Não foi possível excluir o compromisso.");
            botao.disabled = false;
        }
    }
});

// ======================================================
// INICIAR
// ======================================================

carregar();