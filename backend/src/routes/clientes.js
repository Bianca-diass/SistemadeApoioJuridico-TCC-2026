const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");
const exigirAdvogado = require("../middlewares/exigirAdvogado");

const {
  cadastrarCliente,
  listarClientes,
  atualizarCliente,
  excluirCliente
} = require("../controllers/clientesController");

router.use(verificarToken); // protege todas as rotas abaixo
router.use(exigirAdvogado); // e exige que o usuário seja advogado

router.post("/", cadastrarCliente);
router.get("/", listarClientes);
router.put("/:id", atualizarCliente);
router.delete("/:id", excluirCliente);

module.exports = router;