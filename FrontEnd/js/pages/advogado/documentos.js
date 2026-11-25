
import {
    listarDocumentos,
    buscarDocumento,
    editarDocumento,
    excluirDocumento,
    obterDownloadDocumento,
    iniciarDownload
} from "../../services/documentoService.js";

// ==========================================
// ELEMENTOS
// ==========================================

const lista = document.getElementById("listaDocumentos");
const pesquisa = document.getElementById("pesquisarDocumento");
const filtroCliente = document.getElementById("filtroCliente");

const totalDocumentos = document.getElementById("totalDocumentos");
const totalPendentes = document.getElementById("totalPendentes");
const totalAprovados = document.getElementById("totalAprovados");

const modalDocumento = document.getElementById("modalDocumento");
const modalEditar = document.getElementById("modalEditar");

const formEditar = document.getElementById("formEditarDocumento");

let documentos = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function obterCampo(objeto, ...campos) {
    for (const campo of campos) {
        if (objeto?.[campo] !== undefined && objeto[campo] !== null) {
            return objeto[campo];
        }
    }
    return "";
}

function dataFormatada(data) {
    if (!data) return "-";

    const valor = String(data).slice(0, 10);
    const partes = valor.split("-");

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : valor;
}

function nomeCliente(doc) {
    return obterCampo(doc, "cliente", "nome_cliente") || "Não informado";
}

function statusNormalizado(status) {
    return String(status || "").trim().toLowerCase();
}

function mostrarMensagem(mensagem, classe = "vazio") {
    lista.innerHTML = `
        <tr>
            <td colspan="7" class="${classe}">
                ${escapar(mensagem)}
            </td>
        </tr>
    `;
}

// ==========================================
// CARREGAR DOCUMENTOS
// ==========================================

async function carregarDocumentos() {
    mostrarMensagem("Carregando documentos...");

    try {
        const resposta = await listarDocumentos();

        documentos = Array.isArray(resposta)
            ? resposta
            : Array.isArray(resposta?.documentos)
                ? resposta.documentos
                : [];

        atualizarResumo();
        preencherFiltroClientes();
        renderizarDocumentos();

    } catch (erro) {
        console.error("Erro ao carregar documentos:", erro);

        documentos = [];
        atualizarResumo();

        mostrarMensagem(
            erro.message || "Não foi possível carregar os documentos."
        );
    }
}

// ==========================================
// RESUMO
// ==========================================

function atualizarResumo() {
    totalDocumentos.textContent = documentos.length;

    totalPendentes.textContent = documentos.filter(doc =>
        statusNormalizado(doc.status) === "pendente"
    ).length;

    totalAprovados.textContent = documentos.filter(doc =>
        statusNormalizado(doc.status) === "aprovado"
    ).length;
}

// ==========================================
// FILTRO DE CLIENTES
// ==========================================

