const { supabaseAdmin } = require("../config/supabase");

async function verificarToken(req, res, next) {

  const authHeader = req.headers.authorization;

  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (
    req.baseUrl === "/cliente" &&
    req.path === "/eventos" &&
    req.query.token
  ) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({
      erro: "Token não fornecido"
    });
  }

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