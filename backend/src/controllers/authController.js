const {
    supabaseAdmin,
    criarClienteAnonimo
} = require("../config/supabase");

const {
    reivindicarCadastroExistente,
    unirCadastros
} = require("../utils/clienteResolver");

// ======================================================
// BUSCAR PERFIL DO USUÁRIO
// ======================================================

async function buscarPerfilPorAuthId(authUserId) {
    const { data: advogado, error: erroAdvogado } =
        await supabaseAdmin
            .from("advogados")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

    if (erroAdvogado) throw erroAdvogado;

    if (advogado) {
        return {
            tipo: "advogado",
            perfil: advogado
        };
    }

    const { data: cliente, error: erroCliente } =
        await supabaseAdmin
            .from("clientes")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

    if (erroCliente) throw erroCliente;

    if (cliente) {
        return {
            tipo: "cliente",
            perfil: cliente
        };
    }

    return {
        tipo: null,
        perfil: null
    };
}

// ======================================================
// VERIFICAR E-MAIL DUPLICADO
// ======================================================

function emailJaCadastrado(error) {
    const mensagem = (error?.message || "").toLowerCase();

    return (
        error?.code === "email_exists" ||
        mensagem.includes("already been registered") ||
        mensagem.includes("already registered")
    );
}

// ======================================================
// CADASTRO AUTOMÁTICO DO CLIENTE (SÓ COM E-MAIL CONFIRMADO)
// ======================================================
//
// O cliente só é ligado ao cadastro feito pelo advogado DEPOIS de
// confirmar o e-mail (clicar no link). Assim, ninguém consegue ver os
// processos de outra pessoa só por saber o e-mail dela.

async function garantirCadastroCliente(user) {
    if (!user || !user.email_confirmed_at) {
        return null;
    }

    const email = String(user.email || "").trim().toLowerCase();
    const meta = user.user_metadata || {};

    // Se o advogado já cadastrou este e-mail, liga a conta a esse cadastro
    // (os dados do advogado são preservados).
    const existente = await reivindicarCadastroExistente(
        email,
        user.id,
        {}
    );

    if (existente) {
        return existente;
    }

    // Se não houver cadastro prévio, cria um novo.
    const { data, error } = await supabaseAdmin
        .from("clientes")
        .insert({
            nome: String(meta.nome || email).trim(),
            email,
            telefone: meta.telefone || "",
            cpf: meta.cpf || "",
            auth_user_id: user.id
        })
        .select("*")
        .single();

    if (error) throw error;

    return data;
}

async function registrarCliente(req, res) {
    const { nome, email, senha, telefone, cpf } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Nome, email e senha são obrigatórios."
        });
    }

    if (String(senha).length < 6) {
        return res.status(400).json({
            erro: "A senha deve possuir pelo menos 6 caracteres."
        });
    }

    const emailLimpo = String(email).trim().toLowerCase();

    // signUp (e não admin.createUser) faz o Supabase ENVIAR o e-mail
    // de confirmação. A conta fica bloqueada até o clique no link.
    const supabase = criarClienteAnonimo();

    const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: {
            emailRedirectTo: process.env.URL_LOGIN_CLIENTE || undefined,
            data: {
                nome: String(nome).trim(),
                cpf: cpf ?? "",
                telefone: telefone ?? "",
                tipo: "cliente"
            }
        }
    });

    if (error) {
        if (emailJaCadastrado(error)) {
            return res.status(400).json({
                erro: "Este email já está cadastrado."
            });
        }

        if (error.code === "over_email_send_rate_limit") {
            return res.status(429).json({
                erro:
                    "Muitos e-mails enviados. Aguarde alguns minutos e " +
                    "tente novamente."
            });
        }

        console.error("ERRO NO CADASTRO DO CLIENTE:", error);

        return res.status(400).json({
            erro: error.message
        });
    }

    // E-mail já existente e confirmado: o Supabase não devolve erro
    // (para não revelar quem tem conta), só uma lista de identidades vazia.
    if (
        data?.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
    ) {
        return res.status(400).json({
            erro: "Este email já está cadastrado."
        });
    }

    return res.status(201).json({
        mensagem:
            "Cadastro criado! Enviamos um link de confirmação para o " +
            "seu e-mail. Confirme e depois faça login.",
        confirmarEmail: true
    });
}

