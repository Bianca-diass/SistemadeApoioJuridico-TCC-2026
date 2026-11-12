
// ==========================================
// CONFIGURAÇÕES
// ==========================================

const CONFIG = {
    apiBase: "",
    tokenKey: "token",
    listar: "/documentos",
    login: "login.html"
};

// ==========================================
// ELEMENTOS HTML
// ==========================================

const el = {
    docs: document.getElementById("listaDocumentos"),
    busca: document.getElementById("pesquisarDocumento"),
    filtro: document.getElementById("filtroCliente"),

    total: document.getElementById("totalDocumentos"),
    pendentes: document.getElementById("totalPendentes"),
    aprovados: document.getElementById("totalAprovados"),

    modal: document.getElementById("modalDocumento"),
    fecharModal: document.getElementById("fecharModal"),

    modalTitulo: document.getElementById("modalTitulo"),
    modalTipo: document.getElementById("modalTipo"),
    modalCliente: document.getElementById("modalCliente"),
    modalProcesso: document.getElementById("modalProcesso"),
    modalData: document.getElementById("modalData"),
    modalStatus: document.getElementById("modalStatus"),
    modalDescricao: document.getElementById("modalDescricao"),

    modalEditar: document.getElementById("modalEditar"),
    formEditar: document.getElementById("formEditarDocumento"),

    editarId: document.getElementById("editarId"),
    editarTitulo: document.getElementById("editarTitulo"),
    editarTipo: document.getElementById("editarTipo"),
    editarCliente: document.getElementById("editarCliente"),
    editarProcesso: document.getElementById("editarProcesso"),
    editarData: document.getElementById("editarData"),
    editarStatus: document.getElementById("editarStatus"),
    editarDescricao: document.getElementById("editarDescricao"),

    cancelarEdicao: document.getElementById("cancelarEdicao")
};

// ==========================================
// VARIÁVEIS
// ==========================================

let documentos = [];

// ==========================================
// VERIFICAR ELEMENTOS
// ==========================================

