import { getToken, fazerLogout } from "./authService.js";

const API = "http://localhost:3000/documentos";

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    };
}


// Token vencido: limpa o login e volta para a tela de entrada
async function sessaoExpirada() {
    await fazerLogout();

    window.location.href =
        window.location.pathname.includes("/cliente/")
            ? "login.html"
            : "login-adv.html";
}


// Faz a requisição e trata os erros mais comuns em um só lugar
async function requisicao(url, opcoes, mensagemErro) {

    let resposta;

    try {
        resposta = await fetch(url, {
            ...opcoes,
            headers: authHeaders()
        });
    } catch (erro) {
        throw new Error(
            "Não foi possível conectar ao servidor. " +
            "Verifique se o back-end está rodando na porta 3000."
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
        throw new Error((dados && dados.erro) || mensagemErro);
    }

    return dados;
}


// CADASTRAR DOCUMENTO
export function cadastrarDocumento(documento) {
    return requisicao(
        API,
        { method: "POST", body: JSON.stringify(documento) },
        "Erro ao cadastrar documento"
    );
}


// LISTAR DOCUMENTOS
export function listarDocumentos() {
    return requisicao(API, {}, "Erro ao listar documentos");
}


// BUSCAR DOCUMENTO POR ID
export function buscarDocumento(id) {
    return requisicao(`${API}/${id}`, {}, "Erro ao buscar documento");
}


// EDITAR DOCUMENTO
export function editarDocumento(id, dadosAtualizados) {
    return requisicao(
        `${API}/${id}`,
        { method: "PUT", body: JSON.stringify(dadosAtualizados) },
        "Erro ao editar documento"
    );
}


// EXCLUIR DOCUMENTO
export function excluirDocumento(id) {
    return requisicao(
        `${API}/${id}`,
        { method: "DELETE" },
        "Erro ao excluir documento"
    );
}

// BAIXAR ARQUIVO
// Devolve { url, nome } (arquivo no storage) ou { texto, nome } (ficha em texto).
export function obterDownloadDocumento(id) {
    return requisicao(
        `${API}/${encodeURIComponent(id)}/arquivo`,
        {},
        "Erro ao baixar documento"
    );
}


// Dispara o download no navegador a partir do que o servidor devolveu
export function iniciarDownload(dados) {
    const link = document.createElement("a");
    let urlTemporaria = null;

    if (dados.url) {
        link.href = dados.url;
    } else {
        const blob = new Blob(
            ["﻿" + (dados.texto || "")],
            { type: "text/plain;charset=utf-8" }
        );
        urlTemporaria = URL.createObjectURL(blob);
        link.href = urlTemporaria;
    }

    link.download = dados.nome || "documento";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    if (urlTemporaria) {
        setTimeout(() => URL.revokeObjectURL(urlTemporaria), 1000);
    }
}


// ANEXAR ARQUIVO A UM DOCUMENTO (advogado)
export async function anexarArquivoDocumento(id, arquivo) {

    const tipo = arquivo.type || "";

    let resposta;

    try {
        resposta = await fetch(
            `${API}/${encodeURIComponent(id)}/arquivo?nome=${encodeURIComponent(arquivo.name)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": tipo,
                    "Authorization": `Bearer ${getToken()}`
                },
                body: arquivo
            }
        );
    } catch (erro) {
        throw new Error(
            "Não foi possível conectar ao servidor. " +
            "Verifique se o back-end está rodando na porta 3000."
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
        throw new Error((dados && dados.erro) || "Erro ao anexar arquivo");
    }

    return dados;
}