function preencherFiltroClientes() {
    const selecionado = filtroCliente.value;

    const clientes = [...new Set(
        documentos.map(nomeCliente).filter(nome =>
            nome && nome !== "Não informado"
        )
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    filtroCliente.innerHTML = `
        <option value="">Todos os clientes</option>
        ${clientes.map(cliente => `
            <option value="${escapar(cliente)}">
                ${escapar(cliente)}
            </option>
        `).join("")}
    `;

    if (clientes.includes(selecionado)) {
        filtroCliente.value = selecionado;
    }
}

// ==========================================
// RENDERIZAR TABELA
// ==========================================

function renderizarDocumentos() {
    const termo = pesquisa.value.trim().toLowerCase();
    const clienteSelecionado = filtroCliente.value;

    const filtrados = documentos.filter(doc => {
        const titulo = obterCampo(doc, "titulo", "nome");
        const tipo = obterCampo(doc, "tipo");
        const cliente = nomeCliente(doc);
        const processo = obterCampo(doc, "processo");

        const correspondePesquisa = [
            titulo,
            tipo,
            cliente,
            processo
        ].some(valor =>
            String(valor).toLowerCase().includes(termo)
        );

        const correspondeCliente =
            !clienteSelecionado || cliente === clienteSelecionado;

        return correspondePesquisa && correspondeCliente;
    });

    if (!filtrados.length) {
        mostrarMensagem(
            documentos.length
                ? "Nenhum documento encontrado com esses filtros."
                : "Nenhum documento cadastrado."
        );
        return;
    }

    lista.innerHTML = filtrados.map(doc => {
        const id = obterCampo(doc, "id");
        const titulo = obterCampo(doc, "titulo", "nome");
        const tipo = obterCampo(doc, "tipo");
        const cliente = nomeCliente(doc);
        const processo = obterCampo(doc, "processo") || "-";
        const data = obterCampo(doc, "data_envio", "dataEnvio");
        const status = obterCampo(doc, "status") || "Pendente";

        return `
            <tr>
                <td>${escapar(titulo || "Sem título")}</td>
                <td>${escapar(tipo || "-")}</td>
                <td>${escapar(cliente)}</td>
                <td>${escapar(processo)}</td>
                <td>${escapar(dataFormatada(data))}</td>
                <td>
                    <span class="status ${escapar(statusNormalizado(status))}">
                        ${escapar(status)}
                    </span>
                </td>
                <td>
                    <button type="button" title="Visualizar"
                        data-acao="visualizar" data-id="${escapar(id)}">
                        <i class="fas fa-eye"></i>
                    </button>

                    <button type="button" title="Editar"
                        data-acao="editar" data-id="${escapar(id)}">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button type="button" title="Baixar"
                        data-acao="baixar" data-id="${escapar(id)}">
                        <i class="fas fa-download"></i>
                    </button>

                    <button type="button" title="Excluir"
                        data-acao="excluir" data-id="${escapar(id)}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// VISUALIZAR DOCUMENTO
// ==========================================

async function visualizarDocumento(id) {
    try {
        const doc = await buscarDocumento(id);

        document.getElementById("modalTipo").textContent =
            obterCampo(doc, "tipo") || "-";

        document.getElementById("modalTitulo").textContent =
            obterCampo(doc, "titulo") || "-";

        document.getElementById("modalStatus").textContent =
            obterCampo(doc, "status") || "-";

        document.getElementById("modalCliente").textContent =
            nomeCliente(doc);

        document.getElementById("modalProcesso").textContent =
            obterCampo(doc, "processo") || "-";

        document.getElementById("modalData").textContent =
            dataFormatada(obterCampo(doc, "data_envio", "dataEnvio"));

        document.getElementById("modalDescricao").textContent =
            obterCampo(doc, "descricao") || "Nenhuma descrição informada.";

        modalDocumento.hidden = false;

    } catch (erro) {
        alert(erro.message);
    }
}

// ==========================================
// EDITAR DOCUMENTO
// ==========================================

function abrirEdicao(id) {
    const doc = documentos.find(item => String(item.id) === String(id));

    if (!doc) {
        alert("Documento não encontrado.");
        return;
    }

    document.getElementById("editarId").value = doc.id;
    document.getElementById("editarTitulo").value = doc.titulo || "";
    document.getElementById("editarTipo").value = doc.tipo || "Outros";
    document.getElementById("editarCliente").value = nomeCliente(doc);
    document.getElementById("editarProcesso").value = doc.processo || "";

    document.getElementById("editarData").value =
        String(obterCampo(doc, "data_envio", "dataEnvio") || "").slice(0, 10);

    document.getElementById("editarStatus").value = doc.status || "Pendente";
    document.getElementById("editarDescricao").value = doc.descricao || "";

    modalEditar.hidden = false;
}

formEditar.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("editarId").value;

    const dados = {
        titulo: document.getElementById("editarTitulo").value.trim(),
        tipo: document.getElementById("editarTipo").value,
        processo: document.getElementById("editarProcesso").value.trim(),
        dataEnvio: document.getElementById("editarData").value,
        status: document.getElementById("editarStatus").value,
        descricao: document.getElementById("editarDescricao").value.trim()
    };

    try {
        await editarDocumento(id, dados);

        modalEditar.hidden = true;

        alert("Documento atualizado com sucesso!");

        await carregarDocumentos();

    } catch (erro) {
        alert(erro.message);
    }
});

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

async function removerDocumento(id) {
    if (!confirm("Deseja realmente excluir este documento?")) {
        return;
    }

    try {
        await excluirDocumento(id);

        alert("Documento excluído com sucesso!");

        await carregarDocumentos();

    } catch (erro) {
        alert(erro.message);
    }
}

// ==========================================
// BAIXAR DOCUMENTO
// ==========================================

async function baixarDocumento(id) {
    try {
        const dados = await obterDownloadDocumento(id);
        iniciarDownload(dados);

    } catch (erro) {
        alert(erro.message);
    }
}

// ==========================================
// AÇÕES DA TABELA
// ==========================================

lista.addEventListener("click", async event => {
    const botao = event.target.closest("button[data-acao]");

    if (!botao) return;

    const id = botao.dataset.id;
    const acao = botao.dataset.acao;

    if (!id) return;

    if (acao === "visualizar") {
        await visualizarDocumento(id);
    }

    if (acao === "editar") {
        abrirEdicao(id);
    }

    if (acao === "baixar") {
        await baixarDocumento(id);
    }

    if (acao === "excluir") {
        await removerDocumento(id);
    }
});

// ==========================================
// MODAIS
// ==========================================

document.getElementById("fecharModal").addEventListener("click", () => {
    modalDocumento.hidden = true;
});

document.getElementById("cancelarEdicao").addEventListener("click", () => {
    modalEditar.hidden = true;
});

[modalDocumento, modalEditar].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.hidden = true;
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        modalDocumento.hidden = true;
        modalEditar.hidden = true;
    }
});

// ==========================================
// PESQUISA E FILTROS
// ==========================================

pesquisa.addEventListener("input", renderizarDocumentos);
filtroCliente.addEventListener("change", renderizarDocumentos);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarDocumentos();
