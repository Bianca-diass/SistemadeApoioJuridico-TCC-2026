// ==========================================================
// SERVIÇO DE AUTENTICAÇÃO
// ==========================================================

const API = "https://sistema-apoio-juridico.onrender.com/auth";

let usuarioAtual = null;


// ==========================================================
// RECUPERAR USUÁRIO SALVO
// ==========================================================

const usuarioSalvo =
    localStorage.getItem("usuario");


if (usuarioSalvo) {

    try {

        usuarioAtual =
            JSON.parse(usuarioSalvo);

    } catch (erro) {

        console.error(
            "Erro ao recuperar usuário:",
            erro
        );

        usuarioAtual = null;

    }

}


// ==========================================================
// LER RESPOSTA DA API COM SEGURANÇA
// ==========================================================

async function lerResposta(resposta) {

    const tipo =
        resposta.headers.get(
            "content-type"
        ) || "";


    if (!tipo.includes("application/json")) {

        const texto =
            await resposta.text();


        console.error(
            "Servidor não retornou JSON:",
            texto
        );


        throw new Error(
            "O servidor não retornou JSON. Verifique se o backend está rodando na porta 3000."
        );

    }


    return await resposta.json();

}


// ==========================================================
// LOGIN
// ==========================================================

export async function fazerLogin(
    email,
    senha
) {

    localStorage.removeItem("token");


    const resposta =
        await fetch(
            `${API}/login`,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    email,
                    senha

                })

            }
        );


    const dados =
        await lerResposta(resposta);


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro no login"
        );

    }


    if (!dados.token) {

        throw new Error(
            "O servidor não retornou um token."
        );

    }


    usuarioAtual =
        dados.usuario;


    localStorage.setItem(
        "token",
        dados.token
    );


    localStorage.setItem(
        "refreshToken",
        dados.refreshToken || ""
    );


    localStorage.setItem(
        "tokenExpiraEm",

        Date.now() +
        (
            Number(
                dados.expiresIn
            ) * 1000
        )
    );


    localStorage.setItem(
        "usuario",
        JSON.stringify(
            dados.usuario
        )
    );


    return dados;

}


// ==========================================================
// CADASTRO
// ==========================================================

export async function fazerCadastro(
    email,
    senha,
    dadosExtras = {}
) {

    const resposta =
        await fetch(
            `${API}/register`,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    email,
                    senha,
                    ...dadosExtras

                })

            }
        );


    const dados =
        await lerResposta(resposta);


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro no cadastro"
        );

    }


    return dados;

}


// ==========================================================
// BUSCAR PERFIL
// ==========================================================

export async function obterMeuPerfil() {

    const token =
        getToken();


    if (!token) {

        throw new Error(
            "Usuário não está autenticado."
        );

    }


    const resposta =
        await fetch(
            `${API}/me`,
            {

                method: "GET",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                }

            }
        );


    const dados =
        await lerResposta(resposta);


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro ao carregar perfil"
        );

    }


    if (dados.usuario) {

        usuarioAtual =
            dados.usuario;


        localStorage.setItem(
            "usuario",
            JSON.stringify(
                dados.usuario
            )
        );

    }


    return dados.usuario;

}


// ==========================================================
// ATUALIZAR PERFIL
// ==========================================================

export async function atualizarMeuPerfil(
    nome,
    email,
    telefone,
    oab
) {

    const token =
        getToken();


    if (!token) {

        throw new Error(
            "Usuário não está autenticado."
        );

    }


    const resposta =
        await fetch(
            `${API}/me`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                },

                body: JSON.stringify({

                    nome,
                    email,
                    telefone,

                    // só vai no pedido quando for informada
                    oab

                })

            }
        );


    const dados =
        await lerResposta(resposta);


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro ao atualizar perfil"
        );

    }


    if (dados.usuario) {

        usuarioAtual =
            dados.usuario;


        localStorage.setItem(
            "usuario",
            JSON.stringify(
                dados.usuario
            )
        );

    }


    return dados;

}


// ==========================================================
// ALTERAR SENHA
// ==========================================================

export async function alterarSenha(
    novaSenha
) {

    const token =
        getToken();


    if (!token) {

        throw new Error(
            "Usuário não está autenticado."
        );

    }


    const resposta =
        await fetch(
            `${API}/password`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                },

                body: JSON.stringify({

                    novaSenha

                })

            }
        );


    const dados =
        await lerResposta(resposta);


    if (!resposta.ok) {

        throw new Error(
            dados.erro ||
            "Erro ao alterar senha"
        );

    }


    return dados;

}


// ==========================================================
// LOGOUT
// ==========================================================

export async function fazerLogout() {

    usuarioAtual = null;


    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "refreshToken"
    );

    localStorage.removeItem(
        "tokenExpiraEm"
    );

    localStorage.removeItem(
        "usuario"
    );

}


// ==========================================================
// TOKEN
// ==========================================================

export function getToken() {

    return localStorage.getItem(
        "token"
    );

}


// ==========================================================
// USUÁRIO
// ==========================================================

export function observarUsuario(
    callback
) {

    callback(
        usuarioAtual
    );

}