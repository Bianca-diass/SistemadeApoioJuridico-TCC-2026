import { clienteController } from "../../controllers/clienteController.js";
import { editarCliente } from "../../services/clienteService.js";

// ==========================================================
// ELEMENTOS
// ==========================================================

const listaClientes = document.getElementById("listaClientes");

const totalClientesEl = document.getElementById("totalClientes");
const totalCidadesEl = document.getElementById("totalCidades");
const clientesAtivosEl = document.getElementById("clientesAtivos");

const buscarClienteEl = document.getElementById("buscarCliente");
const filtroStatusEl = document.getElementById("filtroStatus");

// ==========================================================
// ESTADO
// ==========================================================

let clientes = [];
let pesquisa = "";

let clienteAbertoId = null;   // cliente que está aberto no modal
let modoEdicao = false;       // false = visualizando | true = editando
let salvando = false;

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

function obterValor(...valores) {
    return valores.find(valor =>
        valor !== undefined &&
        valor !== null &&
        String(valor).trim() !== ""
    ) || "-";
}

// ==========================================================
// IDENTIFICAR STATUS DO CLIENTE
// ==========================================================

const CHAVES_STATUS = ["status", "situacao", "statusCliente", "ativo"];

function obterStatus(cliente) {

    const status = cliente.status ??
                   cliente.situacao ??
                   cliente.statusCliente ??
                   cliente.ativo;

    if (status !== undefined && status !== null && status !== "") {

        const valor = String(status).trim().toLowerCase();

        if (["inativo", "inactive", "false", "0", "não", "nao"].includes(valor)) {
            return "inativo";
        }

        if (["ativo", "active", "true", "1", "sim"].includes(valor)) {
            return "ativo";
        }
    }

    return "ativo";
}

// monta o campo de status respeitando o nome/tipo que o cliente já usa
function montarCampoStatus(cliente, statusEscolhido) {

    const chave = CHAVES_STATUS.find(k => k in cliente) || "status";

    if (chave === "ativo") {
        return { chave, valor: statusEscolhido === "ativo" };
    }

    return { chave, valor: statusEscolhido };
}

// ==========================================================
// ATUALIZAR INDICADORES
// ==========================================================

