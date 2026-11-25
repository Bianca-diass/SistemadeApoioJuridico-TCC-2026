import { getToken } from "../../services/authService.js";
import { editarCompromisso } from "../../services/agendaService.js";
import { listarClientes } from "../../services/clienteService.js";

// ======================================================
// CONFIGURAÇÃO (ajuste se o seu backend for diferente)
// ======================================================

const API = "https://sistema-apoio-juridico.onrender.com/agenda";

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
        .replace(/[̀-ͯ]/g, "")
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
        clienteId: c.clienteId ?? c.cliente_id ?? null,
        processo: c.processo ?? c.numero_processo ?? c.numeroProcesso ?? "",
        local: c.local ?? c.localizacao ?? "",
        data: c.data ?? c.data_compromisso ?? c.dataCompromisso ?? "",
        hora: String(c.hora ?? c.horario ?? "").substring(0, 5),
        dataPrazo: String(c.data_prazo ?? c.dataPrazo ?? "").substring(0, 10),
        horaPrazo: String(c.hora_prazo ?? c.horaPrazo ?? "").substring(0, 5),
        status: c.status ?? "Agendado"
    };
}

function dataHoje() {
    const h = new Date();
    const mes = String(h.getMonth() + 1).padStart(2, "0");
    const dia = String(h.getDate()).padStart(2, "0");
    return `${h.getFullYear()}-${mes}-${dia}`;
}