// ======================================================
// LOGIN
// ======================================================

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "Email e senha são obrigatórios."
            });
        }

        const supabase = criarClienteAnonimo();

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: senha
            });

        if (
            error &&
            (error.code === "email_not_confirmed" ||
                /not confirmed/i.test(error.message || ""))
        ) {
            return res.status(403).json({
                erro:
                    "Confirme seu e-mail antes de entrar. Procure o " +
                    "link que enviamos para a sua caixa de entrada (e o spam)."
            });
        }

        if (error || !data?.session) {
            return res.status(401).json({
                erro: "Email ou senha inválidos."
            });
        }

        let { tipo, perfil } =
            await buscarPerfilPorAuthId(data.user.id);

        // Primeiro acesso do cliente após confirmar o e-mail: liga a
        // conta ao cadastro do advogado (ou cria um novo cadastro).
        if (!tipo && data.user.user_metadata?.tipo === "cliente") {
            const cliente = await garantirCadastroCliente(data.user);

            if (cliente) {
                tipo = "cliente";
                perfil = cliente;
            }
        }

        if (!tipo || !perfil) {
            return res.status(403).json({
                erro: "Perfil do usuário não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                ...perfil,
                email: data.user.email,
                tipo,
                auth_user_id: data.user.id
            },
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in
        });

    } catch (error) {
        console.error("ERRO NO LOGIN:", error);

        return res.status(500).json({
            erro: "Erro ao processar login."
        });
    }
};

// ======================================================
// CADASTRO
// ======================================================

exports.register = async (req, res) => {
    let authUserId = null;

    try {
        // Cliente: cadastro com confirmação de e-mail.
        if (req.body && req.body.tipo === "cliente") {
            return await registrarCliente(req, res);
        }

        const {
            nome,
            email,
            senha,
            oab,
            telefone,
            cpf,
            tipo
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: "Nome, email e senha são obrigatórios."
            });
        }

        if (String(senha).length < 6) {
            return res.status(400).json({
                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const ehCliente = tipo === "cliente";
        const emailLimpo = String(email).trim().toLowerCase();

        // Criar usuário no Supabase Auth
        const { data: criado, error: erroAuth } =
            await supabaseAdmin.auth.admin.createUser({
                email: emailLimpo,
                password: senha,
                email_confirm: true,
                user_metadata: {
                    nome
                }
            });

        if (erroAuth) {
            if (emailJaCadastrado(erroAuth)) {
                return res.status(400).json({
                    erro: "Este email já está cadastrado."
                });
            }

            throw erroAuth;
        }

        authUserId = criado.user.id;

        const tabela = ehCliente
            ? "clientes"
            : "advogados";

        const dadosPerfil = {
            nome: String(nome).trim(),
            email: emailLimpo,
            telefone: telefone ?? "",
            cpf: cpf ?? "",
            auth_user_id: authUserId
        };

        if (!ehCliente) {
            dadosPerfil.oab = oab ?? "";
            dadosPerfil.id = authUserId;
        }

        let perfil = null;
        let erroPerfil = null;

        // Aproveitar o cadastro já feito pelo advogado
        if (ehCliente) {
            try {
                perfil = await reivindicarCadastroExistente(
                    emailLimpo,
                    authUserId,
                    dadosPerfil
                );
            } catch (error) {
                erroPerfil = error;
            }
        }

        // Criar perfil somente quando não existir cadastro anterior
        if (!perfil && !erroPerfil) {
            const resposta = await supabaseAdmin
                .from(tabela)
                .insert(dadosPerfil)
                .select()
                .single();

            perfil = resposta.data;
            erroPerfil = resposta.error;
        }

        if (erroPerfil) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            authUserId = null;
            throw erroPerfil;
        }

        // Unir cadastros antigos pelo e-mail
        if (ehCliente) {
            await unirCadastros(authUserId, emailLimpo);
        }

        return res.status(201).json({
            mensagem: ehCliente
                ? "Cliente cadastrado com sucesso."
                : "Advogado cadastrado com sucesso.",
            id: perfil.id
        });

    } catch (error) {
        console.error("ERRO NO CADASTRO:", error);

        if (authUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(authUserId);
            } catch (erro) {
                console.error(
                    "Erro ao remover usuário do Auth:",
                    erro
                );
            }
        }

        return res.status(400).json({
            erro: error.message
        });
    }
};

