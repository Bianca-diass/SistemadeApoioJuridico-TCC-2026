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

const {
  eventosCliente
} = require("../controllers/clienteDadosController");

router.use(verificarToken);

router.get("/perfil", obterPerfilCliente);
router.put("/configuracoes", atualizarConfiguracoesCliente);

router.get("/processos", listarProcessosDoCliente);
router.get("/compromissos", listarCompromissosDoCliente);

// Atualização em tempo real (Server-Sent Events).
// O navegador não envia cabeçalho no EventSource, então o
// authMiddleware aceita o token em ?token= somente nesta rota.
router.get("/eventos", eventosCliente);

module.exports = router;