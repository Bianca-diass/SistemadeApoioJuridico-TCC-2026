const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");

const {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento,
  enviarDocumentoCliente
} = require("../controllers/documentosController");

const {
  anexarArquivo,
  baixarArquivo
} = require("../controllers/documentosArquivoController");

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

// Arquivo do documento: advogado anexa, advogado e cliente baixam
router.post(
  "/:id/arquivo",
  express.raw({
    type: () => true,
    limit: "10mb"
  }),
  anexarArquivo
);

router.get("/:id/arquivo", baixarArquivo);

// Consulta, edição e exclusão
router.get("/:id", obterDocumento);
router.put("/:id", editarDocumento);
router.delete("/:id", excluirDocumento);

module.exports = router;