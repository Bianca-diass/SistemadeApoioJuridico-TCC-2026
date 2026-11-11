import { getToken } from "./authService.js";

const API = "http://localhost:3000/clientes";

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    };
}

// CADASTRAR CLIENTE
export async function cadastrarCliente(cliente) {
    const resposta = await fetch(API, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(cliente)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao cadastrar cliente");
    }

    return dados;
}

// LISTAR CLIENTES
// Mantém o mesmo formato usado em agendaService.js: recebe um callback
// e devolve uma função de "cancelar" (aqui não há listener em tempo real,
// então a função retornada não faz nada).
export async function listarClientes(callback) {
    const resposta = await fetch(API, {
        headers: authHeaders()
    });

    const clientes = await resposta.json();

    if (!resposta.ok) {
        throw new Error(clientes.erro || "Erro ao listar clientes");
    }

    callback(clientes);

    return () => {};
}

// BUSCAR UM CLIENTE PELO ID
export async function buscarCliente(id) {
    const resposta = await fetch(`${API}/${encodeURIComponent(id)}`, {
        headers: authHeaders()
    });

    const dados = await resposta.json();

    if (resposta.status === 404) {
        return null;
    }

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao buscar cliente");
    }

    return dados;
}

// EDITAR CLIENTE
export async function editarCliente(id, dadosAtualizados) {
    const resposta = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(dadosAtualizados)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao editar cliente");
    }

    return dados;
}

// EXCLUIR CLIENTE
export async function excluirCliente(id) {
    const resposta = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: authHeaders()
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao excluir cliente");
    }

    return dados;
}