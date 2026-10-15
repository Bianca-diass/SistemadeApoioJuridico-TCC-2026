const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");

const {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento
} = require("../controllers/documentosController");

router.use(verificarToken);

router.post("/", cadastrarDocumento);

router.get("/", listarDocumentos);

router.get("/:id", obterDocumento);

router.put("/:id", editarDocumento);

router.delete("/:id", excluirDocumento);


module.exports = router;