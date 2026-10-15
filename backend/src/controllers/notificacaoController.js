
const { db } = require("../config/firebase");

const COLECAO = "notificacoes";

async function listarNotificacoes(req, res) {
  try {
    const snapshot = await db
      .collection(COLECAO)
      .orderBy("dataEnvio", "desc")
      .get();

    const notificacoes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(notificacoes);
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    return res.status(500).json({
      erro: "Não foi possível listar as notificações."
    });
  }
}

async function criarNotificacao(req, res) {
  try {
    const {
      tipo = "sistema",
      titulo,
      mensagem,
      clienteId = null,
      processoId = null,
      compromissoId = null
    } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({
        erro: "Título e mensagem são obrigatórios."
      });
    }

    const agora = new Date();

    const dados = {
      tipo,
      titulo,
      mensagem,
      clienteId,
      processoId,
      compromissoId,
      lida: false,
      status: "Não Lida",
      dataEnvio: agora,
      criadoEm: agora
    };

    const documento = await db
      .collection(COLECAO)
      .add(dados);

    return res.status(201).json({
      id: documento.id,
      ...dados
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return res.status(500).json({
      erro: "Não foi possível criar a notificação."
    });
  }
}

async function atualizarNotificacao(req, res) {
  try {
    const referencia = db
      .collection(COLECAO)
      .doc(req.params.id);

    const documento = await referencia.get();

    if (!documento.exists) {
      return res.status(404).json({
        erro: "Notificação não encontrada."
      });
    }

    const { titulo, mensagem, lida, status } = req.body;
    const atualizacao = {};

    if (titulo !== undefined) atualizacao.titulo = titulo;
    if (mensagem !== undefined) atualizacao.mensagem = mensagem;
    if (lida !== undefined) {
      atualizacao.lida = lida;
      atualizacao.status = lida ? "Lida" : "Não Lida";
    } else if (status !== undefined) {
      atualizacao.status = status;
    }

    if (Object.keys(atualizacao).length === 0) {
      return res.status(400).json({
        erro: "Nenhum campo para atualizar."
      });
    }

    await referencia.update(atualizacao);

    return res.status(200).json({
      mensagem: "Notificação atualizada com sucesso."
    });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    return res.status(500).json({
      erro: "Não foi possível atualizar a notificação."
    });
  }
}

async function excluirNotificacao(req, res) {
  try {
    const referencia = db
      .collection(COLECAO)
      .doc(req.params.id);

    const documento = await referencia.get();

    if (!documento.exists) {
      return res.status(404).json({
        erro: "Notificação não encontrada."
      });
    }

    await referencia.delete();

    return res.status(200).json({
      mensagem: "Notificação excluída com sucesso."
    });
  } catch (error) {
    console.error("Erro ao excluir notificação:", error);
    return res.status(500).json({
      erro: "Não foi possível excluir a notificação."
    });
  }
}

module.exports = {
  listarNotificacoes,
  criarNotificacao,
  atualizarNotificacao,
  excluirNotificacao
};
