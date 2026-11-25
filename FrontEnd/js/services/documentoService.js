
import { getToken, fazerLogout } from "./authService.js";

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://sistema-apoio-juridico.onrender.com";

const API = `${API_BASE}/documentos`;

// ==========================================
// AUTENTICAÇÃO
// ==========================================

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    };
}

// ==========================================
// SESSÃO
// ==========================================

async function sessaoExpirada() {
    await fazerLogout();

    window.location.href =
        window.location.pathname.includes("/cliente/")
            ? "login.html"
            : "login-adv.html";
}

// ==========================================
// REQUISIÇÃO PADRÃO
// ==========================================

async function requisicao(
    url,
    opcoes = {},
    mensagemErro = "Erro na requisição"
) {
    let resposta;

    try {
        resposta = await fetch(url, {
            ...opcoes,
            headers: {
                ...authHeaders(),
                ...(opcoes.headers || {})
            }
        });
    } catch (erro) {
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique se o back-end está funcionando."
        );
    }

    let dados = null;

    try {
        dados = await resposta.json();
    } catch (erro) {
        dados = null;
    }

    if (resposta.status === 401) {
        await sessaoExpirada();
        throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    if (!resposta.ok) {
        throw new Error(
            (dados && dados.erro) ||
            (dados && dados.message) ||
            mensagemErro
        );
    }

    return dados;
}

// ==========================================
// CADASTRAR DOCUMENTO
// ==========================================

export function cadastrarDocumento(documento) {
    return requisicao(
        API,
        {
            method: "POST",
            body: JSON.stringify(documento)
        },
        "Erro ao cadastrar documento."
    );
}

// ==========================================
// LISTAR DOCUMENTOS
// ==========================================

export function listarDocumentos() {
    return requisicao(
        API,
        {},
        "Erro ao listar documentos."
    );
}

// ==========================================
// BUSCAR DOCUMENTO POR ID
// ==========================================

export function buscarDocumento(id) {
    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        {},
        "Erro ao buscar documento."
    );
}

// ==========================================
// EDITAR DOCUMENTO
// ==========================================

export function editarDocumento(id, dadosAtualizados) {
    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            body: JSON.stringify(dadosAtualizados)
        },
        "Erro ao editar documento."
    );
}

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

export function excluirDocumento(id) {
    return requisicao(
        `${API}/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        },
        "Erro ao excluir documento."
    );
}

// ==========================================
// OBTER DOWNLOAD DO DOCUMENTO
// ==========================================

export function obterDownloadDocumento(id) {
    return requisicao(
        `${API}/${encodeURIComponent(id)}/arquivo`,
        {},
        "Erro ao baixar documento."
    );
}

// ==========================================
// INICIAR DOWNLOAD
// ==========================================

export function iniciarDownload(dados) {
    if (!dados) {
        throw new Error("Não foi possível obter o documento.");
    }

    const link = document.createElement("a");
    let urlTemporaria = null;

    if (dados.url) {
        link.href = dados.url;
    } else if (dados.texto !== undefined) {
        const blob = new Blob(
            ["\uFEFF" + dados.texto],
            {
                type: "text/plain;charset=utf-8"
            }
        );

        urlTemporaria = URL.createObjectURL(blob);
        link.href = urlTemporaria;
    } else {
        throw new Error(
            "O arquivo não possui um endereço de download."
        );
    }

    link.download = dados.nome || "documento";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    if (urlTemporaria) {
        setTimeout(() => {
            URL.revokeObjectURL(urlTemporaria);
        }, 1000);
    }
}

// ==========================================
// ANEXAR ARQUIVO AO DOCUMENTO (ADVOGADO)
// ==========================================

export async function anexarArquivoDocumento(id, arquivo) {
    if (!id) {
        throw new Error("Documento não informado.");
    }

    if (!arquivo) {
        throw new Error("Selecione um arquivo.");
    }

    const tiposPermitidos = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
        throw new Error(
            "Formato não permitido. Envie PDF, JPG, PNG, DOC ou DOCX."
        );
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        throw new Error(
            "O arquivo deve ter no máximo 10 MB."
        );
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API}/${encodeURIComponent(id)}/arquivo?nome=${encodeURIComponent(arquivo.name)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": arquivo.type,
                    "Authorization": `Bearer ${getToken()}`
                },
                body: arquivo
            }
        );
    } catch (erro) {
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique se o back-end está funcionando."
        );
    }

    let dados = null;

    try {
        dados = await resposta.json();
    } catch (erro) {
        dados = null;
    }

    if (resposta.status === 401) {
        await sessaoExpirada();
        throw new Error(
            "Sua sessão expirou. Faça login novamente."
        );
    }

    if (!resposta.ok) {
        throw new Error(
            (dados && dados.erro) ||
            (dados && dados.message) ||
            "Erro ao anexar arquivo."
        );
    }

    return dados;
}
