
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

// Cadastrar documento pelo advogado
router.post("/", cadastrarDocumento);

// Cliente envia documento ao advogado
router.post(
  "/cliente",
  express.raw({
    type: () => true,
    limit: "10mb"
  }),
  enviarDocumentoCliente
);

// Listar documentos
router.get("/", listarDocumentos);

// Anexar arquivo ao documento
router.post(
  "/:id/arquivo",
  express.raw({
    type: () => true,
    limit: "10mb"
  }),
  anexarArquivo
);

// Baixar arquivo
router.get("/:id/arquivo", baixarArquivo);

// Consultar documento
router.get("/:id", obterDocumento);

// Editar documento
router.put("/:id", editarDocumento);

// Excluir documento
router.delete("/:id", excluirDocumento);

module.exports = router;
