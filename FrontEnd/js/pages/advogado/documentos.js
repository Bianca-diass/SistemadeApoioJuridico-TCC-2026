
import {
    listarDocumentos,
    buscarDocumento,
    editarDocumento,
    excluirDocumento,
    obterDownloadDocumento,
    iniciarDownload
} from "../../services/documentoService.js";

const lista = document.getElementById("listaDocumentos");
const pesquisa = document.getElementById("pesquisarDocumento");
const filtroCliente = document.getElementById("filtroCliente");

let documentos = [];
let documentoVisualizadoId = null;

const elemento = id => document.getElementById(id);

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[c]);
}

function formatarData(data) {
    if (!data) return "-";

    const partes = String(data).substring(0, 10).split("-");

    if (partes.length !== 3) return "-";

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function atualizarResumo() {
    elemento("totalDocumentos").textContent = documentos.length;

    elemento("totalPendentes").textContent =
        documentos.filter(d => d.status === "Pendente").length;

    elemento("totalAprovados").textContent =
        documentos.filter(d => d.status === "Aprovado").length;
}

function carregarFiltroClientes() {
    const clientes = [...new Set(
        documentos.map(d => d.cliente).filter(Boolean)
    )];

    const selecionado = filtroCliente.value;

    filtroCliente.innerHTML = `
        <option value="">Todos os clientes</option>
        ${clientes.map(nome => `
            <option value="${escapar(nome)}">
                ${escapar(nome)}
            </option>
        `).join("")}
    `;

    filtroCliente.value = selecionado;
}

function classeStatus(status) {
    const classes = {
        Pendente: "pendente",
        Aprovado: "aprovado",
        Rejeitado: "rejeitado"
    };

    return classes[status] || "";
}

// ==========================================
// BOTÃO EXCLUIR DENTRO DO MODAL
// ==========================================

function criarBotaoExcluirModal() {
    const modal = elemento("modalDocumento");

    if (!modal) {
        console.error("Modal de visualização não encontrado.");
        return;
    }

    // Local correto: corpo interno da janela do contrato
    const corpo = modal.querySelector(".doc-corpo");

    if (!corpo) {
        console.error("Elemento .doc-corpo não encontrado no modal.");
        return;
    }

    // Reutiliza o botão se ele já existir
    let botao = elemento("excluirDocumentoModal");

    if (!botao) {
        botao = document.createElement("button");
        botao.type = "button";
        botao.id = "excluirDocumentoModal";
        botao.innerHTML =
            '<i class="fas fa-trash"></i> Excluir documento';
    }

    // Posicionamento dentro do modal, abaixo da descrição
    corpo.appendChild(botao);

    // Evita adicionar vários eventos ao mesmo botão
    botao.onclick = async () => {
        if (!documentoVisualizadoId) {
            alert("Não foi possível identificar o documento.");
            return;
        }

        const sucesso = await removerDocumento(
            documentoVisualizadoId
        );

        if (sucesso) {
            modal.hidden = true;
            documentoVisualizadoId = null;
        }
    };
}

// ==========================================
// RENDERIZAR DOCUMENTOS
// ==========================================

function renderizarDocumentos() {
    const termo = pesquisa.value.toLowerCase().trim();
    const cliente = filtroCliente.value;

    const filtrados = documentos.filter(doc => {
        const correspondeTexto = [
            doc.titulo,
            doc.tipo,
            doc.cliente,
            doc.processo,
            doc.status
        ].some(valor =>
            String(valor || "").toLowerCase().includes(termo)
        );

        return correspondeTexto &&
            (!cliente || doc.cliente === cliente);
    });

    if (!filtrados.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="7" class="vazio">
                    Nenhum documento encontrado.
                </td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = filtrados.map(doc => `
        <tr>
            <td>${escapar(doc.titulo || "Sem título")}</td>

            <td>${escapar(doc.tipo || "-")}</td>

            <td>${escapar(doc.cliente || "-")}</td>

            <td>${escapar(doc.processo || "-")}</td>

            <td>${formatarData(doc.data_envio)}</td>

            <td>
                <span class="status ${classeStatus(doc.status)}">
                    ${escapar(doc.status || "-")}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    onclick="visualizarDocumento('${escapar(doc.id)}')"
                    title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>

                <button
                    type="button"
                    onclick="editarDocumentoTela('${escapar(doc.id)}')"
                    title="Editar">
                    <i class="fas fa-pen"></i>
                </button>

                <button
                    type="button"
                    onclick="baixarDocumento('${escapar(doc.id)}')"
                    title="Baixar arquivo">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>
    `).join("");
}

// ==========================================
// CARREGAR DOCUMENTOS
// ==========================================

async function carregarDocumentos() {
    lista.innerHTML = `
        <tr>
            <td colspan="7">Carregando documentos...</td>
        </tr>
    `;

    try {
        const resposta = await listarDocumentos();

        documentos = Array.isArray(resposta) ? resposta : [];

        atualizarResumo();
        carregarFiltroClientes();
        renderizarDocumentos();

    } catch (erro) {
        console.error("Erro ao carregar documentos:", erro);

        lista.innerHTML = `
            <tr>
                <td colspan="7">
                    Erro ao carregar documentos:
                    ${escapar(erro.message)}
                </td>
            </tr>
        `;
    }
}

// ==========================================
// VISUALIZAR DOCUMENTO
// ==========================================

window.visualizarDocumento = async function(id) {
    try {
        const doc = await buscarDocumento(id);

        documentoVisualizadoId = doc.id;

        elemento("modalTitulo").textContent =
            doc.titulo || "-";

        elemento("modalTipo").textContent =
            doc.tipo || "-";

        elemento("modalCliente").textContent =
            doc.cliente || "-";

        elemento("modalProcesso").textContent =
            doc.processo || "-";

        elemento("modalData").textContent =
            formatarData(doc.data_envio);

        elemento("modalStatus").textContent =
            doc.status || "-";

        elemento("modalDescricao").textContent =
            doc.descricao || "Nenhuma descrição informada.";

        criarBotaoExcluirModal();

        elemento("modalDocumento").hidden = false;

    } catch (erro) {
        console.error("Erro ao visualizar documento:", erro);
        alert(erro.message);
    }
};

// ==========================================
// FECHAR VISUALIZAÇÃO
// ==========================================

elemento("fecharModal")?.addEventListener("click", () => {
    elemento("modalDocumento").hidden = true;
    documentoVisualizadoId = null;
});

// ==========================================
// EDITAR DOCUMENTO
// ==========================================

window.editarDocumentoTela = async function(id) {
    try {
        const doc = await buscarDocumento(id);

        elemento("editarId").value = doc.id;
        elemento("editarTitulo").value = doc.titulo || "";
        elemento("editarTipo").value = doc.tipo || "Outros";
        elemento("editarCliente").value = doc.cliente || "";
        elemento("editarProcesso").value = doc.processo || "";

        elemento("editarData").value =
            doc.data_envio
                ? doc.data_envio.substring(0, 10)
                : "";

        elemento("editarStatus").value =
            doc.status || "Pendente";

        elemento("editarDescricao").value =
            doc.descricao || "";

        elemento("modalEditar").hidden = false;

    } catch (erro) {
        console.error("Erro ao buscar documento:", erro);
        alert(erro.message);
    }
};

// ==========================================
// SALVAR ALTERAÇÕES
// ==========================================

elemento("formEditarDocumento")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const id = elemento("editarId").value;

        const dados = {
            titulo: elemento("editarTitulo").value.trim(),
            tipo: elemento("editarTipo").value,
            processo: elemento("editarProcesso").value.trim(),
            dataEnvio: elemento("editarData").value,
            status: elemento("editarStatus").value,
            descricao: elemento("editarDescricao").value.trim()
        };

        try {
            await editarDocumento(id, dados);

            elemento("modalEditar").hidden = true;

            await carregarDocumentos();

            alert("Documento atualizado com sucesso!");

        } catch (erro) {
            console.error("Erro ao editar documento:", erro);
            alert(erro.message);
        }
    }
);

// ==========================================
// CANCELAR EDIÇÃO
// ==========================================

elemento("cancelarEdicao")?.addEventListener("click", () => {
    elemento("modalEditar").hidden = true;
});

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

window.removerDocumento = async function(id) {
    const confirmar = confirm(
        "Deseja realmente excluir este documento?"
    );

    if (!confirmar) {
        return false;
    }

    try {
        await excluirDocumento(id);

        await carregarDocumentos();

        alert("Documento excluído com sucesso!");

        return true;

    } catch (erro) {
        console.error("Erro ao excluir documento:", erro);
        alert(erro.message);

        return false;
    }
};

// ==========================================
// BAIXAR DOCUMENTO
// ==========================================

window.baixarDocumento = async function(id) {
    try {
        const dados = await obterDownloadDocumento(id);

        iniciarDownload(dados);

    } catch (erro) {
        console.error("Erro ao baixar documento:", erro);
        alert(erro.message);
    }
};

// ==========================================
// PESQUISA E FILTRO
// ==========================================

pesquisa.addEventListener("input", renderizarDocumentos);

filtroCliente.addEventListener("change", renderizarDocumentos);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarDocumentos();
