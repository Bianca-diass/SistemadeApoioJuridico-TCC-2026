import { getToken } from "./authService.js";

const API = "http://localhost:3000/agenda";


function authHeaders() {

    const token = getToken();

    if (!token) {
        throw new Error("Token inválido ou expirado.");
    }

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}


// ==========================================
// ADICIONAR
// ==========================================

export async function adicionarCompromisso(compromisso) {

    const resposta = await fetch(API, {

        method: "POST",

        headers: authHeaders(),

        body: JSON.stringify(compromisso)

    });


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            dados.message ||
            "Erro ao adicionar compromisso."
        );

    }


    return dados;
}


// ==========================================
// LISTAR
// ==========================================

export async function listarCompromissos() {

    const resposta = await fetch(API, {

        method: "GET",

        headers: authHeaders()

    });


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            dados.message ||
            "Erro ao carregar compromissos."
        );

    }


    return dados;
}


// ==========================================
// EDITAR
// ==========================================

export async function editarCompromisso(
    id,
    compromisso
) {

    const resposta = await fetch(
        `${API}/${id}`,
        {

            method: "PUT",

            headers: authHeaders(),

            body: JSON.stringify(compromisso)

        }
    );


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            dados.message ||
            "Erro ao editar compromisso."
        );

    }


    return dados;
}


// ==========================================
// EXCLUIR
// ==========================================

export async function excluirCompromisso(id) {

    const resposta = await fetch(
        `${API}/${id}`,
        {

            method: "DELETE",

            headers: authHeaders()

        }
    );


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            dados.message ||
            "Erro ao excluir compromisso."
        );

    }


    return dados;
}