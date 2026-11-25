
import { getToken, fazerLogout } from "./authService.js";

const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://sistema-apoio-juridico.onrender.com";

const API = `${API_BASE}/clientes`;

function headers() {
    const token = getToken();

    if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...headers(),
            ...(opcoes.headers || {})
        }
    });

    const tipo = resposta.headers.get("content-type") || "";
    const dados = tipo.includes("application/json")
        ? await resposta.json()
        : {};

    if (resposta.status === 401) {
        await fazerLogout();
        window.location.href = "../../login.html";
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.message || "Erro ao acessar clientes."
        );
    }

    return dados;
}

export async function cadastrarCliente(cliente) {
    return await requisicao(API, {
        method: "POST",
        body: JSON.stringify(cliente)
    });
}

export async function listarClientes(callback) {
    const resposta = await requisicao(API);

    const clientes = Array.isArray(resposta)
        ? resposta
        : Array.isArray(resposta.clientes)
            ? resposta.clientes
            : Array.isArray(resposta.data)
                ? resposta.data
                : [];

    if (typeof callback === "function") {
        callback(clientes);
    }

    return clientes;
}

export async function buscarCliente(id) {
    if (!id) throw new Error("ID do cliente não informado.");

    return await requisicao(`${API}/${encodeURIComponent(id)}`);
}

export async function editarCliente(id, dadosAtualizados) {
    if (!id) throw new Error("ID do cliente não informado.");

    return await requisicao(`${API}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(dadosAtualizados)
    });
}

export async function excluirCliente(id) {
    if (!id) throw new Error("ID do cliente não informado.");

    return await requisicao(`${API}/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}
