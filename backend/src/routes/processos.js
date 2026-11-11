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

router.use(verificarToken); // exige login
router.use(exigirAdvogado); // e exige que o usuário seja advogado

router.post("/", cadastrarProcesso);
router.get("/", listarProcessos);
router.put("/:id", atualizarProcesso);
router.delete("/:id", excluirProcesso);

module.exports = router;