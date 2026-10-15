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