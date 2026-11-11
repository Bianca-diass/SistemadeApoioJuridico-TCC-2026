
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

router.use(verificarToken);
router.use(exigirAdvogado);

router.post("/", cadastrarCompromisso);
router.get("/", listarCompromissos);
router.put("/:id", atualizarCompromisso);
router.delete("/:id", excluirCompromisso);

module.exports = router;
