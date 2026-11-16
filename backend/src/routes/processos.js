const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/authMiddleware");
const exigirAdvogado = require("../middlewares/exigirAdvogado");

const {
  cadastrarProcesso,
  listarProcessos,
  atualizarProcesso,
  excluirProcesso
} = require("../controllers/processoController");

const {
  listarProcessosCliente
} = require("../controllers/clienteDashboardController");

// Cliente autenticado: consulta somente os próprios processos.
router.get("/cliente", verificarToken, listarProcessosCliente);

// Demais operações continuam exclusivas do advogado.
router.use(verificarToken);
router.use(exigirAdvogado);

router.post("/", cadastrarProcesso);
router.get("/", listarProcessos);
router.put("/:id", atualizarProcesso);
router.delete("/:id", excluirProcesso);

module.exports = router;