if (!el.docs || !el.busca || !el.filtro) {
    console.error("Elementos da tela de documentos não encontrados.");
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatarData(valor) {
    if (!valor) return "-";

    const data = String(valor).substring(0, 10);
    const partes = data.split("-");

    if (partes.length !== 3) return "-";

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterDocumento(id) {
    return documentos.find(doc => String(doc.id) === String(id));
}

function mostrarErro(mensagem) {
    alert(mensagem);
}

// ==========================================
// CONEXÃO COM BACKEND
// ==========================================

async function fetchAuth(url, opcoes = {}) {

    const token = localStorage.getItem(CONFIG.tokenKey);

    if (!token) {
        window.location.href = CONFIG.login;
        throw new Error("Token não encontrado.");
    }

    const resposta = await fetch(CONFIG.apiBase + url, {
        ...opcoes,

        headers: {
            ...(opcoes.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    if (resposta.status === 401) {
        localStorage.removeItem(CONFIG.tokenKey);
        window.location.href = CONFIG.login;
        throw new Error("Sessão expirada.");
    }

    return resposta;
}

async function lerResposta(resposta) {
    const texto = await resposta.text();

    if (!texto) return {};

    try {
        return JSON.parse(texto);
    } catch {
        return { erro: texto };
    }
}

// ==========================================
// PADRONIZAR DOCUMENTOS
// ==========================================

function padronizarDocumento(doc) {

    return {
        id: doc.id,
        titulo: doc.titulo || "Documento",
        tipo: doc.tipo || "-",
        cliente: doc.cliente || "Cliente não informado",
        cliente_id: doc.cliente_id,
        processo: doc.processo || "-",
        data_envio: doc.data_envio || "",
        status: doc.status || "Pendente",
        descricao: doc.descricao || ""
    };
}

// ==========================================
// LISTAR DOCUMENTOS
// ==========================================

async function carregarDocumentos() {

    el.docs.innerHTML = `
        <tr>
            <td colspan="7" class="vazio">
                Carregando documentos...
            </td>
        </tr>
    `;

    try {

        const resposta = await fetchAuth(CONFIG.listar);

        const resultado = await lerResposta(resposta);

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Erro ao buscar documentos."
            );
        }

        const dados = Array.isArray(resultado)
            ? resultado
            : resultado.documentos || resultado.data || [];

        documentos = dados.map(padronizarDocumento);

        atualizarResumo();
        montarFiltroClientes();
        renderizarDocumentos();

    } catch (erro) {

        console.error("Erro ao carregar documentos:", erro);

        el.docs.innerHTML = `
            <tr>
                <td colspan="7" class="vazio">
                    Não foi possível carregar os documentos.
                    <br>
                    <button onclick="carregarDocumentos()">
                        Tentar novamente
                    </button>
                </td>
            </tr>
        `;
    }
}

// ==========================================
// ATUALIZAR RESUMO
// ==========================================

function atualizarResumo() {

    el.total.textContent = documentos.length;

    el.pendentes.textContent = documentos.filter(
        doc => doc.status.toLowerCase() === "pendente"
    ).length;

    el.aprovados.textContent = documentos.filter(
        doc => doc.status.toLowerCase() === "aprovado"
    ).length;
}

// ==========================================
// FILTRO DE CLIENTES
// ==========================================

function montarFiltroClientes() {

    const selecionado = el.filtro.value;

    const clientes = [
        ...new Set(
            documentos.map(doc => doc.cliente).filter(Boolean)
        )
    ].sort();

    el.filtro.innerHTML = `
        <option value="">Todos os clientes</option>
        ${clientes.map(cliente => `
            <option value="${escaparHTML(cliente)}">
                ${escaparHTML(cliente)}
            </option>
        `).join("")}
    `;

    if (clientes.includes(selecionado)) {
        el.filtro.value = selecionado;
    }
}

// ==========================================
// RENDERIZAR TABELA
// ==========================================

function renderizarDocumentos() {

    const termo = el.busca.value.trim().toLowerCase();
    const clienteSelecionado = el.filtro.value;

    const filtrados = documentos.filter(doc => {

        const correspondeBusca =
            doc.titulo.toLowerCase().includes(termo) ||
            doc.tipo.toLowerCase().includes(termo) ||
            doc.cliente.toLowerCase().includes(termo) ||
            doc.processo.toLowerCase().includes(termo);

        const correspondeCliente =
            !clienteSelecionado ||
            doc.cliente === clienteSelecionado;

        return correspondeBusca && correspondeCliente;
    });

    if (filtrados.length === 0) {

        el.docs.innerHTML = `
            <tr>
                <td colspan="7" class="vazio">
                    Nenhum documento encontrado.
                </td>
            </tr>
        `;

        return;
    }

    el.docs.innerHTML = filtrados.map(doc => {

        const statusClasse = doc.status
            .toLowerCase()
            .replace(/\s+/g, "-");

        return `
            <tr>

                <td>
                    <strong>${escaparHTML(doc.titulo)}</strong>
                </td>

                <td>
                    ${escaparHTML(doc.tipo)}
                </td>

                <td>
                    ${escaparHTML(doc.cliente)}
                </td>

                <td>
                    ${escaparHTML(doc.processo)}
                </td>

                <td>
                    ${formatarData(doc.data_envio)}
                </td>

                <td>
                    <span class="status ${escaparHTML(statusClasse)}">
                        ${escaparHTML(doc.status)}
                    </span>
                </td>

                <td class="acoes">

                    <button
                        type="button"
                        title="Visualizar"
                        onclick="visualizarDocumento('${escaparHTML(doc.id)}')">
                        <i class="fas fa-eye"></i>
                    </button>

                    <button
                        type="button"
                        title="Editar"
                        onclick="abrirEdicao('${escaparHTML(doc.id)}')">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        title="Excluir"
                        onclick="excluirDocumento('${escaparHTML(doc.id)}')">
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

function visualizarDocumento(id) {

    const doc = obterDocumento(id);

    if (!doc) return;

    el.modalTitulo.textContent = doc.titulo;
    el.modalTipo.textContent = doc.tipo;
    el.modalCliente.textContent = doc.cliente;
    el.modalProcesso.textContent = doc.processo;
    el.modalData.textContent = formatarData(doc.data_envio);
    el.modalStatus.textContent = doc.status;
    el.modalDescricao.textContent = doc.descricao || "-";

    el.modal.hidden = false;
}

function fecharModal() {
    el.modal.hidden = true;
}

// ==========================================
// ABRIR EDIÇÃO
// ==========================================

function abrirEdicao(id) {

    const doc = obterDocumento(id);

    if (!doc) return;

    el.editarId.value = doc.id;
    el.editarTitulo.value = doc.titulo;
    el.editarTipo.value = doc.tipo;
    el.editarCliente.value = doc.cliente;
    el.editarProcesso.value = doc.processo === "-" ? "" : doc.processo;
    el.editarData.value = doc.data_envio.substring(0, 10);
    el.editarStatus.value = doc.status;
    el.editarDescricao.value = doc.descricao;

    el.modalEditar.hidden = false;
}

function fecharEdicao() {
    el.modalEditar.hidden = true;
}

// ==========================================
// SALVAR EDIÇÃO
// ==========================================

el.formEditar.addEventListener("submit", async (event) => {

    event.preventDefault();

    const id = el.editarId.value;

    const dados = {

        titulo: el.editarTitulo.value.trim(),

        tipo: el.editarTipo.value,

        processo: el.editarProcesso.value.trim(),

        data_envio: el.editarData.value,

        status: el.editarStatus.value,

        descricao: el.editarDescricao.value.trim()

    };

    try {

        const resposta = await fetchAuth(
            `/documentos/${encodeURIComponent(id)}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dados)
            }
        );

        const resultado = await lerResposta(resposta);

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível atualizar."
            );
        }

        alert("Documento atualizado com sucesso!");

        fecharEdicao();

        await carregarDocumentos();

    } catch (erro) {

        console.error("Erro ao editar:", erro);

        mostrarErro(erro.message);
    }
});

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

