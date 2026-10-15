const { admin } = require("../config/firebase");

async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token não fornecido"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    req.usuario = decoded;
    next();

  } catch (error) {
    console.error("Erro ao validar token:", error.code || error.message);

    return res.status(401).json({
      erro: "Token inválido ou expirado"
    });
  }
}

module.exports = verificarToken;