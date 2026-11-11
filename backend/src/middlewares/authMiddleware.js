const { supabaseAdmin } = require("../config/supabase");

// Valida o token (access_token do Supabase) enviado no header
// Authorization: Bearer <token> e preenche req.usuario.
//
// req.usuario.uid  = id do usuário no Supabase Auth
//                    (é o valor gravado em auth_user_id nas tabelas)
async function verificarToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token não fornecido"
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const { data, error } =
      await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {

      console.error(
        "Erro ao validar token:",
        error?.message
      );

      return res.status(401).json({
        erro: "Token inválido ou expirado"
      });
    }

    req.usuario = {
      uid: data.user.id,
      email: data.user.email
    };

    next();

  } catch (error) {

    console.error("Erro ao validar token:", error.message);

    return res.status(401).json({
      erro: "Token inválido ou expirado"
    });
  }
}

module.exports = verificarToken;