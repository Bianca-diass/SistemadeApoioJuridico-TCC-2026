const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/authMiddleware");

const {
  obterPerfilCliente,
  atualizarConfiguracoesCliente
} = require("../controllers/clientePerfilController");

const {
  listarProcessosDoCliente,
  listarCompromissosDoCliente
} = require("../controllers/clienteDashboardController");

router.use(verificarToken);

router.get("/perfil", obterPerfilCliente);
router.put("/configuracoes", atualizarConfiguracoesCliente);

router.get("/processos", listarProcessosDoCliente);
router.get("/compromissos", listarCompromissosDoCliente);

module.exports = router;