async function excluirDocumento(id) {

    const doc = obterDocumento(id);

    if (!doc) return;

    const confirmar = confirm(
        `Deseja realmente excluir o documento "${doc.titulo}"?`
    );

    if (!confirmar) return;

    try {

        const resposta = await fetchAuth(
            `/documentos/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const resultado = await lerResposta(resposta);

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível excluir."
            );
        }

        alert("Documento excluído com sucesso!");

        await carregarDocumentos();

    } catch (erro) {

        console.error("Erro ao excluir:", erro);

        mostrarErro(erro.message);
    }
}

// ==========================================
// EVENTOS
// ==========================================

el.busca.addEventListener(
    "input",
    renderizarDocumentos
);

el.filtro.addEventListener(
    "change",
    renderizarDocumentos
);

el.fecharModal.addEventListener(
    "click",
    fecharModal
);

el.cancelarEdicao.addEventListener(
    "click",
    fecharEdicao
);

el.modal.addEventListener("click", (event) => {

    if (event.target === el.modal) {
        fecharModal();
    }

});

el.modalEditar.addEventListener("click", (event) => {

    if (event.target === el.modalEditar) {
        fecharEdicao();
    }

});

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {
        fecharModal();
        fecharEdicao();
    }

});

// ==========================================
// DISPONIBILIZAR FUNÇÕES
// ==========================================

window.carregarDocumentos = carregarDocumentos;
window.visualizarDocumento = visualizarDocumento;
window.abrirEdicao = abrirEdicao;
window.excluirDocumento = excluirDocumento;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarDocumentos();
