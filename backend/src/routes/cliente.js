const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/authMiddleware");

const {
  obterPerfilCliente,
  atualizarConfiguracoesCliente
} = require("../controllers/clientePerfilController");

router.use(verificarToken);

router.get("/perfil", obterPerfilCliente);
router.put("/configuracoes", atualizarConfiguracoesCliente);

module.exports = router;