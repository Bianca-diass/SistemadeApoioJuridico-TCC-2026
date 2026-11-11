// backend/src/controllers/clientePerfilController.js
//
// Perfil e configurações do cliente logado.
// O cadastro do cliente fica na tabela "clientes", ligado à conta
// de login pela coluna user_id.

const {
  supabaseAdmin,
  criarClienteAnonimo
} = require("../config/supabase");

// Acha o cadastro do cliente logado (clientes.user_id = id do login)
async function buscarCliente(uid) {
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// Confere a senha atual tentando um login com ela
async function senhaAtualConfere(email, senha) {
  const supabase = criarClienteAnonimo();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  return !error;
}

exports.obterPerfilCliente = async (req, res) => {
  try {
    const { uid, email } = req.usuario;

    const cliente = await buscarCliente(uid);

    if (!cliente) {
      return res.status(404).json({
        erro: "Cadastro de cliente não encontrado."
      });
    }

    res.json({
      nome: cliente.nome || "",
      email: email || cliente.email || "",
      telefone: cliente.telefone || ""
    });

  } catch (e) {
    console.error("ERRO PERFIL CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao carregar seus dados." });
  }
};

exports.atualizarConfiguracoesCliente = async (req, res) => {
  try {
    const { uid } = req.usuario;
    const { nome, email, telefone, novaSenha, senhaAtual } = req.body;

    const cliente = await buscarCliente(uid);

    if (!cliente) {
      return res.status(404).json({
        erro: "Cadastro de cliente não encontrado."
      });
    }

    const emailAtual = req.usuario.email || "";

    const mudouEmail =
      !!email &&
      email.trim().toLowerCase() !== emailAtual.toLowerCase();

    const mudouSenha = !!novaSenha;

    if (
      mudouSenha &&
      (novaSenha.length < 8 || !/[A-Za-z]/.test(novaSenha) || !/\d/.test(novaSenha))
    ) {
      return res.status(400).json({
        erro: "A senha deve ter no mínimo 8 caracteres, com letras e números."
      });
    }

    // Trocar e-mail ou senha exige a senha atual
    if (mudouSenha || mudouEmail) {
      if (!senhaAtual) {
        return res.status(403).json({
          codigo: "REAUTH_REQUIRED",
          erro: "Informe sua senha atual."
        });
      }

      if (!(await senhaAtualConfere(emailAtual, senhaAtual))) {
        return res.status(401).json({ erro: "Senha atual incorreta." });
      }
    }

    const nomeLimpo = typeof nome === "string" ? nome.trim() : "";

    // Atualiza a conta de login
    const authUpdate = {};

    if (nomeLimpo) authUpdate.user_metadata = { nome: nomeLimpo };

    if (mudouEmail) {
      authUpdate.email = email.trim();
      authUpdate.email_confirm = true;
    }

    if (mudouSenha) authUpdate.password = novaSenha;

    if (Object.keys(authUpdate).length) {
      const authResp =
        await supabaseAdmin.auth.admin.updateUserById(uid, authUpdate);

      if (authResp.error) throw authResp.error;
    }

    // Atualiza a tabela "clientes"
    const upd = {
      atualizado_em: new Date().toISOString()
    };

    if (nomeLimpo) upd.nome = nomeLimpo;
    if (mudouEmail) upd.email = email.trim();
    if (telefone !== undefined) upd.telefone = telefone;

    const { error } = await supabaseAdmin
      .from("clientes")
      .update(upd)
      .eq("id", cliente.id);

    if (error) throw error;

    res.json({ ok: true, senhaAlterada: mudouSenha, emailAlterado: mudouEmail });

  } catch (e) {
    if (e.code === "email_exists" || e.code === "user_already_exists") {
      return res.status(409).json({ erro: "Este e-mail já está em uso." });
    }

    if (e.code === "email_address_invalid") {
      return res.status(400).json({ erro: "E-mail inválido." });
    }

    if (e.code === "weak_password") {
      return res.status(400).json({
        erro: "A senha é muito fraca. Escolha outra."
      });
    }

    console.error("ERRO CONFIG CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao salvar alterações." });
  }
};