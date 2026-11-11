const {
    supabaseAdmin,
    criarClienteAnonimo
} = require("../config/supabase");


// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================

async function buscarPerfilPorAuthId(authUserId) {

    const { data: advogado, error: erroAdv } =
        await supabaseAdmin
            .from("advogados")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

    if (erroAdv) throw erroAdv;

    if (advogado) {
        return { tipo: "advogado", perfil: advogado };
    }

    const { data: cliente, error: erroCli } =
        await supabaseAdmin
            .from("clientes")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

    if (erroCli) throw erroCli;

    if (cliente) {
        return { tipo: "cliente", perfil: cliente };
    }

    return { tipo: null, perfil: null };
}

function emailJaCadastrado(error) {

    const msg = (error?.message || "").toLowerCase();

    return (
        error?.code === "email_exists" ||
        msg.includes("already been registered") ||
        msg.includes("already registered")
    );
}


// ==========================================================
// LOGIN
// ==========================================================

exports.login = async (req, res) => {

    try {

        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "Email e senha são obrigatórios"
            });
        }

        // Cliente descartável: o login não pode prender a sessão
        // no supabaseAdmin.
        const supabase = criarClienteAnonimo();

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: senha
            });

        if (error || !data?.session) {

            console.error(
                "Erro Supabase Login:",
                error?.message
            );

            return res.status(401).json({
                erro: "Email ou senha inválidos"
            });
        }

        const { tipo, perfil } =
            await buscarPerfilPorAuthId(data.user.id);

        if (!tipo) {
            return res.status(403).json({
                erro: "Perfil do usuário não encontrado."
            });
        }

        return res.json({

            mensagem: "Login realizado com sucesso",

            usuario: {
                email: data.user.email,
                tipo,
                ...perfil,
                auth_user_id: data.user.id
            },

            token: data.session.access_token,

            refreshToken: data.session.refresh_token,

            expiresIn: data.session.expires_in
        });

    } catch (error) {

        console.error("ERRO NO LOGIN:", error);

        return res.status(500).json({
            erro: "Erro ao processar login"
        });
    }
};


// ==========================================================
// CADASTRO
// ==========================================================

exports.register = async (req, res) => {

    let authUserId = null;

    try {

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
                erro: "Nome, email e senha são obrigatórios"
            });
        }

        if (String(senha).length < 6) {
            return res.status(400).json({
                erro: "A senha deve possuir pelo menos 6 caracteres"
            });
        }

        const ehCliente = tipo === "cliente";

        const emailLimpo = String(email).trim().toLowerCase();

        // 1) Cria o login no Supabase Auth
        const { data: criado, error: erroAuth } =
            await supabaseAdmin.auth.admin.createUser({
                email: emailLimpo,
                password: senha,
                email_confirm: true,
                user_metadata: { nome }
            });

        if (erroAuth) {

            if (emailJaCadastrado(erroAuth)) {
                return res.status(400).json({
                    erro: "Este email já está cadastrado"
                });
            }

            throw erroAuth;
        }

        authUserId = criado.user.id;

        // 2) Cria o perfil (todos os campos NOT NULL vão preenchidos)
        const tabela = ehCliente ? "clientes" : "advogados";

        const dadosPerfil = {
            nome: String(nome).trim(),
            email: emailLimpo,
            telefone: telefone ?? "",
            cpf: cpf ?? "",
            auth_user_id: authUserId
        };

        if (!ehCliente) {
            dadosPerfil.oab = oab ?? "";

            // advogados.id tem FK para auth.users(id): o id do
            // advogado precisa ser o mesmo id do login.
            dadosPerfil.id = authUserId;
        }

        const { data: perfil, error: erroPerfil } =
            await supabaseAdmin
                .from(tabela)
                .insert(dadosPerfil)
                .select()
                .single();

        if (erroPerfil) {

            // Desfaz o usuário do Auth para não deixar conta órfã
            await supabaseAdmin.auth.admin.deleteUser(authUserId);

            authUserId = null;

            throw erroPerfil;
        }

        return res.status(201).json({

            mensagem: ehCliente
                ? "Cliente cadastrado"
                : "Advogado cadastrado",

            id: perfil.id
        });

    } catch (error) {

        console.error("ERRO NO CADASTRO:", error);

        // Garantia extra contra conta órfã
        if (authUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(authUserId);
            } catch (e) {
                console.error("Falha ao desfazer usuário do Auth:", e);
            }
        }

        return res.status(400).json({
            erro: error.message
        });
    }
};


// ==========================================================
// PEGAR DADOS DO ADVOGADO LOGADO
// ==========================================================

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
                erro: "Perfil de advogado não encontrado"
            });
        }

        return res.json({

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
            erro: "Erro ao carregar perfil"
        });
    }
};


// ==========================================================
// ATUALIZAR PERFIL
// ==========================================================

exports.atualizarPerfil = async (req, res) => {

    try {

        const uid = req.usuario.uid;

        const { nome, email, telefone } = req.body;

        if (!nome || !email) {
            return res.status(400).json({
                erro: "Nome e email são obrigatórios"
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
                erro: "Advogado não encontrado"
            });
        }

        // Atualiza o login (Auth)
        const { error: erroAuth } =
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                email: emailLimpo,
                user_metadata: { nome }
            });

        if (erroAuth) {

            if (emailJaCadastrado(erroAuth)) {
                return res.status(400).json({
                    erro: "Este email já está sendo utilizado"
                });
            }

            if ((erroAuth.message || "").toLowerCase().includes("invalid")) {
                return res.status(400).json({
                    erro: "O email informado é inválido"
                });
            }

            throw erroAuth;
        }

        // Atualiza o perfil
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

        return res.json({

            mensagem: "Perfil atualizado com sucesso",

            usuario: {
                tipo: "advogado",
                ...atualizado
            }
        });

    } catch (error) {

        console.error("ERRO AO ATUALIZAR PERFIL:", error);

        return res.status(500).json({
            erro: "Erro ao atualizar perfil"
        });
    }
};


// ==========================================================
// ALTERAR SENHA
// ==========================================================

exports.alterarSenha = async (req, res) => {

    try {

        const uid = req.usuario.uid;

        const { novaSenha } = req.body;

        if (!novaSenha) {
            return res.status(400).json({
                erro: "Informe a nova senha"
            });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({
                erro: "A senha deve possuir pelo menos 6 caracteres"
            });
        }

        const { error } =
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                password: novaSenha
            });

        if (error) throw error;

        return res.json({
            mensagem: "Senha alterada com sucesso"
        });

    } catch (error) {

        console.error("ERRO AO ALTERAR SENHA:", error);

        return res.status(500).json({
            erro: "Erro ao alterar senha"
        });
    }
};