import { getToken } from "./authService.js";


const API = "https://sistema-apoio-juridico.onrender.com/processos";


// ========================================
// AUTENTICAÇÃO
// ========================================

function authHeaders() {

    const token = getToken();


    if (!token) {

        throw new Error(
            "Usuário não está autenticado. Faça login novamente."
        );

    }


    return {

        "Content-Type": "application/json",

        "Authorization": `Bearer ${token}`

    };

}


// ========================================
// CADASTRAR PROCESSO
// ========================================

export async function cadastrarProcesso(processo) {

    const resposta = await fetch(API, {

        method: "POST",

        headers: authHeaders(),

        body: JSON.stringify(processo)

    });


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro ao cadastrar processo"
        );

    }


    return dados;

}


// ========================================
// LISTAR PROCESSOS
// ========================================

export async function listarProcessos() {

    const resposta = await fetch(API, {

        method: "GET",

        headers: authHeaders(),

        cache: "no-store"

    });


    const processos = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            processos.erro ||
            "Erro ao listar processos"
        );

    }


    console.log(
        "PROCESSOS RECEBIDOS DO BACKEND:",
        processos
    );


    if (Array.isArray(processos)) {

        return processos;

    }


    if (
        processos &&
        Array.isArray(processos.processos)
    ) {

        return processos.processos;

    }


    return [];

}


// ========================================
// EDITAR PROCESSO
// ========================================

export async function editarProcesso(
    id,
    dadosAtualizados
) {

    const resposta = await fetch(
        `${API}/${id}`,
        {

            method: "PUT",

            headers: authHeaders(),

            body: JSON.stringify(
                dadosAtualizados
            )

        }
    );


    const dados = await resposta.json();


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro ao editar processo"
        );

    }


    return dados;

}


// ========================================
// EXCLUIR PROCESSO
// ========================================

export async function excluirProcesso(id) {

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
            "Erro ao excluir processo"
        );

    }


    return dados;

}