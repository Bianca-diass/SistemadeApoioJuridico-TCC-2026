
const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");

const {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento,
  enviarDocumentoCliente,
  baixarArquivo
} = require("../controllers/documentosController");

router.use(verificarToken);

router.post("/", cadastrarDocumento);

// Envio de documento pelo cliente
router.post(
  "/cliente",
  express.raw({
    type: () => true,
    limit: "10mb"
  }),
  enviarDocumentoCliente
);

// Listagem
router.get("/", listarDocumentos);

// Download do arquivo
router.get("/:id/arquivo", baixarArquivo);

// Consulta, edição e exclusão
router.get("/:id", obterDocumento);
router.put("/:id", editarDocumento);
router.delete("/:id", excluirDocumento);

module.exports = router;