function formatarDataBR(valor) {
    const [ano, mes, dia] = String(valor ?? "").substring(0, 10).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function horaValida(valor) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
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
                <button type="button" class="btn-visualizar btn-editar" data-id="${escaparHTML(c.id)}" title="Visualizar compromisso" aria-label="Visualizar compromisso">
                    <i class="fa-solid fa-eye"></i> Visualizar
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
// MODAL: VISUALIZAR E EDITAR COMPROMISSO
// ======================================================

const TIPOS_PADRAO = ["Audiência", "Reunião", "Prazo", "Perícia", "Atendimento"];
const STATUS_PADRAO = ["Agendado", "Pendente", "Concluído", "Cancelado"];

let overlayEl = null;
let compromissoAtual = null;
let modoEdicao = false;
let clientesModal = [];

function criarEstilosModal() {

    if (document.getElementById("estilosModalAgenda")) return;

    const estilos = document.createElement("style");
    estilos.id = "estilosModalAgenda";

    estilos.textContent = `

        .ag-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(4, 10, 20, 0.72);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }

        .ag-modal-overlay.aberto {
            display: flex;
            animation: agFade .2s ease-out;
        }

        @keyframes agFade {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        @keyframes agSobe {
            from { opacity: 0; transform: translateY(18px) scale(.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ag-modal {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 760px;
            max-height: 90vh;
            font-family: 'Inter', sans-serif;
            color: #ffffff;
            background: linear-gradient(160deg, #162d49 0%, #0d1f35 100%);
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 22px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
            overflow: hidden;
            animation: agSobe .28s cubic-bezier(.2, .8, .2, 1);
        }

        .ag-modal::before {
            content: "";
            position: absolute;
            top: 0;
            left: 50%;
            width: 120px;
            height: 3px;
            transform: translateX(-50%);
            background: linear-gradient(90deg, transparent, #e8c37a, transparent);
        }

        /* ---------- TOPO ---------- */

        .ag-modal-topo {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 26px 28px 18px;
        }

        .ag-topo-icone {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            font-size: 20px;
            color: #0d1f35;
            background: linear-gradient(135deg, #f0cf8c, #d4a95a);
            border-radius: 14px;
            box-shadow: 0 8px 22px rgba(212, 169, 90, 0.35);
        }

        .ag-topo-texto {
            flex: 1 1 auto;
            min-width: 0;
        }

        .ag-eyebrow {
            display: block;
            margin-bottom: 4px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1.6px;
            text-transform: uppercase;
            color: #d4a95a;
        }

        .ag-modal-topo h2 {
            margin: 0;
            font-family: 'Playfair Display', serif;
            font-size: 26px;
            font-weight: 700;
            line-height: 1.25;
            color: #ffffff;
            word-break: break-word;
        }

        .ag-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }

        .ag-badges:empty {
            display: none;
        }

        .ag-badge {
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .8px;
            text-transform: uppercase;
            border-radius: 999px;
            border: 1px solid transparent;
        }

        .ag-badge.tipo   { color: #e8c37a; background: rgba(212, 169, 90, .12); border-color: rgba(212, 169, 90, .4); }
        .ag-badge.ok     { color: #4ade80; background: rgba(74, 222, 128, .12); border-color: rgba(74, 222, 128, .4); }
        .ag-badge.warn   { color: #fbbf24; background: rgba(251, 191, 36, .12); border-color: rgba(251, 191, 36, .4); }
        .ag-badge.cancel { color: #f87171; background: rgba(248, 113, 113, .12); border-color: rgba(248, 113, 113, .4); }
        .ag-badge.info   { color: #7cb7ff; background: rgba(124, 183, 255, .12); border-color: rgba(124, 183, 255, .4); }

        .ag-modal-fechar {
            flex: 0 0 auto;
            width: 36px;
            height: 36px;
            font-size: 20px;
            line-height: 1;
            color: #b9c7da;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 50%;
            cursor: pointer;
            transition: background .2s, color .2s, transform .2s;
        }

        .ag-modal-fechar:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.14);
            transform: rotate(90deg);
        }

        /* ---------- CORPO ---------- */

        .ag-modal-corpo {
            padding: 6px 28px 24px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, .2) transparent;
        }

        .ag-hero {
            display: flex;
            align-items: stretch;
            gap: 18px;
            padding: 18px;
            margin-bottom: 16px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
        }

        .ag-data-bloco {
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            min-width: 96px;
            padding: 14px 12px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
        }

        .ag-dia {
            font-family: 'Playfair Display', serif;
            font-size: 38px;
            font-weight: 700;
            line-height: 1;
            color: #e8c37a;
        }

        .ag-mes {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #ffffff;
        }

        .ag-hora {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            padding: 4px 10px;
            font-size: 13px;
            font-weight: 600;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 999px;
        }

        .ag-hero-info {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 14px;
            min-width: 0;
        }

        .ag-info {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 0;
        }

        .ag-info i {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            font-size: 14px;
            color: #d4a95a;
            background: rgba(212, 169, 90, 0.12);
            border-radius: 11px;
        }

        .ag-info small {
            display: block;
            margin-bottom: 2px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #8ea2bb;
        }

        .ag-info span {
            display: block;
            font-size: 15px;
            font-weight: 600;
            line-height: 1.4;
            color: #ffffff;
            word-break: break-word;
        }

        .ag-info span.vazio {
            font-weight: 400;
            color: #6d819b;
        }

        .ag-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }

        .ag-cards .ag-info {
            padding: 14px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            transition: border-color .2s, transform .2s;
        }

        .ag-cards .ag-info:hover {
            border-color: rgba(212, 169, 90, 0.45);
            transform: translateY(-1px);
        }

        .ag-cards .ag-info.inteiro {
            grid-column: 1 / -1;
        }

        .ag-descricao {
            padding: 16px 18px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-left: 3px solid #d4a95a;
            border-radius: 14px;
        }

        .ag-descricao small {
            display: block;
            margin-bottom: 6px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #8ea2bb;
        }

        .ag-descricao p {
            margin: 0;
            font-size: 14.5px;
            line-height: 1.65;
            color: #dbe5f1;
            white-space: pre-wrap;
            word-break: break-word;
        }

        /* ---------- EDIÇÃO ---------- */

        .ag-grade {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding-top: 6px;
        }

        .ag-campo {
            display: flex;
            flex-direction: column;
            gap: 7px;
        }

        .ag-campo.inteiro {
            grid-column: 1 / -1;
        }

        .ag-campo label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #8ea2bb;
        }

        .ag-campo input,
        .ag-campo select,
        .ag-campo textarea {
            width: 100%;
            padding: 12px 14px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            box-sizing: border-box;
            color-scheme: dark;
            transition: border-color .2s, background .2s, box-shadow .2s;
        }

        .ag-campo select option {
            color: #ffffff;
            background: #0d1f35;
        }

        .ag-campo textarea {
            min-height: 96px;
            resize: vertical;
        }

        .ag-campo input:focus,
        .ag-campo select:focus,
        .ag-campo textarea:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.09);
            border-color: #d4a95a;
            box-shadow: 0 0 0 3px rgba(212, 169, 90, 0.18);
        }

        /* ---------- MENSAGENS ---------- */

        .ag-mensagem {
            display: none;
            margin-top: 16px;
            padding: 12px 16px;
            font-size: 13.5px;
            font-weight: 500;
            border-radius: 12px;
        }

        .ag-mensagem.erro {
            display: block;
            color: #fecaca;
            background: rgba(248, 113, 113, 0.14);
            border: 1px solid rgba(248, 113, 113, 0.4);
        }

        .ag-mensagem.ok {
            display: block;
            color: #bbf7d0;
            background: rgba(74, 222, 128, 0.14);
            border: 1px solid rgba(74, 222, 128, 0.4);
        }

        /* ---------- RODAPÉ ---------- */

        .ag-modal-rodape {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 16px 28px 22px;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .ag-botao {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 22px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #dbe5f1;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 12px;
            cursor: pointer;
            transition: background .2s, transform .15s, box-shadow .2s;
        }

        .ag-botao:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .ag-botao.principal {
            color: #0d1f35;
            background: linear-gradient(135deg, #f0cf8c, #d4a95a);
            border-color: transparent;
            box-shadow: 0 8px 22px rgba(212, 169, 90, 0.3);
        }

        .ag-botao.principal:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 28px rgba(212, 169, 90, 0.42);
        }

        .ag-botao:disabled {
            opacity: .6;
            cursor: not-allowed;
            transform: none;
        }

        @media (max-width: 640px) {

            .ag-modal-topo,
            .ag-modal-corpo,
            .ag-modal-rodape {
                padding-left: 18px;
                padding-right: 18px;
            }

            .ag-modal-topo h2 {
                font-size: 22px;
            }

            .ag-hero {
                flex-direction: column;
            }

            .ag-data-bloco {
                flex-direction: row;
                gap: 12px;
                justify-content: flex-start;
            }

            .ag-hora {
                margin-top: 0;
            }

            .ag-cards,
            .ag-grade {
                grid-template-columns: 1fr;
            }
        }

        @media (prefers-reduced-motion: reduce) {

            .ag-modal,
            .ag-modal-overlay.aberto {
                animation: none;
            }
        }
    `;

    document.head.appendChild(estilos);
}

function criarModal() {

    if (overlayEl) return;

    criarEstilosModal();

    overlayEl = document.createElement("div");
    overlayEl.className = "ag-modal-overlay";

    overlayEl.innerHTML = `
        <div class="ag-modal" role="dialog" aria-modal="true" aria-labelledby="agModalTitulo">

            <div class="ag-modal-topo">

                <div class="ag-topo-icone" id="agTopoIcone">
                    <i class="fa-solid fa-calendar-check"></i>
                </div>

                <div class="ag-topo-texto">
                    <span class="ag-eyebrow" id="agEyebrow">Compromisso</span>
                    <h2 id="agModalTitulo">Detalhes do Compromisso</h2>
                    <div class="ag-badges" id="agBadges"></div>
                </div>

                <button type="button" class="ag-modal-fechar" data-acao="fechar" aria-label="Fechar">&times;</button>

            </div>

            <div class="ag-modal-corpo" id="agModalCorpo"></div>

            <div class="ag-modal-rodape" id="agModalRodape"></div>

        </div>
    `;

    document.body.appendChild(overlayEl);

    overlayEl.addEventListener("mousedown", evento => {
        if (evento.target === overlayEl) fecharModal();
    });

    overlayEl.addEventListener("click", evento => {

        const botao = evento.target.closest("[data-acao]");

        if (!botao) return;

        const acao = botao.dataset.acao;

        if (acao === "fechar") fecharModal();
        if (acao === "editar") { modoEdicao = true; renderizarModal(); }
        if (acao === "cancelar") { modoEdicao = false; renderizarModal(); }
        if (acao === "salvar") salvarEdicao(botao);
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && overlayEl.classList.contains("aberto")) {
            fecharModal();
        }
    });
}

