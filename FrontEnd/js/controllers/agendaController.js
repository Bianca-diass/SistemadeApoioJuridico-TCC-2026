const { db } = require("../config/firebase");
const { criarNotificacao } = require("../services/notificacaoService");

// ==========================================
// QUEM ESTÁ LOGADO? (advogado ou cliente)
// ==========================================

// O advogado tem um documento em "advogados" com id = uid do login
async function ehAdvogado(uid) {
  const doc = await db.collection("advogados").doc(uid).get();
  return doc.exists;
}

// O cliente com login tem documento em "clientes" com id = uid
// (ou com um campo "uid"). Devolve os dados dele ou null.
async function buscarCliente(uid) {
  const direto = await db.collection("clientes").doc(uid).get();
  if (direto.exists) return { id: direto.id, ...direto.data() };

  const consulta = await db
    .collection("clientes")
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (consulta.empty) return null;

  return { id: consulta.docs[0].id, ...consulta.docs[0].data() };
}

// Compara nomes sem diferenciar maiúsculas, acentos e espaços extras
function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Só o advogado pode criar, alterar ou excluir compromissos
const exigirAdvogado = async (req, res, next) => {
  try {
    if (await ehAdvogado(req.usuario.uid)) return next();

    return res.status(403).json({
      erro: "Apenas advogados podem alterar a agenda."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message });
  }
};


// ==========================================
// CADASTRAR COMPROMISSO
// ==========================================

const cadastrarCompromisso = async (req, res) => {

  try {

    const {
      titulo,
      descricao,
      tipo,
      data,
      horario,
      dataPrazo,
      horaPrazo,
      cliente,
      processo,
      local,
      status,
      concluido
    } = req.body;


    const compromisso = {

      titulo: titulo || "",
      descricao: descricao || "",
      tipo: tipo || "",
      data: data || "",
      horario: horario || "",
      dataPrazo: dataPrazo || "",
      horaPrazo: horaPrazo || "",
      cliente: cliente || "",
      processo: processo || "",
      local: local || "",
      status: status || "Agendado",
      concluido: concluido === true,

      criadoEm: new Date()

    };


    const doc =
      await db
        .collection("agenda")
        .add(compromisso);


    // ==================================================
    // NOTIFICAÇÃO AUTOMÁTICA (RF007)
    // ==================================================

    const tipoNormalizado =
      String(compromisso.tipo || "").toLowerCase();

    let tituloNotificacao = "Novo compromisso cadastrado";
    let tipoNotificacao = "sistema";

    if (tipoNormalizado === "audiência" || tipoNormalizado === "audiencia") {

      tituloNotificacao = "Audiência marcada";
      tipoNotificacao = "audiencia";

    } else if (tipoNormalizado === "prazo") {

      tituloNotificacao = "Novo prazo cadastrado";
      tipoNotificacao = "prazo";

    }

    await criarNotificacao({

      tipo: tipoNotificacao,

      titulo: tituloNotificacao,

      mensagem:
        `${compromisso.titulo || "Compromisso"} - ` +
        `${compromisso.data || "data não informada"} ` +
        `às ${compromisso.horario || "--:--"}` +
        (compromisso.cliente ? ` (Cliente: ${compromisso.cliente})` : ""),

      compromissoId: doc.id

    });


    res.status(201).json({

      mensagem:
        "Compromisso cadastrado com sucesso",

      id: doc.id

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({

      erro: error.message

    });

  }

};


// ==========================================
// LISTAR COMPROMISSOS
// ==========================================

const listarCompromissos = async (req, res) => {

  try {

    const uid = req.usuario.uid;

    const advogado = await ehAdvogado(uid);

    // Quem não é advogado só pode ver os próprios compromissos
    let cliente = null;

    if (!advogado) {

      cliente = await buscarCliente(uid);

      if (!cliente) {

        return res.status(403).json({
          erro: "Acesso negado."
        });

      }

    }


    const snapshot =
      await db
        .collection("agenda")
        .get();


    let compromissos = [];


    snapshot.forEach((doc) => {

      compromissos.push({

        id: doc.id,

        ...doc.data()

      });

    });


    if (cliente) {

      const nomeCliente = normalizar(cliente.nome);

      compromissos = compromissos.filter((c) =>
        c.clienteId === cliente.id ||
        (nomeCliente && normalizar(c.cliente) === nomeCliente)
      );

    }


    res.status(200).json(
      compromissos
    );


  } catch (error) {

    console.error(error);

    res.status(500).json({

      erro: error.message

    });

  }

};


// ==========================================
// ATUALIZAR COMPROMISSO
// ==========================================

const atualizarCompromisso = async (req, res) => {

  try {

    const { id } =
      req.params;


    await db
      .collection("agenda")
      .doc(id)
      .update(req.body);


    res.status(200).json({

      mensagem:
        "Compromisso atualizado com sucesso"

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({

      erro: error.message

    });

  }

};


// ==========================================
// EXCLUIR COMPROMISSO
// ==========================================

const excluirCompromisso = async (req, res) => {

  try {

    const { id } =
      req.params;


    await db
      .collection("agenda")
      .doc(id)
      .delete();


    res.status(200).json({

      mensagem:
        "Compromisso excluído com sucesso"

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({

      erro: error.message

    });

  }

};


module.exports = {

  cadastrarCompromisso,
  listarCompromissos,
  atualizarCompromisso,
  excluirCompromisso,
  exigirAdvogado

};