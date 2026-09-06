const { db } = require("../config/firebase");
const { criarNotificacao } = require("../services/notificacaoService");

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

    const snapshot =
      await db
        .collection("agenda")
        .get();


    const compromissos = [];


    snapshot.forEach((doc) => {

      compromissos.push({

        id: doc.id,

        ...doc.data()

      });

    });


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
  excluirCompromisso

};