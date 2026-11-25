import {
    listarProcessos,
    editarProcesso,
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

let processoAbertoId = null;   // processo aberto no modal
let modoEdicao = false;        // false = visualizando | true = editando
let salvando = false;

// ==========================================================
// OPÇÕES DE INTIMAÇÃO
// ==========================================================

const SEM_PENDENCIAS = "Sem pendências";

const OPCOES_INTIMACAO = [
    SEM_PENDENCIAS,
    "Intimação para audiência",
    "Intimação para manifestação",
    "Citação",
    "Publicação no diário"
];

// ==========================================================
// UTILIDADES
// ==========================================================

// PADRONIZAR NOMES DOS CAMPOS VINDOS DA API
// (_snake guarda se a API usa nomes_com_underline, para salvar no mesmo formato)

function padronizarProcesso(p) {

    const usaSnake =
        ("numero_processo" in p ||
         "ultima_movimentacao" in p ||
         "tipo_manifestacao" in p) &&
        !("numeroProcesso" in p);

    return {
        ...p,
        _snake: usaSnake,
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

// ==========================================================
// INTIMAÇÃO
// ==========================================================

// valores antigos (verdadeiro/falso) que significam "tem intimação"
function intimacaoAntiga(valor) {
    return valor === true ||
        valor === 1 ||
        ["true", "1", "sim", "pendente"].includes(normalizar(valor));
}

// VERIFICAR SE EXISTE INTIMAÇÃO

function possuiIntimacao(valor) {

    if (valor === null || valor === undefined || valor === false || valor === 0) {
        return false;
    }

    const texto = normalizar(valor);

    const semPendencia = [
        "",
        "false",
        "0",
        "nao",
        "não",
        "sem pendências",
        "sem pendencias",
        "nenhuma",
        "null",
        "undefined"
    ];

    return !semPendencia.includes(texto);
}

// TEXTO QUE APARECE NA TELA

function textoIntimacao(valor) {

    if (!possuiIntimacao(valor)) {
        return SEM_PENDENCIAS;
    }

    if (intimacaoAntiga(valor)) {
        return "Nova intimação";
    }

    return String(valor).trim();
}

// VALOR QUE VAI PARA O BANCO

function valorIntimacao(original, escolhida) {

    if (escolhida === SEM_PENDENCIAS) {

        if (typeof original === "boolean") return false;
        if (typeof original === "number") return 0;

        return SEM_PENDENCIAS;
    }

    return escolhida;
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
// MODAL DE VISUALIZAÇÃO / EDIÇÃO DO PROCESSO
// ==========================================================

function criarModalProcesso() {

    if (document.getElementById("modalVisualizarProcesso")) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.id = "estilosModalVisualizarProcesso";

    estilos.textContent = `

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

        #modalVisualizarProcesso .modal-caixa {
            background: #ffffff;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
            animation: aparecerModalProcesso .25s ease;
        }

        @keyframes aparecerModalProcesso {
            from { opacity: 0; transform: translateY(15px) scale(.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        #modalVisualizarProcesso .doc-cabecalho {
            background: linear-gradient(135deg, #0f1f33, #234367);
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

        #modalVisualizarProcesso .doc-corpo {
            padding: 25px 26px 28px;
            background: #f4f6fa;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
        }

        #modalVisualizarProcesso .doc-grade {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

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

        #modalVisualizarProcesso .intimacao-pendente {
            background: #fee2e2;
            color: #b91c1c;
        }

        #modalVisualizarProcesso .intimacao-ok {
            background: #dcfce7;
            color: #15803d;
        }

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

        /* ===== MODO EDIÇÃO ===== */

        #modalVisualizarProcesso .campo-edicao {
            width: 100%;
            height: 40px;
            padding: 0 12px;
            border: 1px solid #d5dbe5;
            border-radius: 9px;
            background: #ffffff;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #17324f;
            outline: none;
            transition: .2s;
        }

        #modalVisualizarProcesso .campo-edicao:focus {
            border-color: #d4a95a;
            box-shadow: 0 0 0 3px rgba(212, 169, 90, .18);
        }

        #modalVisualizarProcesso select.campo-edicao {
            cursor: pointer;
        }

        /* ===== RODAPÉ COM BOTÕES ===== */

        #modalVisualizarProcesso .doc-rodape {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 26px;
            background: #ffffff;
            border-top: 1px solid #e0e5ed;
            flex-shrink: 0;
        }

        #modalVisualizarProcesso .btn-modal {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 11px 22px;
            border-radius: 10px;
            border: 1px solid transparent;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: .2s;
        }

        #modalVisualizarProcesso .btn-modal.primario {
            background: #234367;
            color: #ffffff;
        }

        #modalVisualizarProcesso .btn-modal.primario i {
            color: #d4a95a;
        }

        #modalVisualizarProcesso .btn-modal.primario:hover {
            background: #2d5282;
        }

        #modalVisualizarProcesso .btn-modal.secundario {
            background: #edf1f7;
            color: #17324f;
            border-color: #d5dbe5;
        }

        #modalVisualizarProcesso .btn-modal.secundario:hover {
            background: #dfe5ee;
        }

        #modalVisualizarProcesso .btn-modal:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

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

            #modalVisualizarProcesso .doc-rodape {
                padding: 14px 18px;
            }

            #modalVisualizarProcesso .btn-modal {
                flex: 1;
                justify-content: center;
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

                    <h2 id="tituloModalProcesso">Dados do Processo</h2>

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

            <div class="doc-rodape" id="rodapeModalProcesso"></div>

        </div>

    `;

    document.body.appendChild(modal);

    modal.querySelector(".fechar-modal-processo")
        .addEventListener("click", fecharModalProcesso);

    modal.addEventListener("click", evento => {

        if (evento.target === modal) {
            fecharModalProcesso();
            return;
        }

        const botao = evento.target.closest("[data-acao]");

        if (!botao) return;

        const acao = botao.dataset.acao;

        if (acao === "editar")   entrarModoEdicao();
        if (acao === "cancelar") cancelarEdicao();
        if (acao === "salvar")   salvarEdicao();
    });
}

// ==========================================================
// DESENHAR O CONTEÚDO DO MODAL (visualização ou edição)
// ==========================================================

function desenharModalProcesso() {

    const processo = processos.find(item =>
        String(item.id) === String(processoAbertoId)
    );

    if (!processo) return;

    const container = document.getElementById("dadosVisualizarProcesso");
    const rodape = document.getElementById("rodapeModalProcesso");
    const titulo = document.getElementById("tituloModalProcesso");

    titulo.textContent = modoEdicao ? "Editar Processo" : "Dados do Processo";

    const intimacao = possuiIntimacao(processo.intimacao);
    const textoDaIntimacao = textoIntimacao(processo.intimacao);
    const prazoEstado = verificarPrazo(processo.prazo);

    // ======================================================
    // MODO EDIÇÃO
    // ======================================================

    if (modoEdicao) {

        const tribunalValor = processo.tribunal || processo.comarca || "";

        // lista de opções (se o valor atual for diferente, ele também aparece)
        const opcoesIntimacao = OPCOES_INTIMACAO.includes(textoDaIntimacao)
            ? OPCOES_INTIMACAO
            : [...OPCOES_INTIMACAO, textoDaIntimacao];

        container.innerHTML = `

            <div class="doc-grade">

                <div class="doc-item primeiro-campo">
                    <small>Nº do Processo</small>
                    <input class="campo-edicao" type="text" data-campo="numeroProcesso"
                           value="${escaparHTML(processo.numeroProcesso)}">
                </div>

                <div class="doc-item">
                    <small>Cliente</small>
                    <strong>${escaparHTML(processo.cliente || "-")}</strong>
                </div>

                <div class="doc-item">
                    <small>Vara</small>
                    <input class="campo-edicao" type="text" data-campo="vara"
                           value="${escaparHTML(processo.vara ?? "")}">
                </div>

                <div class="doc-item">
                    <small>Tribunal</small>
                    <input class="campo-edicao" type="text" data-campo="tribunal"
                           value="${escaparHTML(tribunalValor)}">
                </div>

                <div class="doc-item">
                    <small>Status</small>
                    <input class="campo-edicao" type="text" data-campo="status"
                           list="opcoesStatusProcesso"
                           value="${escaparHTML(processo.status ?? "")}">
                    <datalist id="opcoesStatusProcesso">
                        <option value="Em andamento">
                        <option value="Aguardando audiência">
                        <option value="Suspenso">
                        <option value="Arquivado">
                        <option value="Concluído">
                    </datalist>
                </div>

                <div class="doc-item">
                    <small>Tipo de Manifestação</small>
                    <input class="campo-edicao" type="text" data-campo="tipoManifestacao"
                           value="${escaparHTML(processo.tipoManifestacao)}">
                </div>

                <div class="doc-item">
                    <small>Última Movimentação</small>
                    <input class="campo-edicao" type="text" data-campo="ultimaMovimentacao"
                           value="${escaparHTML(processo.ultimaMovimentacao)}">
                </div>

                <div class="doc-item">
                    <small>Intimação</small>
                    <select class="campo-edicao" data-campo="intimacao">
                        ${opcoesIntimacao.map(opcao => `
                            <option value="${escaparHTML(opcao)}"
                                ${opcao === textoDaIntimacao ? "selected" : ""}>
                                ${escaparHTML(opcao)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="doc-item">
                    <small>Prazo</small>
                    <input class="campo-edicao" type="date" data-campo="prazo"
                           value="${escaparHTML(String(processo.prazo ?? "").substring(0, 10))}">
                </div>

            </div>

        `;

        rodape.innerHTML = `
            <button type="button" class="btn-modal secundario" data-acao="cancelar">
                <i class="fa-solid fa-xmark"></i> Cancelar
            </button>
            <button type="button" class="btn-modal primario" data-acao="salvar" id="btnSalvarProcesso">
                <i class="fa-solid fa-floppy-disk"></i> Salvar
            </button>
        `;

        return;
    }

    // ======================================================
    // MODO VISUALIZAÇÃO
    // ======================================================

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
        ["Intimação", textoDaIntimacao],
        ["Prazo", formatarData(processo.prazo)],
        ["Situação do Prazo", statusPrazo]

    ];

    container.innerHTML = `

        <div class="doc-grade">

            ${dados.map(([tituloCampo, valor, destaque]) => {

                let classeValor = "";

                if (tituloCampo === "Status") {
                    classeValor = "status-modal-processo";
                }

                if (tituloCampo === "Intimação") {
                    classeValor = intimacao
                        ? "status-modal-processo intimacao-pendente"
                        : "status-modal-processo intimacao-ok";
                }

                if (tituloCampo === "Situação do Prazo") {
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

                        <small>${escaparHTML(tituloCampo)}</small>

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

    rodape.innerHTML = `
        <button type="button" class="btn-modal primario" data-acao="editar">
            <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
    `;
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

    processoAbertoId = processo.id;
    modoEdicao = false;

    desenharModalProcesso();

    document.getElementById("modalVisualizarProcesso")
        .classList.add("aberto");
}

// ==========================================================
// EDIÇÃO
// ==========================================================

function entrarModoEdicao() {
    modoEdicao = true;
    desenharModalProcesso();
}

function cancelarEdicao() {
    modoEdicao = false;
    desenharModalProcesso();
}

async function salvarEdicao() {

    if (salvando) return;

    const processo = processos.find(item =>
        String(item.id) === String(processoAbertoId)
    );

    if (!processo) return;

    const modal = document.getElementById("modalVisualizarProcesso");

    // lê os campos digitados
    const novos = {};

    modal.querySelectorAll("[data-campo]").forEach(campo => {
        novos[campo.dataset.campo] = campo.value.trim();
    });

    // validação
    if (!novos.numeroProcesso) {
        alert("Informe o número do processo.");
        modal.querySelector('[data-campo="numeroProcesso"]').focus();
        return;
    }

    // monta o objeto que vai para o servidor
    // (usa os mesmos nomes de campo que a API devolveu)

    const snake = processo._snake;

    const chaveTribunal =
        ("tribunal" in processo || !("comarca" in processo))
            ? "tribunal"
            : "comarca";

    const dados = {
        [snake ? "numero_processo" : "numeroProcesso"]: novos.numeroProcesso,
        vara: novos.vara,
        [chaveTribunal]: novos.tribunal,
        status: novos.status,
        [snake ? "tipo_manifestacao" : "tipoManifestacao"]: novos.tipoManifestacao,
        [snake ? "ultima_movimentacao" : "ultimaMovimentacao"]: novos.ultimaMovimentacao,
        intimacao: valorIntimacao(processo.intimacao, novos.intimacao),
        prazo: novos.prazo || null
    };

    // salva
    const botaoSalvar = document.getElementById("btnSalvarProcesso");

    salvando = true;

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    }

    try {

        await editarProcesso(processo.id, dados);

        // atualiza o processo na memória e na tela
        Object.assign(processo, dados);

        processo.numeroProcesso = novos.numeroProcesso;
        processo.tipoManifestacao = novos.tipoManifestacao;
        processo.ultimaMovimentacao = novos.ultimaMovimentacao;

        modoEdicao = false;

        atualizarCards();
        aplicarFiltros();
        desenharModalProcesso();

    } catch (erro) {

        console.error("Erro ao salvar processo:", erro);

        alert(erro.message || "Não foi possível salvar as alterações.");

        if (botaoSalvar) {
            botaoSalvar.disabled = false;
            botaoSalvar.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar`;
        }

    } finally {

        salvando = false;

    }
}

// ==========================================================
// FECHAR MODAL
// ==========================================================

function fecharModalProcesso() {

    const modal = document.getElementById("modalVisualizarProcesso");

    if (modal) {
        modal.classList.remove("aberto");
    }

    modoEdicao = false;
    processoAbertoId = null;
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
            processo.tipoManifestacao,
            textoIntimacao(processo.intimacao)
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
                    ${escaparHTML(textoIntimacao(processo.intimacao))}
                </span>
            </td>

            <td class="prazo-${prazoEstado}">
                ${escaparHTML(textoPrazo)}
            </td>

            <td>

                <button
                    class="btn-visualizar"
                    title="Visualizar e editar"
                    data-id="${id}"
                    type="button"
                >
                    <i class="fa-solid fa-eye"></i>
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

    // VISUALIZAR / EDITAR (dentro do modal)

    if (botao.classList.contains("btn-visualizar")) {

        visualizarProcesso(id);

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