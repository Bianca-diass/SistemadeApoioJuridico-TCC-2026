
import { getToken, fazerLogout } from "./authService.js";

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

const API_BASE = [
    "localhost",
    "127.0.0.1"
].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://sistema-apoio-juridico.onrender.com";

const API = `${API_BASE}/documentos`;

// ==========================================
// AUTENTICAÇÃO
// ==========================================

function authHeaders() {
    const token = getToken();

    if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    return {
        "Authorization": `Bearer ${token}`
    };
}

// ==========================================
// TRATAR RESPOSTA
// ==========================================

async function lerResposta(resposta) {
    const tipo = resposta.headers.get("content-type") || "";

    let dados = null;

    if (tipo.includes("application/json")) {
        dados = await resposta.json();
    } else {
        const texto = await resposta.text();
        dados = { erro: texto };
    }

    if (resposta.status === 401) {
        await fazerLogout();

        const pagina = window.location.pathname.includes("/cliente/")
            ? "login.html"
            : "login-adv.html";

        window.location.href = pagina;

        throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!resposta.ok) {
        throw new Error(
            dados?.erro ||
            dados?.message ||
            `Erro na comunicação com o servidor (${resposta.status}).`
        );
    }

    return dados;
}

// ==========================================
// REQUISIÇÃO PADRÃO
// ==========================================

async function requisicao(url, opcoes = {}) {
    let resposta;

    try {
        resposta = await fetch(url, {
            ...opcoes,
            headers: {
                ...authHeaders(),
                ...(opcoes.headers || {})
            },
            cache: "no-store"
        });
    } catch (erro) {
        console.error("Erro de conexão:", erro);

        throw new Error(
            "Não foi possível conectar ao backend. Verifique se o servidor está ativo."
        );
    }

    return await lerResposta(resposta);
}

// ==========================================
// CADASTRAR DOCUMENTO
// ==========================================

export async function cadastrarDocumento(documento) {
    return requisicao(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(documento)
    });
}

// ==========================================
// LISTAR DOCUMENTOS
// ==========================================

export async function listarDocumentos() {
    const dados = await requisicao(API, {
        method: "GET"
    });

    if (Array.isArray(dados)) {
        return dados;
    }

    if (Array.isArray(dados?.documentos)) {
        return dados.documentos;
    }

    if (Array.isArray(dados?.data)) {
        return dados.data;
    }

    return [];
}

// ==========================================
// BUSCAR DOCUMENTO
// ==========================================

export async function buscarDocumento(id) {
    if (!id) {
        throw new Error("Documento não informado.");
    }

    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        { method: "GET" }
    );
}

// ==========================================
// EDITAR DOCUMENTO
// ==========================================

export async function editarDocumento(id, dadosAtualizados) {
    if (!id) {
        throw new Error("Documento não informado.");
    }

    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosAtualizados)
        }
    );
}

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

export async function excluirDocumento(id) {
    if (!id) {
        throw new Error("Documento não informado.");
    }

    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );
}

// ==========================================
// OBTER ARQUIVO
// ==========================================

export async function obterDownloadDocumento(id) {
    if (!id) {
        throw new Error("Documento não informado.");
    }

    return requisicao(
        `${API}/${encodeURIComponent(id)}/arquivo`,
        {
            method: "GET"
        }
    );
}

// ==========================================
// BAIXAR ARQUIVO
// ==========================================

export function iniciarDownload(dados) {
    if (!dados) {
        throw new Error("Arquivo não encontrado.");
    }

    if (dados.url) {
        const link = document.createElement("a");

        link.href = dados.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = dados.nome || "documento";

        document.body.appendChild(link);
        link.click();
        link.remove();

        return;
    }

    if (dados.texto !== undefined) {
        const blob = new Blob(
            ["\uFEFF" + dados.texto],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = dados.nome || "documento.txt";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        return;
    }

    throw new Error("O documento não possui arquivo disponível.");
}

// ==========================================
// ANEXAR ARQUIVO
// ==========================================

export async function anexarArquivoDocumento(id, arquivo) {
    if (!id || !arquivo) {
        throw new Error("Selecione um documento e um arquivo.");
    }

    const tiposPermitidos = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
        throw new Error("Envie PDF, JPG, PNG, DOC ou DOCX.");
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        throw new Error("O arquivo deve ter no máximo 10 MB.");
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API}/${encodeURIComponent(id)}/arquivo?nome=${encodeURIComponent(arquivo.name)}`,
            {
                method: "POST",
                headers: {
                    ...authHeaders(),
                    "Content-Type": arquivo.type
                },
                body: arquivo
            }
        );
    } catch (erro) {
        throw new Error("Não foi possível enviar o arquivo ao servidor.");
    }

    return await lerResposta(resposta);
}
