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

    // Sem informação de status: considera ativo por padrão
    return "ativo";
}

// ==========================================================
// ATUALIZAR INDICADORES
// ==========================================================

function atualizarIndicadores() {

    // Total de clientes cadastrados
    totalClientesEl.textContent = clientes.length;

    // Total de clientes ativos
    const ativos = clientes.filter(cliente =>
        obterStatus(cliente) === "ativo"
    );

    clientesAtivosEl.textContent = ativos.length;

    // Total de cidades diferentes
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

                        <a
                            href="cliente-detalhes-adv.html?id=${encodeURIComponent(cliente.id)}"
                            class="btn-detalhes"
                            title="Ver detalhes"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </a>

                        <button
                            type="button"
                            class="btn-excluir"
                            data-id="${escaparHTML(cliente.id)}"
                            title="Excluir cliente"
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
// EXCLUIR CLIENTE
// ==========================================================

listaClientes.addEventListener("click", async evento => {

    const botao = evento.target.closest(".btn-excluir");

    if (!botao) return;

    const id = botao.dataset.id;

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

if (Array.isArray(clienteController.clientes)) {
    clientes = clienteController.clientes;
    atualizarIndicadores();
    renderizarClientes();
}

clienteController.iniciarEscuta();