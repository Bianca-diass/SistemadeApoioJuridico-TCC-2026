
const { supabaseAdmin } = require("../config/supabase");
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
      data_prazo,
      horaPrazo,
      hora_prazo,
      cliente,
      clienteId,
      cliente_id,
      processo,
      local,
      status,
      concluido
    } = req.body;

    const advogadoId = req.advogado.id;
    const clienteIdFinal = clienteId || cliente_id || null;

    // Confirma se o cliente está vinculado ao advogado.
    if (clienteIdFinal) {
      const { data: vinculo, error: erroVinculo } = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", advogadoId)
        .eq("cliente_id", clienteIdFinal)
        .maybeSingle();

      if (erroVinculo) throw erroVinculo;

      if (!vinculo) {
        return res.status(403).json({
          erro: "Este cliente não está vinculado ao seu cadastro."
        });
      }
    }

    const compromisso = {
      titulo: titulo || "",
      descricao: descricao || "",
      tipo: tipo || "",
      data: data || "",
      horario: horario || "",
      data_prazo: dataPrazo || data_prazo || null,
      hora_prazo: horaPrazo || hora_prazo || null,
      cliente: cliente || "",
      cliente_id: clienteIdFinal,
      advogado_id: advogadoId,
      processo: processo || "",
      local: local || "",
      status: status || "Agendado",
      concluido: concluido === true
    };

    const { data: novoCompromisso, error } = await supabaseAdmin
      .from("agenda")
      .insert(compromisso)
      .select("id")
      .single();

    if (error) throw error;

    let tituloNotificacao = "Novo compromisso cadastrado";
    let tipoNotificacao = "sistema";

    const tipoNormalizado = String(tipo || "").toLowerCase();

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
      clienteId: clienteIdFinal,
      compromissoId: novoCompromisso.id
    });

    return res.status(201).json({
      mensagem: "Compromisso cadastrado com sucesso",
      id: novoCompromisso.id
    });

  } catch (error) {
    console.error("Erro ao cadastrar compromisso:", error.message);

    return res.status(500).json({
      erro: "Erro ao cadastrar compromisso."
    });
  }
};

// ==========================================
// LISTAR COMPROMISSOS
// ==========================================

const listarCompromissos = async (req, res) => {
  try {
    const advogadoId = req.advogado.id;

    const { data: compromissos, error } = await supabaseAdmin
      .from("agenda")
      .select("*")
      .eq("advogado_id", advogadoId)
      .order("data", { ascending: true });

    if (error) throw error;

    return res.status(200).json(compromissos || []);

  } catch (error) {
    console.error("Erro ao listar compromissos:", error.message);

    return res.status(500).json({
      erro: "Erro ao listar compromissos."
    });
  }
};

// ==========================================
// ATUALIZAR COMPROMISSO
// ==========================================

const atualizarCompromisso = async (req, res) => {
  try {
    const { id } = req.params;
    const advogadoId = req.advogado.id;

    const camposPermitidos = {
      titulo: "titulo",
      descricao: "descricao",
      tipo: "tipo",
      data: "data",
      horario: "horario",
      dataPrazo: "data_prazo",
      data_prazo: "data_prazo",
      horaPrazo: "hora_prazo",
      hora_prazo: "hora_prazo",
      cliente: "cliente",
      clienteId: "cliente_id",
      cliente_id: "cliente_id",
      processo: "processo",
      local: "local",
      status: "status",
      concluido: "concluido"
    };

    const atualizacao = {};

    Object.entries(camposPermitidos).forEach(([campo, coluna]) => {
      if (req.body[campo] !== undefined) {
        atualizacao[coluna] = req.body[campo];
      }
    });

    if (Object.keys(atualizacao).length === 0) {
      return res.status(400).json({
        erro: "Nenhum campo válido foi informado."
      });
    }

    if (atualizacao.cliente_id) {
      const { data: vinculo, error: erroVinculo } = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", advogadoId)
        .eq("cliente_id", atualizacao.cliente_id)
        .maybeSingle();

      if (erroVinculo) throw erroVinculo;

      if (!vinculo) {
        return res.status(403).json({
          erro: "Este cliente não está vinculado ao seu cadastro."
        });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("agenda")
      .update(atualizacao)
      .eq("id", id)
      .eq("advogado_id", advogadoId)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        erro: "Compromisso não encontrado."
      });
    }

    return res.status(200).json({
      mensagem: "Compromisso atualizado com sucesso."
    });

  } catch (error) {
    console.error("Erro ao atualizar compromisso:", error.message);

    return res.status(500).json({
      erro: "Erro ao atualizar compromisso."
    });
  }
};

// ==========================================
// EXCLUIR COMPROMISSO
// ==========================================

const excluirCompromisso = async (req, res) => {
  try {
    const { id } = req.params;
    const advogadoId = req.advogado.id;

    const { data, error } = await supabaseAdmin
      .from("agenda")
      .delete()
      .eq("id", id)
      .eq("advogado_id", advogadoId)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        erro: "Compromisso não encontrado."
      });
    }

    return res.status(200).json({
      mensagem: "Compromisso excluído com sucesso."
    });

  } catch (error) {
    console.error("Erro ao excluir compromisso:", error.message);

    return res.status(500).json({
      erro: "Erro ao excluir compromisso."
    });
  }
};

module.exports = {
  cadastrarCompromisso,
  listarCompromissos,
  atualizarCompromisso,
  excluirCompromisso
};