function normalizarCidade(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s*\/\s*[a-zA-Z]{2}\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function atualizarIndicadores() {

    totalClientesEl.textContent = clientes.length;

    const ativos = clientes.filter(cliente =>
        obterStatus(cliente) === "ativo"
    );

    clientesAtivosEl.textContent = ativos.length;

    const cidades = new Set(
        clientes
            .map(cliente => normalizarCidade(cliente.cidade))
            .filter(cidade => cidade !== "")
    );

    totalCidadesEl.textContent = cidades.size;
}

// ==========================================================
// PESQUISAR E FILTRAR CLIENTES
// ==========================================================

function filtrarClientes() {

    const termo = pesquisa.toLowerCase().trim();
    const statusSelecionado = filtroStatusEl.value;

    return clientes.filter(cliente => {

        const nome = String(cliente.nome || "").toLowerCase();
        const telefone = String(cliente.telefone || "").toLowerCase();
        const email = String(cliente.email || "").toLowerCase();
        const endereco = String(cliente.endereco || "").toLowerCase();
        const cidade = String(cliente.cidade || "").toLowerCase();

        const correspondePesquisa =
            nome.includes(termo) ||
            telefone.includes(termo) ||
            email.includes(termo) ||
            endereco.includes(termo) ||
            cidade.includes(termo);

        const correspondeStatus =
            !statusSelecionado ||
            obterStatus(cliente) === statusSelecionado;

        return correspondePesquisa && correspondeStatus;
    });
}

// ==========================================================
// CAMPOS DO MODAL
// ==========================================================

const CAMPOS = [
    { chave: "nome",     titulo: "Nome completo", tipo: "text",  primeiro: true },
    { chave: "cpf",      titulo: "CPF",           tipo: "text" },
    { chave: "cnpj",     titulo: "CNPJ",          tipo: "text" },
    { chave: "rg",       titulo: "RG",            tipo: "text" },
    { chave: "telefone", titulo: "Telefone",      tipo: "tel" },
    { chave: "email",    titulo: "E-mail",        tipo: "email" },
    { chave: "endereco", titulo: "Endereço",      tipo: "text" },
    { chave: "cidade",   titulo: "Cidade",        tipo: "text" },
    { chave: "estado",   titulo: "Estado/UF",     tipo: "text", maxlength: 2 },
    { chave: "tipoPessoa", titulo: "Tipo de pessoa", tipo: "text" }
];

function chaveTipoPessoa(cliente) {
    return ("tipo_pessoa" in cliente && !("tipoPessoa" in cliente))
        ? "tipo_pessoa"
        : "tipoPessoa";
}

function valorDoCampo(cliente, chave) {
    if (chave === "tipoPessoa") {
        return cliente[chaveTipoPessoa(cliente)];
    }
    return cliente[chave];
}

// ==========================================================
// MODAL DE VISUALIZAÇÃO / EDIÇÃO DO CLIENTE
// ==========================================================

function criarModal() {

    if (document.getElementById("modalVisualizarCliente")) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.id = "estilosModalVisualizarCliente";

    estilos.textContent = `

        #modalVisualizarCliente {
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

        #modalVisualizarCliente.aberto {
            display: flex;
        }

        #modalVisualizarCliente .modal-caixa.modal-visualizar {
            background: #ffffff;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
            animation: aparecerModalCliente .25s ease;
        }

        @keyframes aparecerModalCliente {
            from { opacity: 0; transform: translateY(15px) scale(.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        #modalVisualizarCliente .doc-cabecalho {
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

        #modalVisualizarCliente .doc-titulo {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        #modalVisualizarCliente .doc-titulo i {
            color: #d4a95a;
            font-size: 23px;
        }

        #modalVisualizarCliente .doc-titulo h2 {
            margin: 0;
            font-family: 'Inter', sans-serif;
            font-size: 21px;
            font-weight: 700;
            color: #ffffff;
        }

        #modalVisualizarCliente .fechar-modal-cliente {
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

        #modalVisualizarCliente .fechar-modal-cliente:hover {
            background: #d4a95a;
            color: #0f1f33;
            border-color: #d4a95a;
        }

        #modalVisualizarCliente .doc-corpo {
            padding: 25px 26px 28px;
            background: #f4f6fa;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
        }

        #modalVisualizarCliente .doc-grade {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        #modalVisualizarCliente .doc-item {
            background: #ffffff;
            border: 1px solid #e0e5ed;
            border-radius: 12px;
            padding: 15px 16px;
            min-width: 0;
            transition: .2s;
        }

        #modalVisualizarCliente .doc-item:hover {
            border-color: #d4a95a;
        }

        #modalVisualizarCliente .doc-item.primeiro-campo {
            grid-column: 1 / -1;
        }

        #modalVisualizarCliente .doc-item small {
            display: block;
            color: #718096;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 7px;
        }

        #modalVisualizarCliente .doc-item strong {
            display: block;
            color: #17324f;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            overflow-wrap: anywhere;
            line-height: 1.5;
        }

        #modalVisualizarCliente .status-modal-cliente {
            display: inline-flex;
            align-items: center;
            padding: 5px 12px;
            border-radius: 20px;
            background: #dcfce7;
            color: #15803d;
            font-size: 12px;
            font-weight: 600;
        }

        #modalVisualizarCliente .status-modal-cliente.inativo {
            background: #fee2e2;
            color: #b91c1c;
        }

        /* ===== MODO EDIÇÃO ===== */

        #modalVisualizarCliente .campo-edicao {
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

        #modalVisualizarCliente .campo-edicao:focus {
            border-color: #d4a95a;
            box-shadow: 0 0 0 3px rgba(212, 169, 90, .18);
        }

        #modalVisualizarCliente select.campo-edicao {
            cursor: pointer;
        }

        /* ===== RODAPÉ COM BOTÕES ===== */

        #modalVisualizarCliente .doc-rodape {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 26px;
            background: #ffffff;
            border-top: 1px solid #e0e5ed;
            flex-shrink: 0;
        }

        #modalVisualizarCliente .btn-modal {
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

        #modalVisualizarCliente .btn-modal.primario {
            background: #234367;
            color: #ffffff;
        }

        #modalVisualizarCliente .btn-modal.primario i {
            color: #d4a95a;
        }

        #modalVisualizarCliente .btn-modal.primario:hover {
            background: #2d5282;
        }

        #modalVisualizarCliente .btn-modal.secundario {
            background: #edf1f7;
            color: #17324f;
            border-color: #d5dbe5;
        }

        #modalVisualizarCliente .btn-modal.secundario:hover {
            background: #dfe5ee;
        }

        #modalVisualizarCliente .btn-modal:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        #modalVisualizarCliente .doc-corpo::-webkit-scrollbar {
            width: 7px;
        }

        #modalVisualizarCliente .doc-corpo::-webkit-scrollbar-track {
            background: #edf0f5;
            border-radius: 10px;
        }

        #modalVisualizarCliente .doc-corpo::-webkit-scrollbar-thumb {
            background: #b8c3d1;
            border-radius: 10px;
        }

        #modalVisualizarCliente .doc-corpo::-webkit-scrollbar-thumb:hover {
            background: #718096;
        }

        @media (max-width: 550px) {

            #modalVisualizarCliente {
                padding: 12px;
            }

            #modalVisualizarCliente .modal-caixa.modal-visualizar {
                max-height: 92vh;
            }

            #modalVisualizarCliente .doc-cabecalho {
                padding: 19px;
            }

            #modalVisualizarCliente .doc-titulo h2 {
                font-size: 18px;
            }

            #modalVisualizarCliente .doc-corpo {
                padding: 18px;
            }

            #modalVisualizarCliente .doc-grade {
                grid-template-columns: 1fr;
            }

            #modalVisualizarCliente .doc-item.primeiro-campo {
                grid-column: auto;
            }

            #modalVisualizarCliente .doc-rodape {
                padding: 14px 18px;
            }

            #modalVisualizarCliente .btn-modal {
                flex: 1;
                justify-content: center;
            }
        }

    `;

    document.head.appendChild(estilos);

    const modal = document.createElement("div");

    modal.id = "modalVisualizarCliente";

    modal.innerHTML = `

        <div class="modal-caixa modal-visualizar">

            <div class="doc-cabecalho">

                <div class="doc-titulo">
                    <i class="fa-solid fa-user"></i>
                    <h2 id="tituloModalCliente">Dados do Cliente</h2>
                </div>

                <button
                    type="button"
                    class="fechar-modal-cliente"
                    title="Fechar"
                    aria-label="Fechar janela"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="doc-corpo">
                <div id="dadosVisualizarCliente"></div>
            </div>

            <div class="doc-rodape" id="rodapeModalCliente"></div>

        </div>

    `;

    document.body.appendChild(modal);

    modal.querySelector(".fechar-modal-cliente")
        .addEventListener("click", fecharModal);

    modal.addEventListener("click", evento => {

        if (evento.target === modal) {
            fecharModal();
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

function desenharModal() {

    const cliente = clientes.find(item =>
        String(item.id) === String(clienteAbertoId)
    );

    if (!cliente) return;

    const status = obterStatus(cliente);
    const container = document.getElementById("dadosVisualizarCliente");
    const rodape = document.getElementById("rodapeModalCliente");
    const titulo = document.getElementById("tituloModalCliente");

    titulo.textContent = modoEdicao ? "Editar Cliente" : "Dados do Cliente";

    // ----- campos -----

    const camposHTML = CAMPOS.map(campo => {

        const valor = valorDoCampo(cliente, campo.chave);
        const classe = campo.primeiro ? "primeiro-campo" : "";

        if (modoEdicao) {
            return `
                <div class="doc-item ${classe}">
                    <small>${escaparHTML(campo.titulo)}</small>
                    <input
                        class="campo-edicao"
                        type="${campo.tipo}"
                        data-campo="${campo.chave}"
                        value="${escaparHTML(valor ?? "")}"
                        ${campo.maxlength ? `maxlength="${campo.maxlength}"` : ""}
                    >
                </div>
            `;
        }

        return `
            <div class="doc-item ${classe}">
                <small>${escaparHTML(campo.titulo)}</small>
                <strong>${escaparHTML(obterValor(valor))}</strong>
            </div>
        `;

    }).join("");

    // ----- status -----

    const statusHTML = modoEdicao
        ? `
            <div class="doc-item">
                <small>Status</small>
                <select class="campo-edicao" data-campo="status">
                    <option value="ativo" ${status === "ativo" ? "selected" : ""}>Ativo</option>
                    <option value="inativo" ${status === "inativo" ? "selected" : ""}>Inativo</option>
                </select>
            </div>
        `
        : `
            <div class="doc-item">
                <small>Status</small>
                <strong>
                    <span class="status-modal-cliente ${status}">
                        ${status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                </strong>
            </div>
        `;

    container.innerHTML = `<div class="doc-grade">${camposHTML}${statusHTML}</div>`;

    // ----- botões -----

    rodape.innerHTML = modoEdicao
        ? `
            <button type="button" class="btn-modal secundario" data-acao="cancelar">
                <i class="fa-solid fa-xmark"></i> Cancelar
            </button>
            <button type="button" class="btn-modal primario" data-acao="salvar" id="btnSalvarCliente">
                <i class="fa-solid fa-floppy-disk"></i> Salvar
            </button>
        `
        : `
            <button type="button" class="btn-modal primario" data-acao="editar">
                <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>
        `;
}

// ==========================================================
// ABRIR VISUALIZAÇÃO
// ==========================================================

function visualizarCliente(id) {

    const cliente = clientes.find(item =>
        String(item.id) === String(id)
    );

    if (!cliente) {
        alert("Não foi possível encontrar os dados deste cliente.");
        return;
    }

    criarModal();

    clienteAbertoId = cliente.id;
    modoEdicao = false;

    desenharModal();

    document.getElementById("modalVisualizarCliente")
        .classList.add("aberto");
}

// ==========================================================
// EDIÇÃO
// ==========================================================

function entrarModoEdicao() {
    modoEdicao = true;
    desenharModal();
}

function cancelarEdicao() {
    modoEdicao = false;
    desenharModal();
}

async function salvarEdicao() {

    if (salvando) return;

    const cliente = clientes.find(item =>
        String(item.id) === String(clienteAbertoId)
    );

    if (!cliente) return;

    const modal = document.getElementById("modalVisualizarCliente");

    // lê os campos digitados
    const novos = {};

    modal.querySelectorAll("[data-campo]").forEach(campo => {
        novos[campo.dataset.campo] = campo.value.trim();
    });

    // validações básicas
    if (!novos.nome) {
        alert("Informe o nome do cliente.");
        modal.querySelector('[data-campo="nome"]').focus();
        return;
    }

    if (novos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novos.email)) {
        alert("Informe um e-mail válido.");
        modal.querySelector('[data-campo="email"]').focus();
        return;
    }

    // monta o objeto que vai para o servidor
    const dados = {};

    CAMPOS.forEach(campo => {
        const chave = campo.chave === "tipoPessoa"
            ? chaveTipoPessoa(cliente)
            : campo.chave;

        dados[chave] = novos[campo.chave] ?? "";
    });

    const campoStatus = montarCampoStatus(cliente, novos.status);
    dados[campoStatus.chave] = campoStatus.valor;

    // salva
    const botaoSalvar = document.getElementById("btnSalvarCliente");

    salvando = true;

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    }

    try {

        await editarCliente(cliente.id, dados);

        // atualiza o cliente na memória e na tela
        Object.assign(cliente, dados);

        modoEdicao = false;

        atualizarIndicadores();
        renderizarClientes();
        desenharModal();

    } catch (erro) {

        console.error("Erro ao salvar cliente:", erro);

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

function fecharModal() {

    const modal = document.getElementById("modalVisualizarCliente");

    if (modal) {
        modal.classList.remove("aberto");
    }

    modoEdicao = false;
    clienteAbertoId = null;
}

document.addEventListener("keydown", evento => {

    if (evento.key === "Escape") {
        fecharModal();
    }

});

// ==========================================================
// RENDERIZAR CLIENTES
// ==========================================================

function renderizarClientes() {

    const filtrados = filtrarClientes();

    if (filtrados.length === 0) {

        listaClientes.innerHTML = `

            <tr>
                <td colspan="7" class="mensagem-vazia">
                    Nenhum cliente encontrado.
                </td>
            </tr>

        `;

        return;
    }

    listaClientes.innerHTML = filtrados.map(cliente => {

        const status = obterStatus(cliente);

        return `

            <tr>

                <td>${escaparHTML(cliente.nome || "-")}</td>

                <td>${escaparHTML(cliente.telefone || "-")}</td>

                <td>${escaparHTML(cliente.email || "-")}</td>

                <td>${escaparHTML(cliente.endereco || "-")}</td>

                <td>
                    ${escaparHTML(cliente.cidade || "-")}
                    ${cliente.estado
                        ? "/" + escaparHTML(cliente.estado)
                        : ""}
                </td>

                <td>

                    <span class="status-cliente ${status}">
                        ${status === "ativo" ? "Ativo" : "Inativo"}
                    </span>

                </td>

                <td>

                    <div class="acoes-cliente">

                        <!-- VISUALIZAR / EDITAR (dentro do modal) -->

                        <button
                            type="button"
                            class="btn-detalhes"
                            data-id="${escaparHTML(cliente.id)}"
                            title="Visualizar e editar cliente"
                            aria-label="Visualizar e editar cliente"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <!-- EXCLUIR -->

                        <button
                            type="button"
                            class="btn-excluir"
                            data-id="${escaparHTML(cliente.id)}"
                            title="Excluir cliente"
                            aria-label="Excluir cliente"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>

        `;

    }).join("");
}

// ==========================================================
// RECEBER ATUALIZAÇÕES DO CONTROLLER
// ==========================================================

clienteController.onChange(novosClientes => {

    clientes = Array.isArray(novosClientes)
        ? novosClientes
        : [];

    atualizarIndicadores();
    renderizarClientes();

});

// ==========================================================
// CAMPO DE PESQUISA
// ==========================================================

buscarClienteEl.addEventListener("input", () => {

    pesquisa = buscarClienteEl.value;

    renderizarClientes();

});

// ==========================================================
// FILTRO DE STATUS
// ==========================================================

filtroStatusEl.addEventListener("change", () => {

    renderizarClientes();

});

// ==========================================================
// AÇÕES: VISUALIZAR E EXCLUIR
// ==========================================================

listaClientes.addEventListener("click", async evento => {

    // VISUALIZAR

    const botaoVisualizar = evento.target.closest(".btn-detalhes");

    if (botaoVisualizar) {

        visualizarCliente(botaoVisualizar.dataset.id);

        return;
    }

    // EXCLUIR

    const botaoExcluir = evento.target.closest(".btn-excluir");

    if (!botaoExcluir) return;

    const id = botaoExcluir.dataset.id;

    const confirmar = confirm(
        "Tem certeza que deseja excluir este cliente?"
    );

    if (!confirmar) return;

    try {

        await clienteController.removerCliente(id);

        alert("Cliente excluído com sucesso!");

    } catch (erro) {

        console.error("Erro ao excluir cliente:", erro);

        alert("Não foi possível excluir o cliente.");

    }

});

// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

criarModal();

if (Array.isArray(clienteController.clientes)) {

    clientes = clienteController.clientes;

    atualizarIndicadores();
    renderizarClientes();

}

clienteController.iniciarEscuta();