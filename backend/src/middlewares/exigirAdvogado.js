const { supabaseAdmin } = require("../config/supabase");

// Só deixa passar quem tem um registro em "advogados" com
// auth_user_id = id do login (req.usuario.uid).
// Use depois do verificarToken (precisa do req.usuario).
//
// Depois de passar:
//   req.advogado.id            = id da linha em "advogados"
//   req.advogado.auth_user_id  = id do usuário no Supabase Auth
async function exigirAdvogado(req, res, next) {

  try {

    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select("*")
      .eq("auth_user_id", req.usuario.uid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(403).json({
        erro: "Acesso permitido apenas para advogados."
      });
    }

    req.advogado = data;

    next();

  } catch (error) {

    console.error("Erro ao verificar perfil de advogado:", error);

    return res.status(500).json({
      erro: "Erro ao verificar permissão."
    });
  }
}

module.exports = exigirAdvogado;