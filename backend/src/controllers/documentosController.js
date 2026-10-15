const { db } = require("../config/firebase");

const COLECAO = "documentos";

const TIPOS_VALIDOS = [
  "Contrato",
  "Procuração",
  "RG",
  "CPF",
  "Comprovante",
  "Petição",
  "Outros"
];

const STATUS_VALIDOS = ["Pendente", "Aprovado", "Rejeitado"];


// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// O advogado tem um documento em "advogados" com id = uid do login
async function ehAdvogado(uid) {
  const doc = await db.collection("advogados").doc(uid).get();
  return doc.exists;
}

// O cliente com login tem documento em "clientes" com id = uid
// (ou com um campo "uid"). Devolve o id do cadastro dele.
async function idClienteDoUsuario(uid) {
  const direto = await db.collection("clientes").doc(uid).get();
  if (direto.exists) return direto.id;

  const consulta = await db
    .collection("clientes")
    .where("uid", "==", uid)
    .limit(1)
    .get();

  return consulta.empty ? null : consulta.docs[0].id;
}


// ==========================================================
// CADASTRAR (somente advogado)
// ==========================================================

const cadastrarDocumento = async (req, res) => {
  try {
    if (!(await ehAdvogado(req.usuario.uid))) {
      return res.status(403).json({
        erro: "Apenas advogados podem cadastrar documentos."
      });
    }

    const titulo = texto(req.body.titulo);
    const tipo = texto(req.body.tipo);
    const clienteId = texto(req.body.clienteId);
    const processo = texto(req.body.processo);
    const descricao = texto(req.body.descricao);
    const dataEnvio = texto(req.body.dataEnvio);
    const status = texto(req.body.status);

    if (!titulo || !tipo || !clienteId || !dataEnvio || !status) {
      return res.status(400).json({
        erro: "Preencha título, tipo, cliente, data de envio e status."
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ erro: "Tipo de documento inválido." });
    }

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: "Status inválido." });
    }

    // Confere se o cliente existe e pega o nome direto do banco
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();

    if (!clienteDoc.exists) {
      return res.status(400).json({ erro: "Cliente não encontrado." });
    }

    const documento = {
      titulo,
      tipo,
      cliente: clienteDoc.data().nome || texto(req.body.cliente),
      clienteId,
      processo,
      descricao,
      dataEnvio,
      status,
      criadoPor: req.usuario.uid,
      criadoEm: new Date()
    };

    const doc = await db.collection(COLECAO).add(documento);

    res.status(201).json({
      mensagem: "Documento cadastrado com sucesso",
      id: doc.id
    });

  } catch (error) {
    console.error("ERRO AO CADASTRAR DOCUMENTO:", error);
    res.status(500).json({ erro: error.message });
  }
};


// ==========================================================
// LISTAR
// advogado: vê todos | cliente: vê só os dele
// ==========================================================

const listarDocumentos = async (req, res) => {
  try {
    const uid = req.usuario.uid;

    let consulta = db.collection(COLECAO);

    if (!(await ehAdvogado(uid))) {
      const clienteId = await idClienteDoUsuario(uid);

      if (!clienteId) {
        return res.status(403).json({ erro: "Acesso negado." });
      }

      consulta = consulta.where("clienteId", "==", clienteId);
    }

    const snapshot = await consulta.get();

    const documentos = [];

    snapshot.forEach((doc) => {
      documentos.push({ id: doc.id, ...doc.data() });
    });

    // Mais recentes primeiro
    documentos.sort((a, b) =>
      String(b.dataEnvio || "").localeCompare(String(a.dataEnvio || ""))
    );

    res.status(200).json(documentos);

  } catch (error) {
    console.error("ERRO AO LISTAR DOCUMENTOS:", error);
    res.status(500).json({ erro: error.message });
  }
};


// ==========================================================
// BUSCAR POR ID
// ==========================================================

const obterDocumento = async (req, res) => {
  try {
    const uid = req.usuario.uid;

    const doc = await db.collection(COLECAO).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ erro: "Documento não encontrado." });
    }

    if (!(await ehAdvogado(uid))) {
      const clienteId = await idClienteDoUsuario(uid);

      if (!clienteId || doc.data().clienteId !== clienteId) {
        return res.status(403).json({ erro: "Acesso negado." });
      }
    }

    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    console.error("ERRO AO BUSCAR DOCUMENTO:", error);
    res.status(500).json({ erro: error.message });
  }
};


// ==========================================================
// EDITAR (somente advogado)
// ==========================================================

const editarDocumento = async (req, res) => {
  try {
    if (!(await ehAdvogado(req.usuario.uid))) {
      return res.status(403).json({
        erro: "Apenas advogados podem editar documentos."
      });
    }

    const ref = db.collection(COLECAO).doc(req.params.id);

    if (!(await ref.get()).exists) {
      return res.status(404).json({ erro: "Documento não encontrado." });
    }

    // Só estes campos podem ser alterados
    const dadosAtualizados = {
      titulo: texto(req.body.titulo),
      tipo: texto(req.body.tipo),
      processo: texto(req.body.processo),
      descricao: texto(req.body.descricao),
      dataEnvio: texto(req.body.dataEnvio),
      status: texto(req.body.status)
    };

    if (
      !dadosAtualizados.titulo ||
      !dadosAtualizados.tipo ||
      !dadosAtualizados.dataEnvio ||
      !dadosAtualizados.status
    ) {
      return res.status(400).json({
        erro: "Preencha título, tipo, data de envio e status."
      });
    }

    if (!TIPOS_VALIDOS.includes(dadosAtualizados.tipo)) {
      return res.status(400).json({ erro: "Tipo de documento inválido." });
    }

    if (!STATUS_VALIDOS.includes(dadosAtualizados.status)) {
      return res.status(400).json({ erro: "Status inválido." });
    }

    await ref.update(dadosAtualizados);

    res.status(200).json({ mensagem: "Documento atualizado com sucesso" });

  } catch (error) {
    console.error("ERRO AO EDITAR DOCUMENTO:", error);
    res.status(500).json({ erro: error.message });
  }
};


// ==========================================================
// EXCLUIR (somente advogado)
// ==========================================================

const excluirDocumento = async (req, res) => {
  try {
    if (!(await ehAdvogado(req.usuario.uid))) {
      return res.status(403).json({
        erro: "Apenas advogados podem excluir documentos."
      });
    }

    const ref = db.collection(COLECAO).doc(req.params.id);

    if (!(await ref.get()).exists) {
      return res.status(404).json({ erro: "Documento não encontrado." });
    }

    await ref.delete();

    res.status(200).json({ mensagem: "Documento excluído com sucesso" });

  } catch (error) {
    console.error("ERRO AO EXCLUIR DOCUMENTO:", error);
    res.status(500).json({ erro: error.message });
  }
};


module.exports = {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento
};