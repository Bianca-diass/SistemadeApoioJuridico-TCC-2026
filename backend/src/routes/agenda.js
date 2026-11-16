const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/authMiddleware");
const exigirAdvogado = require("../middlewares/exigirAdvogado");

const {
  cadastrarCompromisso,
  listarCompromissos,
  atualizarCompromisso,
  excluirCompromisso
} = require("../controllers/agendaController");

const {
  listarAgendaCliente
} = require("../controllers/clienteDadosController");

// Rota do cliente (antes da proteção exclusiva do advogado)
router.get("/cliente", verificarToken, listarAgendaCliente);

// Demais rotas: somente advogado
router.use(verificarToken);
router.use(exigirAdvogado);

router.post("/", cadastrarCompromisso);
router.get("/", listarCompromissos);
router.put("/:id", atualizarCompromisso);
router.delete("/:id", excluirCompromisso);

module.exports = router;