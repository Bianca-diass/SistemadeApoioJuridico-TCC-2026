
import {
    listarProcessos,
    excluirProcesso
} from "../../services/processoService.js";

// ==========================================================
// ELEMENTOS
// ==========================================================

const listaProcessos = document.getElementById("listaProcessos");
const totalProcessos = document.getElementById("totalProcessos");
const totalIntimacoes = document.getElementById("totalIntimacoes");
const totalAndamento = document.getElementById("totalAndamento");
const buscarProcesso = document.getElementById("buscarProcesso");

let processos = [];

// ==========================================================
// UTILIDADES
// ==========================================================

// PADRONIZAR NOMES DOS CAMPOS VINDOS DA API

function padronizarProcesso(p) {
    return {
        ...p,
        numeroProcesso: p.numeroProcesso ?? p.numero_processo ?? "",
        ultimaMovimentacao: p.ultimaMovimentacao ?? p.ultima_movimentacao ?? "",
        tipoManifestacao: p.tipoManifestacao ?? p.tipo_manifestacao ?? ""
    };
}

// NORMALIZAR TEXTO

function normalizar(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

// ESCAPAR HTML

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

// VERIFICAR INTIMAÇÃO

function possuiIntimacao(valor) {
    return valor === true ||
        valor === 1 ||
        ["true", "1", "sim", "pendente"].includes(normalizar(valor));
}

// FORMATAR DATA

function formatarData(data) {
    if (!data) return "-";

    const valor = String(data);
    const partes = valor.substring(0, 10).split("-");

    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
}

// VERIFICAR PRAZO

function verificarPrazo(data) {
    if (!data) return "sem-prazo";

    const prazo = new Date(`${String(data).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(prazo.getTime())) return "sem-prazo";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diferenca = Math.ceil((prazo - hoje) / 86400000);

    if (diferenca < 0) return "vencido";
    if (diferenca <= 7) return "proximo";

    return "normal";
}

// ==========================================================
// MODAL DE VISUALIZAÇÃO DO PROCESSO
// MESMO DESIGN DE CLIENTES E DOCUMENTOS
// ==========================================================

function criarModalProcesso() {

    if (document.getElementById("modalVisualizarProcesso")) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.id = "estilosModalVisualizarProcesso";

    estilos.textContent = `

        /* FUNDO */

        #modalVisualizarProcesso {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 9999;

            background: rgba(4, 15, 30, 0.78);

            align-items: center;
            justify-content: center;

            padding: 20px;

            backdrop-filter: blur(4px);
        }

        #modalVisualizarProcesso.aberto {
            display: flex;
        }

        /* CAIXA PRINCIPAL */

        #modalVisualizarProcesso .modal-caixa {
            background: #ffffff;

            width: 100%;
            max-width: 620px;

            max-height: 90vh;

            border-radius: 18px;

            overflow: hidden;

            display: flex;
            flex-direction: column;

            box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);

            animation: aparecerModalProcesso .25s ease;
        }

        @keyframes aparecerModalProcesso {
            from {
                opacity: 0;
                transform: translateY(15px) scale(.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* CABEÇALHO */

        #modalVisualizarProcesso .doc-cabecalho {
            background: linear-gradient(
                135deg,
                #0f1f33,
                #234367
            );

            color: #ffffff;

            padding: 24px 26px;

            border-bottom: 4px solid #d4a95a;

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 15px;

            flex-shrink: 0;
        }

        #modalVisualizarProcesso .doc-titulo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #modalVisualizarProcesso .doc-titulo i {
            color: #d4a95a;
            font-size: 23px;
        }

        #modalVisualizarProcesso .doc-titulo h2 {
            margin: 0;

            font-family: 'Inter', sans-serif;

            font-size: 21px;
            font-weight: 700;

            color: #ffffff;
        }

        /* BOTÃO FECHAR */

        #modalVisualizarProcesso .fechar-modal-processo {
            width: 38px;
            height: 38px;

            border: 1px solid rgba(255,255,255,.25);

            border-radius: 9px;

            background: rgba(255,255,255,.12);

            color: #ffffff;

            display: flex;
            align-items: center;
            justify-content: center;

            cursor: pointer;

            font-size: 18px;

            flex-shrink: 0;

            transition: .2s;
        }

        #modalVisualizarProcesso .fechar-modal-processo:hover {
            background: #d4a95a;
            color: #0f1f33;
            border-color: #d4a95a;
        }

        /* CORPO */

        #modalVisualizarProcesso .doc-corpo {
            padding: 25px 26px 28px;

            background: #f4f6fa;

            overflow-y: auto;

            flex: 1;
            min-height: 0;
        }

        /* GRADE */

        #modalVisualizarProcesso .doc-grade {
            display: grid;

            grid-template-columns: repeat(2, minmax(0, 1fr));

            gap: 14px;
        }

        /* CAMPOS */

        #modalVisualizarProcesso .doc-item {
            background: #ffffff;

            border: 1px solid #e0e5ed;

            border-radius: 12px;

            padding: 15px 16px;

            min-width: 0;

            transition: .2s;
        }

        #modalVisualizarProcesso .doc-item:hover {
            border-color: #d4a95a;
        }

        #modalVisualizarProcesso .doc-item.primeiro-campo {
            grid-column: 1 / -1;
        }

        #modalVisualizarProcesso .doc-item small {
            display: block;

            color: #718096;

            font-family: 'Inter', sans-serif;

            font-size: 12px;
            font-weight: 500;

            margin-bottom: 7px;
        }

        #modalVisualizarProcesso .doc-item strong {
            display: block;

            color: #17324f;

            font-family: 'Inter', sans-serif;

            font-size: 14px;
            font-weight: 600;

            overflow-wrap: anywhere;
            line-height: 1.5;
        }

        /* STATUS */

        #modalVisualizarProcesso .status-modal-processo {
            display: inline-flex;
            align-items: center;

            padding: 5px 12px;

            border-radius: 20px;

            background: #e0edff;
            color: #1d4ed8;

            font-size: 12px;
            font-weight: 600;
        }

        /* INTIMAÇÃO */

        #modalVisualizarProcesso .intimacao-pendente {
            background: #fee2e2;
            color: #b91c1c;
        }

        #modalVisualizarProcesso .intimacao-ok {
            background: #dcfce7;
            color: #15803d;
        }

        /* PRAZOS */

        #modalVisualizarProcesso .prazo-vencido {
            background: #fee2e2;
            color: #b91c1c;
        }

        #modalVisualizarProcesso .prazo-proximo {
            background: #fef3c7;
            color: #92400e;
        }

        #modalVisualizarProcesso .prazo-normal {
            background: #dcfce7;
            color: #15803d;
        }

        /* ROLAGEM */

        #modalVisualizarProcesso .doc-corpo::-webkit-scrollbar {
            width: 7px;
        }

        #modalVisualizarProcesso .doc-corpo::-webkit-scrollbar-track {
            background: #edf0f5;
            border-radius: 10px;
        }

        #modalVisualizarProcesso .doc-corpo::-webkit-scrollbar-thumb {
            background: #b8c3d1;
            border-radius: 10px;
        }

        #modalVisualizarProcesso .doc-corpo::-webkit-scrollbar-thumb:hover {
            background: #718096;
        }

        /* RESPONSIVIDADE */

        @media (max-width: 550px) {

            #modalVisualizarProcesso {
                padding: 12px;
            }

            #modalVisualizarProcesso .modal-caixa {
                max-height: 92vh;
            }

            #modalVisualizarProcesso .doc-cabecalho {
                padding: 19px;
            }

            #modalVisualizarProcesso .doc-titulo h2 {
                font-size: 18px;
            }

            #modalVisualizarProcesso .doc-corpo {
                padding: 18px;
            }

            #modalVisualizarProcesso .doc-grade {
                grid-template-columns: 1fr;
            }

            #modalVisualizarProcesso .doc-item.primeiro-campo {
                grid-column: auto;
            }
        }

    `;

    document.head.appendChild(estilos);

    const modal = document.createElement("div");

    modal.id = "modalVisualizarProcesso";

    modal.innerHTML = `

        <div class="modal-caixa">

            <div class="doc-cabecalho">

                <div class="doc-titulo">

                    <i class="fa-solid fa-folder-open"></i>

                    <h2>Dados do Processo</h2>

                </div>

                <button
                    type="button"
                    class="fechar-modal-processo"
                    title="Fechar"
                    aria-label="Fechar janela"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="doc-corpo">

                <div id="dadosVisualizarProcesso"></div>

            </div>

        </div>

    `;

    document.body.appendChild(modal);

    modal.querySelector(".fechar-modal-processo")
        .addEventListener("click", fecharModalProcesso);

    modal.addEventListener("click", evento => {

        if (evento.target === modal) {
            fecharModalProcesso();
        }

    });
}

// ==========================================================
// ABRIR VISUALIZAÇÃO DO PROCESSO
// ==========================================================

function visualizarProcesso(id) {

    const processo = processos.find(item =>
        String(item.id) === String(id)
    );

    if (!processo) {
        alert("Não foi possível encontrar os dados deste processo.");
        return;
    }

    criarModalProcesso();

    const intimacao = possuiIntimacao(processo.intimacao);
    const prazoEstado = verificarPrazo(processo.prazo);

    const statusPrazo = prazoEstado === "vencido"
        ? "Vencido"
        : prazoEstado === "proximo"
            ? "Próximo do vencimento"
            : prazoEstado === "normal"
                ? "Dentro do prazo"
                : "Sem prazo informado";

    const dados = [

        ["Nº do Processo", processo.numeroProcesso || "-", true],
        ["Cliente", processo.cliente || "-"],
        ["Vara", processo.vara || "-"],
        ["Tribunal", processo.tribunal || processo.comarca || "-"],
        ["Status", processo.status || "-"],
        ["Tipo de Manifestação", processo.tipoManifestacao || "Nenhuma"],
        ["Última Movimentação", processo.ultimaMovimentacao || "-"],
        ["Intimação", intimacao ? "Nova intimação" : "Sem pendências"],
        ["Prazo", formatarData(processo.prazo)],
        ["Situação do Prazo", statusPrazo]

    ];

    const container = document.getElementById("dadosVisualizarProcesso");

    container.innerHTML = `

        <div class="doc-grade">

            ${dados.map(([titulo, valor, destaque], indice) => {

                let classeValor = "";

                if (titulo === "Status") {
                    classeValor = "status-modal-processo";
                }

                if (titulo === "Intimação") {
                    classeValor = intimacao
                        ? "status-modal-processo intimacao-pendente"
                        : "status-modal-processo intimacao-ok";
                }

                if (titulo === "Situação do Prazo") {
                    classeValor = "status-modal-processo";

                    if (prazoEstado === "vencido") {
                        classeValor += " prazo-vencido";
                    } else if (prazoEstado === "proximo") {
                        classeValor += " prazo-proximo";
                    } else if (prazoEstado === "normal") {
                        classeValor += " prazo-normal";
                    }
                }

                return `

                    <div class="doc-item ${destaque ? "primeiro-campo" : ""}">

                        <small>${escaparHTML(titulo)}</small>

                        <strong>
                            ${classeValor
                                ? `<span class="${classeValor}">${escaparHTML(valor)}</span>`
                                : escaparHTML(valor)}
                        </strong>

                    </div>

                `;

            }).join("")}

        </div>

    `;

    document.getElementById("modalVisualizarProcesso")
        .classList.add("aberto");
}

// ==========================================================
// FECHAR MODAL
// ==========================================================

function fecharModalProcesso() {

    const modal = document.getElementById("modalVisualizarProcesso");

    if (modal) {
        modal.classList.remove("aberto");
    }
}

document.addEventListener("keydown", evento => {

    if (evento.key === "Escape") {
        fecharModalProcesso();
    }

});

// ==========================================================
// ATUALIZAR CARDS
// ==========================================================

function atualizarCards() {

    if (totalProcessos) {
        totalProcessos.textContent = processos.length;
    }

    if (totalIntimacoes) {
        totalIntimacoes.textContent =
            processos.filter(processo =>
                possuiIntimacao(processo.intimacao)
            ).length;
    }

    if (totalAndamento) {
        totalAndamento.textContent =
            processos.filter(processo =>
                normalizar(processo.status) === "em andamento"
            ).length;
    }
}

// ==========================================================
// CARREGAR PROCESSOS
// ==========================================================

async function carregarProcessos() {

    if (listaProcessos) {
        listaProcessos.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:30px">
                    Carregando processos...
                </td>
            </tr>
        `;
    }

    try {

        const dados = await listarProcessos();

        processos = Array.isArray(dados)
            ? dados.map(padronizarProcesso)
            : [];

        atualizarCards();
        aplicarFiltros();

    } catch (erro) {

        console.error("Erro ao carregar processos:", erro);

        if (listaProcessos) {
            listaProcessos.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center;padding:30px">
                        Não foi possível carregar os processos. Verifique a conexão com a API.
                    </td>
                </tr>
            `;
        }
    }
}

// ==========================================================
// FILTRAR PROCESSOS
// ==========================================================

function aplicarFiltros() {

    const termo = normalizar(buscarProcesso?.value);

    const filtrados = processos.filter(processo => {

        const campos = [
            processo.numeroProcesso,
            processo.cliente,
            processo.comarca,
            processo.tribunal,
            processo.status,
            processo.tipoManifestacao
        ];

        return campos.some(campo =>
            normalizar(campo).includes(termo)
        );
    });

    renderizarProcessos(filtrados);
}

// ==========================================================
// RENDERIZAR TABELA
// ==========================================================

function renderizarProcessos(lista) {

    if (!listaProcessos) return;

    listaProcessos.innerHTML = "";

    if (!lista.length) {

        listaProcessos.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:30px">
                    Nenhum processo encontrado.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach(processo => {

        const linha = document.createElement("tr");

        const id = escaparHTML(processo.id);
        const numero = escaparHTML(processo.numeroProcesso || "-");
        const cliente = escaparHTML(processo.cliente || "-");
        const tribunal = escaparHTML(processo.tribunal || processo.comarca || "-");
        const status = escaparHTML(processo.status || "Sem status");
        const manifestacao = escaparHTML(processo.tipoManifestacao || "Nenhuma");
        const movimentacao = escaparHTML(processo.ultimaMovimentacao || "-");

        const intimacao = possuiIntimacao(processo.intimacao);
        const prazoEstado = verificarPrazo(processo.prazo);
        const prazo = formatarData(processo.prazo);

        let textoPrazo = prazo;

        if (prazoEstado === "vencido") {
            textoPrazo += " (Vencido)";
        } else if (prazoEstado === "proximo") {
            textoPrazo += " (Próximo)";
        }

        linha.innerHTML = `

            <td>${numero}</td>

            <td>${cliente}</td>

            <td>${tribunal}</td>

            <td>
                <span class="status">${status}</span>
            </td>

            <td>${manifestacao}</td>

            <td>${movimentacao}</td>

            <td>
                <span class="${intimacao ? "badge-alerta" : "badge-ok"}">
                    ${intimacao ? "Nova intimação" : "Sem pendências"}
                </span>
            </td>

            <td class="prazo-${prazoEstado}">
                ${escaparHTML(textoPrazo)}
            </td>

            <td>

                <button
                    class="btn-visualizar"
                    title="Visualizar"
                    data-id="${id}"
                    type="button"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>

                <button
                    class="btn-editar"
                    title="Editar"
                    data-id="${id}"
                    type="button"
                >
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button
                    class="btn-excluir"
                    title="Excluir"
                    data-id="${id}"
                    type="button"
                >
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        `;

        listaProcessos.appendChild(linha);

    });
}

// ==========================================================
// EVENTOS DA TABELA
// ==========================================================

listaProcessos?.addEventListener("click", async evento => {

    const botao = evento.target.closest("button[data-id]");

    if (!botao) return;

    const id = botao.dataset.id;

    if (!id) return;

    // VISUALIZAR

    if (botao.classList.contains("btn-visualizar")) {

        visualizarProcesso(id);

        return;
    }

    // EDITAR

    if (botao.classList.contains("btn-editar")) {

        window.location.href =
            `cadastro-processo-adv.html?id=${encodeURIComponent(id)}`;

        return;
    }

    // EXCLUIR

    if (botao.classList.contains("btn-excluir")) {

        if (!confirm("Deseja realmente excluir este processo?")) {
            return;
        }

        botao.disabled = true;

        try {

            await excluirProcesso(id);

            processos = processos.filter(processo =>
                String(processo.id) !== String(id)
            );

            atualizarCards();
            aplicarFiltros();

        } catch (erro) {

            console.error("Erro ao excluir processo:", erro);

            alert("Não foi possível excluir o processo.");

            botao.disabled = false;
        }
    }

});

// ==========================================================
// PESQUISA
// ==========================================================

buscarProcesso?.addEventListener("input", aplicarFiltros);

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

criarModalProcesso();

carregarProcessos();