// ======================================================
// DADOS DO ADVOGADO LOGADO
// ======================================================

exports.me = async (req, res) => {
    try {
        const uid = req.usuario.uid;

        const { data: advogado, error } =
            await supabaseAdmin
                .from("advogados")
                .select("*")
                .eq("auth_user_id", uid)
                .maybeSingle();

        if (error) throw error;

        if (!advogado) {
            return res.status(404).json({
                erro: "Perfil de advogado não encontrado."
            });
        }

        return res.status(200).json({
            usuario: {
                id: advogado.id,
                nome: advogado.nome || "",
                email: advogado.email || req.usuario.email || "",
                telefone: advogado.telefone || "",
                cpf: advogado.cpf || "",
                oab: advogado.oab || "",
                tipo: "advogado"
            }
        });

    } catch (error) {
        console.error("ERRO AO BUSCAR PERFIL:", error);

        return res.status(500).json({
            erro: "Erro ao carregar perfil."
        });
    }
};

// ======================================================
// ATUALIZAR PERFIL
// ======================================================

exports.atualizarPerfil = async (req, res) => {
    try {
        const uid = req.usuario.uid;

        const {
            nome,
            email,
            telefone
        } = req.body;

        if (!nome || !email) {
            return res.status(400).json({
                erro: "Nome e email são obrigatórios."
            });
        }

        const emailLimpo = String(email).trim().toLowerCase();

        const { data: existente, error: erroBusca } =
            await supabaseAdmin
                .from("advogados")
                .select("id")
                .eq("auth_user_id", uid)
                .maybeSingle();

        if (erroBusca) throw erroBusca;

        if (!existente) {
            return res.status(404).json({
                erro: "Advogado não encontrado."
            });
        }

        const { error: erroAuth } =
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                email: emailLimpo,
                user_metadata: {
                    nome
                }
            });

        if (erroAuth) {
            if (emailJaCadastrado(erroAuth)) {
                return res.status(400).json({
                    erro: "Este email já está sendo utilizado."
                });
            }

            throw erroAuth;
        }

        const { data: atualizado, error: erroPerfil } =
            await supabaseAdmin
                .from("advogados")
                .update({
                    nome: String(nome).trim(),
                    email: emailLimpo,
                    telefone: telefone ?? ""
                })
                .eq("id", existente.id)
                .select()
                .single();

        if (erroPerfil) throw erroPerfil;

        return res.status(200).json({
            mensagem: "Perfil atualizado com sucesso.",
            usuario: {
                tipo: "advogado",
                ...atualizado
            }
        });

    } catch (error) {
        console.error("ERRO AO ATUALIZAR PERFIL:", error);

        return res.status(500).json({
            erro: "Erro ao atualizar perfil."
        });
    }
};

// ======================================================
// ALTERAR SENHA
// ======================================================

exports.alterarSenha = async (req, res) => {
    try {
        const uid = req.usuario.uid;
        const { novaSenha } = req.body;

        if (!novaSenha) {
            return res.status(400).json({
                erro: "Informe a nova senha."
            });
        }

        if (String(novaSenha).length < 6) {
            return res.status(400).json({
                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const { error } =
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                password: novaSenha
            });

        if (error) throw error;

        return res.status(200).json({
            mensagem: "Senha alterada com sucesso."
        });

    } catch (error) {
        console.error("ERRO AO ALTERAR SENHA:", error);

        return res.status(500).json({
            erro: "Erro ao alterar senha."
        });
    }
};