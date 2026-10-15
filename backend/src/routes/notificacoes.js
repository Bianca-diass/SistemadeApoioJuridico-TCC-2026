
const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/authMiddleware");

const {
  listarNotificacoes,
  criarNotificacao,
  atualizarNotificacao,
  excluirNotificacao
} = require("../controllers/notificacaoController");

router.use(verificarToken);

router.get("/", listarNotificacoes);
router.post("/", criarNotificacao);
router.put("/:id", atualizarNotificacao);
router.delete("/:id", excluirNotificacao);

module.exports = router;