function fecharModal() {

    if (!overlayEl) return;

    overlayEl.classList.remove("aberto");
    document.body.style.overflow = "";

    compromissoAtual = null;
    modoEdicao = false;
}

// Aplica máscara HH:mm enquanto digita.
function aplicarMascaraHora(input) {

    input.addEventListener("input", () => {

        const numeros = input.value.replace(/\D/g, "").slice(0, 4);

        input.value = numeros.length > 2
            ? `${numeros.slice(0, 2)}:${numeros.slice(2)}`
            : numeros;
    });
}

function listaUnica(padrao, campo, atual) {

    const todos = [
        ...padrao,
        ...compromissos.map(c => c[campo]),
        atual
    ];

    const vistos = new Set();

    return todos.filter(valor => {

        const chave = slug(valor);

        if (!chave || vistos.has(chave)) return false;

        vistos.add(chave);

        return true;
    });
}

function renderizarModal() {

    const c = compromissoAtual;

    if (!c) return;

    const corpo = overlayEl.querySelector("#agModalCorpo");
    const rodape = overlayEl.querySelector("#agModalRodape");
    const titulo = overlayEl.querySelector("#agModalTitulo");

    const eyebrow = overlayEl.querySelector("#agEyebrow");
    const badges = overlayEl.querySelector("#agBadges");
    const icone = overlayEl.querySelector("#agTopoIcone i");

    if (!modoEdicao) {

        const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

        const [ano, mes, dia] = String(c.data ?? "").substring(0, 10).split("-");

        const mesNome = MESES[Number(mes) - 1] ?? "";

        let diaSemana = "";

        if (ano && mes && dia) {

            const nome = new Date(Number(ano), Number(mes) - 1, Number(dia))
                .toLocaleDateString("pt-BR", { weekday: "long" });

            diaSemana = nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        const dataBR = formatarDataBR(c.data);

        const prazo = c.dataPrazo
            ? `${formatarDataBR(c.dataPrazo)}${c.horaPrazo ? " às " + c.horaPrazo : ""}`
            : "";

        const classeStatus = ({
            concluido: "ok",
            cancelado: "cancel",
            pendente: "warn"
        })[slug(c.status)] || "info";

        titulo.textContent = c.titulo || "Sem título";
        eyebrow.textContent = "Detalhes do compromisso";
        icone.className = "fa-solid fa-calendar-check";

        badges.innerHTML = `
            ${c.tipo ? `<span class="ag-badge tipo">${escaparHTML(c.tipo)}</span>` : ""}
            ${c.status ? `<span class="ag-badge ${classeStatus}">${escaparHTML(c.status)}</span>` : ""}
        `;

        const item = (icon, rotulo, valor, inteiro = false) => `
            <div class="ag-info ${inteiro ? "inteiro" : ""}">
                <i class="${icon}"></i>
                <div>
                    <small>${rotulo}</small>
                    ${valor
                        ? `<span>${escaparHTML(valor)}</span>`
                        : `<span class="vazio">Não informado</span>`
                    }
                </div>
            </div>
        `;

        corpo.innerHTML = `

            <div class="ag-hero">

                <div class="ag-data-bloco">
                    <span class="ag-dia">${escaparHTML(dia ?? "--")}</span>
                    <span class="ag-mes">${escaparHTML(mesNome)}</span>
                    <span class="ag-hora">
                        <i class="fa-regular fa-clock"></i>
                        ${escaparHTML(c.hora || "--:--")}
                    </span>
                </div>

                <div class="ag-hero-info">
                    ${item("fa-solid fa-calendar-day", "Data", dataBR ? `${dataBR}${diaSemana ? " · " + diaSemana : ""}` : "")}
                    ${item("fa-solid fa-hourglass-half", "Prazo limite", prazo)}
                </div>

            </div>

            <div class="ag-cards">
                ${item("fa-solid fa-user", "Cliente", c.cliente)}
                ${item("fa-solid fa-scale-balanced", "Processo", c.processo)}
                ${item("fa-solid fa-location-dot", "Local", c.local, true)}
            </div>

            <div class="ag-descricao">
                <small>Descrição</small>
                <p>${c.descricao ? escaparHTML(c.descricao) : "Nenhuma descrição informada."}</p>
            </div>

            <div class="ag-mensagem" id="agMensagem"></div>
        `;

        rodape.innerHTML = `
            <button type="button" class="ag-botao" data-acao="fechar">Fechar</button>
            <button type="button" class="ag-botao principal" data-acao="editar">
                <i class="fa-solid fa-pen"></i> Editar
            </button>
        `;

        return;
    }

    titulo.textContent = "Editar Compromisso";
    eyebrow.textContent = "Edição";
    icone.className = "fa-solid fa-pen-to-square";
    badges.innerHTML = "";

    const tipos = listaUnica(TIPOS_PADRAO, "tipo", c.tipo);
    const statusLista = listaUnica(STATUS_PADRAO, "status", c.status);

    corpo.innerHTML = `
        <div class="ag-grade">

            <div class="ag-campo inteiro">
                <label for="agTitulo">Título</label>
                <input id="agTitulo" type="text" value="${escaparHTML(c.titulo)}">
            </div>

            <div class="ag-campo inteiro">
                <label for="agDescricao">Descrição</label>
                <textarea id="agDescricao">${escaparHTML(c.descricao)}</textarea>
            </div>

            <div class="ag-campo">
                <label for="agTipo">Tipo</label>
                <input id="agTipo" type="text" list="agTipos" value="${escaparHTML(c.tipo)}">
                <datalist id="agTipos">
                    ${tipos.map(t => `<option value="${escaparHTML(t)}"></option>`).join("")}
                </datalist>
            </div>

            <div class="ag-campo">
                <label for="agStatus">Status</label>
                <select id="agStatus">
                    ${statusLista.map(s => `
                        <option value="${escaparHTML(s)}" ${slug(s) === slug(c.status) ? "selected" : ""}>
                            ${escaparHTML(s)}
                        </option>
                    `).join("")}
                </select>
            </div>

            <div class="ag-campo">
                <label for="agData">Data</label>
                <input id="agData" type="date" value="${escaparHTML(String(c.data).substring(0, 10))}">
            </div>

            <div class="ag-campo">
                <label for="agHora">Horário</label>
                <input id="agHora" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" value="${escaparHTML(c.hora)}">
            </div>

            <div class="ag-campo">
                <label for="agDataPrazo">Data limite</label>
                <input id="agDataPrazo" type="date" value="${escaparHTML(c.dataPrazo)}">
            </div>

            <div class="ag-campo">
                <label for="agHoraPrazo">Horário limite</label>
                <input id="agHoraPrazo" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" value="${escaparHTML(c.horaPrazo)}">
            </div>

            <div class="ag-campo">
                <label for="agCliente">Cliente</label>
                <input id="agCliente" type="text" list="agClientes" autocomplete="off" value="${escaparHTML(c.cliente)}">
                <datalist id="agClientes">
                    ${clientesModal.map(cl => `<option value="${escaparHTML(cl.nome)}"></option>`).join("")}
                </datalist>
            </div>

            <div class="ag-campo">
                <label for="agProcesso">Processo</label>
                <input id="agProcesso" type="text" value="${escaparHTML(c.processo)}">
            </div>

            <div class="ag-campo inteiro">
                <label for="agLocal">Local</label>
                <input id="agLocal" type="text" value="${escaparHTML(c.local)}">
            </div>

        </div>

        <div class="ag-mensagem" id="agMensagem"></div>
    `;

    rodape.innerHTML = `
        <button type="button" class="ag-botao" data-acao="cancelar">Cancelar</button>
        <button type="button" class="ag-botao principal" data-acao="salvar">
            <i class="fa-solid fa-floppy-disk"></i> Salvar alterações
        </button>
    `;

    aplicarMascaraHora(corpo.querySelector("#agHora"));
    aplicarMascaraHora(corpo.querySelector("#agHoraPrazo"));

    // Ao escolher outro cliente da lista, sugere o processo dele.
    corpo.querySelector("#agCliente").addEventListener("change", evento => {

        const alvo = slug(evento.target.value);

        const cliente = clientesModal.find(
            cl => slug(cl.nome) === alvo
        );

        const processo = cliente ? numeroProcessoDoCliente(cliente) : "";
        const campoProcesso = corpo.querySelector("#agProcesso");

        if (processo && !campoProcesso.value.trim()) {
            campoProcesso.value = processo;
        }
    });
}

function mostrarMensagem(tipo, texto) {

    const caixa = overlayEl.querySelector("#agMensagem");

    if (!caixa) return;

    caixa.className = `ag-mensagem ${tipo}`;
    caixa.textContent = texto;
}

// Procura o número do processo no registro do cliente.
function numeroProcessoDoCliente(c) {

    if (!c) return "";

    const texto = v => (v === null || v === undefined)
        ? ""
        : String(v).trim();

    const doItem = item => {

        if (item === null || item === undefined) return "";

        if (typeof item !== "object") return texto(item);

        return texto(
            item.numero ??
            item.numero_processo ??
            item.numeroProcesso ??
            item.processo ??
            item.num_processo
        );
    };

    const candidatos = [
        c.numero_processo, c.numeroProcesso, c.num_processo,
        c.processo, c.processos
    ];

    for (const valor of candidatos) {

        if (Array.isArray(valor)) {

            for (const item of valor) {
                const n = doItem(item);
                if (n) return n;
            }

            continue;
        }

        const n = doItem(valor);
        if (n) return n;
    }

    return "";
}

// Carrega a lista de clientes para sugerir nomes ao editar.
async function carregarClientesModal() {

    if (clientesModal.length) return;

    let lista = [];

    const aplicar = resposta => {

        const bruto = Array.isArray(resposta)
            ? resposta
            : (resposta?.clientes ?? resposta?.data ?? []);

        lista = (Array.isArray(bruto) ? bruto : [])
            .filter(Boolean)
            .map(c => ({
                ...c,
                nome: c.nome ?? c.nome_completo ?? c.razao_social ?? c.name ?? ""
            }))
            .filter(c => c.nome);
    };

    try {

        const retorno = await listarClientes(aplicar);

        if (retorno !== undefined) aplicar(retorno);

    } catch (erro) {
        console.warn("Não foi possível carregar clientes para o modal:", erro);
    }

    clientesModal = lista;
}

async function abrirModal(id) {

    const encontrado = compromissos.find(
        c => String(c.id) === String(id)
    );

    if (!encontrado) return;

    criarModal();

    compromissoAtual = encontrado;
    modoEdicao = false;

    renderizarModal();

    overlayEl.classList.add("aberto");
    document.body.style.overflow = "hidden";

    // Carrega os clientes em segundo plano para a edição.
    await carregarClientesModal();
}

async function salvarEdicao(botao) {

    const c = compromissoAtual;

    if (!c) return;

    const v = id => overlayEl.querySelector(`#${id}`).value.trim();

    const titulo = v("agTitulo");
    const data = v("agData");
    const horario = v("agHora");
    const horaPrazo = v("agHoraPrazo");

    if (!titulo) {
        mostrarMensagem("erro", "Informe o título do compromisso.");
        return;
    }

    if (!data) {
        mostrarMensagem("erro", "Informe a data do compromisso.");
        return;
    }

    if (!horaValida(horario)) {
        mostrarMensagem("erro", "Informe o horário no formato HH:mm (ex.: 14:30).");
        return;
    }

    if (horaPrazo && !horaValida(horaPrazo)) {
        mostrarMensagem("erro", "Informe o horário limite no formato HH:mm (ex.: 18:00).");
        return;
    }

    const nomeCliente = v("agCliente");

    const clienteEncontrado = clientesModal.find(
        cl => slug(cl.nome) === slug(nomeCliente)
    );

    // Mantém o vínculo antigo se o nome do cliente não mudou.
    let clienteId = null;

    if (clienteEncontrado) {
        clienteId = clienteEncontrado.id;
    } else if (slug(nomeCliente) === slug(c.cliente)) {
        clienteId = c.clienteId ?? null;
    }

    const status = v("agStatus");

    const payload = {
        titulo,
        descricao: v("agDescricao"),
        tipo: v("agTipo"),
        data,
        horario,
        dataPrazo: v("agDataPrazo") || null,
        horaPrazo: horaPrazo || null,
        cliente: clienteEncontrado ? clienteEncontrado.nome : nomeCliente,
        clienteId,
        processo: v("agProcesso"),
        local: v("agLocal"),
        status,
        concluido: status === "Concluído"
    };

    botao.disabled = true;

    try {

        await editarCompromisso(c.id, payload);

        const atualizado = padronizar({
            ...c,
            ...payload,
            hora: horario,
            data_prazo: payload.dataPrazo,
            hora_prazo: payload.horaPrazo
        });

        compromissos = compromissos.map(item =>
            String(item.id) === String(c.id) ? atualizado : item
        );

        compromissoAtual = atualizado;
        modoEdicao = false;

        atualizarCards();
        renderizar();
        renderizarModal();

        mostrarMensagem("ok", "Compromisso atualizado com sucesso!");

    } catch (erro) {

        console.error("Erro ao atualizar compromisso:", erro);

        mostrarMensagem(
            "erro",
            erro.message || "Não foi possível salvar as alterações."
        );

        botao.disabled = false;
    }
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
// EVENTOS (VISUALIZAR / EDITAR / EXCLUIR)
// ======================================================

listaProximos?.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-id]");
    if (!botao) return;

    const id = botao.dataset.id;
    if (!id) return;

    if (botao.classList.contains("btn-visualizar")) {
        abrirModal(id);
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