
import { clienteController } from "../../controllers/clienteController.js";

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

// ==========================================================
// ATUALIZAR INDICADORES
// ==========================================================

function atualizarIndicadores() {

    totalClientesEl.textContent = clientes.length;

    const ativos = clientes.filter(cliente =>
        obterStatus(cliente) === "ativo"
    );

    clientesAtivosEl.textContent = ativos.length;

    const cidades = new Set(
        clientes
            .map(cliente =>
                String(cliente.cidade || "").trim().toLowerCase()
            )
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
// MODAL DE VISUALIZAÇÃO DO CLIENTE
// MESMO DESIGN DO VISUALIZAR DOCUMENTO
// ==========================================================

function criarModal() {

    if (document.getElementById("modalVisualizarCliente")) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.id = "estilosModalVisualizarCliente";

    estilos.textContent = `

        /* FUNDO DO MODAL */

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

        /* CAIXA PRINCIPAL */

        #modalVisualizarCliente .modal-caixa.modal-visualizar {
            background: #ffffff;

            width: 100%;
            max-width: 620px;

            max-height: 90vh;

            border-radius: 18px;

            overflow: hidden;

            display: flex;
            flex-direction: column;

            box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);

            animation: aparecerModalCliente .25s ease;
        }

        @keyframes aparecerModalCliente {
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

        #modalVisualizarCliente .doc-cabecalho {
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

        /* BOTÃO FECHAR */

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

        /* CORPO DO MODAL */

        #modalVisualizarCliente .doc-corpo {
            padding: 25px 26px 28px;

            background: #f4f6fa;

            overflow-y: auto;

            flex: 1;
            min-height: 0;
        }

        /* GRADE DOS DADOS */

        #modalVisualizarCliente .doc-grade {
            display: grid;

            grid-template-columns: repeat(2, minmax(0, 1fr));

            gap: 14px;
        }

        /* CAMPOS */

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

        /* PRIMEIRO CAMPO OCUPA A LINHA TODA */

        #modalVisualizarCliente .doc-item.primeiro-campo {
            grid-column: 1 / -1;
        }

        /* RÓTULOS */

        #modalVisualizarCliente .doc-item small {
            display: block;

            color: #718096;

            font-family: 'Inter', sans-serif;

            font-size: 12px;
            font-weight: 500;

            margin-bottom: 7px;
        }

        /* VALORES */

        #modalVisualizarCliente .doc-item strong {
            display: block;

            color: #17324f;

            font-family: 'Inter', sans-serif;

            font-size: 14px;
            font-weight: 600;

            overflow-wrap: anywhere;
            line-height: 1.5;
        }

        /* STATUS */

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

        /* ROLAGEM */

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

        /* RESPONSIVIDADE */

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
        }

    `;

    document.head.appendChild(estilos);

    const modal = document.createElement("div");

    modal.id = "modalVisualizarCliente";

    modal.innerHTML = `

        <div class="modal-caixa modal-visualizar">

            <!-- CABEÇALHO -->

            <div class="doc-cabecalho">

                <div class="doc-titulo">

                    <i class="fa-solid fa-user"></i>

                    <h2>Dados do Cliente</h2>

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

            <!-- CORPO -->

            <div class="doc-corpo">

                <div id="dadosVisualizarCliente"></div>

            </div>

        </div>

    `;

    document.body.appendChild(modal);

    modal.querySelector(".fechar-modal-cliente")
        .addEventListener("click", fecharModal);

    modal.addEventListener("click", evento => {

        if (evento.target === modal) {
            fecharModal();
        }

    });
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

    const status = obterStatus(cliente);

    const dados = [

        ["Nome completo", obterValor(cliente.nome)],
        ["CPF", obterValor(cliente.cpf)],
        ["CNPJ", obterValor(cliente.cnpj)],
        ["RG", obterValor(cliente.rg)],
        ["Telefone", obterValor(cliente.telefone)],
        ["E-mail", obterValor(cliente.email)],
        ["Endereço", obterValor(cliente.endereco)],
        ["Cidade", obterValor(cliente.cidade)],
        ["Estado/UF", obterValor(cliente.estado)],
        ["Tipo de pessoa", obterValor(cliente.tipoPessoa, cliente.tipo_pessoa)]

    ];

    const container = document.getElementById("dadosVisualizarCliente");

    container.innerHTML = `

        <div class="doc-grade">

            ${dados.map(([titulo, valor], indice) => `

                <div class="doc-item ${indice === 0 ? "primeiro-campo" : ""}">

                    <small>${escaparHTML(titulo)}</small>

                    <strong>${escaparHTML(valor)}</strong>

                </div>

            `).join("")}

            <div class="doc-item">

                <small>Status</small>

                <strong>

                    <span class="status-modal-cliente ${status}">
                        ${status === "ativo" ? "Ativo" : "Inativo"}
                    </span>

                </strong>

            </div>

        </div>

    `;

    document.getElementById("modalVisualizarCliente")
        .classList.add("aberto");
}

// ==========================================================
// FECHAR VISUALIZAÇÃO
// ==========================================================

function fecharModal() {

    const modal = document.getElementById("modalVisualizarCliente");

    if (modal) {
        modal.classList.remove("aberto");
    }
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
        const id = encodeURIComponent(cliente.id);

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

                        <!-- VISUALIZAR -->

                        <button
                            type="button"
                            class="btn-detalhes"
                            data-id="${escaparHTML(cliente.id)}"
                            title="Visualizar cliente"
                            aria-label="Visualizar cliente"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <!-- EDITAR -->

                        <a
                            href="cadastro-cliente-adv.html?id=${id}"
                            class="btn-editar"
                            title="Editar cliente"
                            aria-label="Editar cliente"
                        >
                            <i class="fa-solid fa-pen-to-square"></i>
                        </a>

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

        const id = botaoVisualizar.dataset.id;

        visualizarCliente(id);

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
