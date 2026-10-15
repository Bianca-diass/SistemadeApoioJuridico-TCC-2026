import { documentoController } from "../../controllers/documentosController.js";

const tbody = document.getElementById("listaDocumentos");
const pesquisa = document.getElementById("pesquisarDocumento");
const filtroCliente = document.getElementById("filtroCliente");
const totalDocumentos = document.getElementById("totalDocumentos");
const totalPendentes = document.getElementById("totalPendentes");
const totalAprovados = document.getElementById("totalAprovados");
const modal = document.getElementById("modalDocumento");
const fecharModal = document.getElementById("fecharModal");
const modalEditar = document.getElementById("modalEditar");
const formEditarDocumento = document.getElementById("formEditarDocumento");
const cancelarEdicao = document.getElementById("cancelarEdicao");


// ==========================================
// ESCAPAR TEXTO (evita que o que foi digitado
// seja interpretado como HTML na tela)
// ==========================================

function escapar(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const NAO_INFORMADO = `<span class="texto-secundario">Não informado</span>`;


// ==========================================
// FORMATAR DATA (yyyy-mm-dd -> dd/mm/yyyy)
// ==========================================

function formatarData(data) {
    if (!data) return "-";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
}


// ==========================================
// CLASSE DO BADGE DE STATUS
// ==========================================

function classeStatus(status) {
    switch (status) {
        case "Pendente":
            return "pendente";
        case "Aprovado":
            return "aprovado";
        case "Rejeitado":
            return "rejeitado";
        default:
            return "semstatus";
    }
}


// ==========================================
// RENDERIZAR DOCUMENTOS
// ==========================================

function renderizarDocumentos(documentos) {

    if (!documentos || documentos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px; color:#999;">
                    Nenhum documento encontrado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = documentos.map(doc => `
        <tr>
            <td>
                <i class="fa-solid fa-file"></i>
                ${escapar(doc.titulo || "Sem nome")}
            </td>

            <td>${escapar(doc.tipo || "-")}</td>

            <td>${escapar(doc.cliente || "-")}</td>

            <td>${doc.processo ? escapar(doc.processo) : NAO_INFORMADO}</td>

            <td>${formatarData(doc.dataEnvio)}</td>

            <td>
                <span class="status-badge ${classeStatus(doc.status)}">
                    ${escapar(doc.status || "Sem status")}
                </span>
            </td>

            <td>
                <div class="acoes-documento">

                    <button class="btn-acao btn-visualizar" title="Visualizar" data-id="${escapar(doc.id)}" type="button">
                        <i class="fa-solid fa-eye"></i>
                    </button>

                    <button class="btn-acao btn-renomear" title="Editar" data-id="${escapar(doc.id)}" type="button">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button class="btn-acao btn-excluir" title="Excluir" data-id="${escapar(doc.id)}" type="button">
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>
            </td>
        </tr>
    `).join("");

}


// ==========================================
// ATUALIZAR CARDS
// ==========================================

function atualizarCards(documentos) {

    totalDocumentos.textContent = documentos.length;

    totalPendentes.textContent =
        documentos.filter(doc => doc.status === "Pendente").length;

    totalAprovados.textContent =
        documentos.filter(doc => doc.status === "Aprovado").length;

}


// ==========================================
// PREENCHER FILTRO DE CLIENTES
// (mantém o cliente escolhido depois de editar/excluir)
// ==========================================

function atualizarFiltroClientes(documentos) {

    const selecionado = filtroCliente.value;

    const clientes = [
        ...new Set(
            documentos
                .map(doc => doc.cliente)
                .filter(cliente => cliente)
        )
    ];

    filtroCliente.innerHTML = `<option value="">Todos os clientes</option>`;

    clientes.forEach(cliente => {
        const option = document.createElement("option");
        option.value = cliente;
        option.textContent = cliente;
        filtroCliente.appendChild(option);
    });

    if (clientes.includes(selecionado)) {
        filtroCliente.value = selecionado;
    }

}


// ==========================================
// FILTRAR DOCUMENTOS
// ==========================================

function filtrarDocumentos() {

    const texto = pesquisa.value.toLowerCase();
    const clienteSelecionado = filtroCliente.value.toLowerCase();

    const documentosFiltrados = documentoController.documentos.filter(doc => {

        const correspondeTexto =
            (doc.titulo || "").toLowerCase().includes(texto) ||
            (doc.tipo || "").toLowerCase().includes(texto) ||
            (doc.cliente || "").toLowerCase().includes(texto);

        const correspondeCliente =
            !clienteSelecionado ||
            (doc.cliente || "").toLowerCase() === clienteSelecionado;

        return correspondeTexto && correspondeCliente;

    });

    renderizarDocumentos(documentosFiltrados);

}


// ==========================================
// ABRIR MODAL DE EDIÇÃO
// O cliente não pode ser trocado aqui: ele está
// vinculado ao documento pelo id (clienteId).
// ==========================================

function abrirEdicao(documento) {

    document.getElementById("editarId").value = documento.id;
    document.getElementById("editarTitulo").value = documento.titulo || "";
    document.getElementById("editarTipo").value = documento.tipo || "Outros";

    const campoCliente = document.getElementById("editarCliente");
    campoCliente.value = documento.cliente || "";
    campoCliente.readOnly = true;

    document.getElementById("editarProcesso").value = documento.processo || "";
    document.getElementById("editarData").value = documento.dataEnvio || "";
    document.getElementById("editarStatus").value = documento.status || "Pendente";
    document.getElementById("editarDescricao").value = documento.descricao || "";

    modalEditar.classList.add("ativo");

}


// ==========================================
// AÇÕES DA TABELA (DELEGAÇÃO DE EVENTO)
// ==========================================

tbody.addEventListener("click", async (evento) => {

    const botao = evento.target.closest(".btn-acao");

    if (!botao || !tbody.contains(botao)) return;

    const id = botao.dataset.id;

    const documento = documentoController.documentos.find(doc => doc.id === id);

    if (!documento) {
        console.error("Documento não encontrado para o id:", id);
        return;
    }


    // ----- VISUALIZAR -----
    if (botao.classList.contains("btn-visualizar")) {

        document.getElementById("modalTitulo").textContent = documento.titulo || "-";
        document.getElementById("modalTipo").textContent = documento.tipo || "-";
        document.getElementById("modalCliente").textContent = documento.cliente || "-";

        document.getElementById("modalProcesso").innerHTML =
            documento.processo ? escapar(documento.processo) : NAO_INFORMADO;

        document.getElementById("modalData").textContent = formatarData(documento.dataEnvio);

        document.getElementById("modalStatus").innerHTML =
            `<span class="status-badge ${classeStatus(documento.status)}">${escapar(documento.status || "Sem status")}</span>`;

        document.getElementById("modalDescricao").innerHTML =
            documento.descricao ? escapar(documento.descricao) : NAO_INFORMADO;

        modal.classList.add("ativo");

        return;
    }


    // ----- EDITAR -----
    if (botao.classList.contains("btn-renomear")) {

        abrirEdicao(documento);

        return;
    }


    // ----- EXCLUIR -----
    if (botao.classList.contains("btn-excluir")) {

        if (!confirm("Deseja excluir este documento?")) return;

        try {

            await documentoController.removerDocumento(id);

            alert("Documento excluído com sucesso!");

        } catch (erro) {

            console.error("Erro ao excluir documento:", erro);

            alert(erro.message || "Erro ao excluir documento.");

        }

    }

});


// ==========================================
// SALVAR EDIÇÃO
// ==========================================

formEditarDocumento.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const id = document.getElementById("editarId").value;

    const dadosAtualizados = {
        titulo: document.getElementById("editarTitulo").value.trim(),
        tipo: document.getElementById("editarTipo").value,
        processo: document.getElementById("editarProcesso").value.trim(),
        dataEnvio: document.getElementById("editarData").value,
        status: document.getElementById("editarStatus").value,
        descricao: document.getElementById("editarDescricao").value.trim()
    };

    try {

        await documentoController.editarDocumento(id, dadosAtualizados);

        await documentoController.carregar();

        modalEditar.classList.remove("ativo");

        alert("Documento atualizado com sucesso!");

    } catch (erro) {

        console.error("Erro ao editar documento:", erro);

        alert(erro.message || "Erro ao editar documento.");

    }

});


// ==========================================
// FECHAR MODAIS
// ==========================================

fecharModal.addEventListener("click", () => {
    modal.classList.remove("ativo");
});

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.remove("ativo");
    }
});

cancelarEdicao.addEventListener("click", () => {
    modalEditar.classList.remove("ativo");
});

modalEditar.addEventListener("click", (e) => {
    if (e.target === modalEditar) {
        modalEditar.classList.remove("ativo");
    }
});


// ==========================================
// PESQUISA E FILTRO
// ==========================================

pesquisa.addEventListener("input", filtrarDocumentos);

filtroCliente.addEventListener("change", filtrarDocumentos);


// ==========================================
// CARREGAR DOCUMENTOS
// ==========================================

documentoController.onChange((documentos) => {
    atualizarCards(documentos);
    atualizarFiltroClientes(documentos);
    filtrarDocumentos();
});

documentoController.carregar().catch((erro) => {
    console.error("Erro ao carregar documentos:", erro);
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:20px; color:#999;">
                ${escapar(erro.message || "Não foi possível carregar os documentos.")}
            </td>
        </tr>
    `;
});