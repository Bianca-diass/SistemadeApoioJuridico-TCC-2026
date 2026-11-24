const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");
const { emitir } = require("../services/eventosService");
const {
  buscarClienteVinculado,
  normalizarTexto
} = require("../utils/vinculoCliente");

// ==========================================
// AUXILIARES
// ==========================================

function dataBR(valor) {
  const m = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (valor || "data não informada");
}

// Define título/tipo da notificação conforme o tipo do compromisso.
function dadosNotificacao(tipo, acao) {
  const t = normalizarTexto(tipo);

  const rotulos = {
    audiencia: { nome: "Audiência", artigo: "a", tipo: "audiencia" },
    prazo: { nome: "Prazo", artigo: "o", tipo: "prazo" },
    reuniao: { nome: "Reunião", artigo: "a", tipo: "sistema" },
    consulta: { nome: "Consulta", artigo: "a", tipo: "sistema" },
    contrato: { nome: "Contrato", artigo: "o", tipo: "sistema" }
  };

  const r = rotulos[t] || {
    nome: "Compromisso",
    artigo: "o",
    tipo: "sistema"
  };

  const feminino = r.artigo === "a";

  const titulos = {
    criado: `${r.nome} ${feminino ? "marcada" : "marcado"}`,
    atualizado: `${r.nome} ${feminino ? "atualizada" : "atualizado"}`,
    cancelado: `${r.nome} ${feminino ? "cancelada" : "cancelado"}`,
    removido: `${r.nome} ${feminino ? "removida" : "removido"} da agenda`
  };

  return { titulo: titulos[acao], tipo: r.tipo };
}

function montarMensagem(c) {
  return (
    `${c.titulo || "Compromisso"} - ` +
    `${dataBR(c.data)} ` +
    `às ${String(c.horario || "--:--").substring(0, 5)}` +
    (c.local ? ` - Local: ${c.local}` : "")
  );
}

// Campos cuja mudança merece avisar o cliente.
const CAMPOS_MONITORADOS = [
  "titulo",
  "descricao",
  "tipo",
  "data",
  "horario",
  "data_prazo",
  "hora_prazo",
  "local",
  "status",
  "processo"
];

function vazioParaNulo(valor) {
  return valor === "" || valor === undefined ? null : valor;
}

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

    if (!titulo || !String(titulo).trim() || !data) {
      return res.status(400).json({
        erro: "Informe o título e a data do compromisso."
      });
    }

    const advogadoId = req.advogado.id;

    const clienteVinculado = await buscarClienteVinculado(advogadoId, {
      clienteId: clienteId || cliente_id,
      nome: cliente
    });

    const clienteIdFinal = clienteVinculado ? clienteVinculado.id : null;

    const compromisso = {
      titulo: String(titulo).trim(),
      descricao: descricao || "",
      tipo: tipo || "",
      data: data || "",
      horario: horario || "",
      data_prazo: vazioParaNulo(dataPrazo || data_prazo),
      hora_prazo: vazioParaNulo(horaPrazo || hora_prazo),
      cliente: clienteVinculado ? clienteVinculado.nome : (cliente || ""),
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

    const notificacao = dadosNotificacao(compromisso.tipo, "criado");

    await criarNotificacao({
      tipo: notificacao.tipo,
      titulo: notificacao.titulo,
      mensagem: montarMensagem(compromisso),
      clienteId: clienteIdFinal,
      compromissoId: novoCompromisso.id
    });

    // Avisa o navegador do cliente para recarregar a agenda na hora.
    emitir(clienteIdFinal, "agenda");

    return res.status(201).json({
      mensagem: "Compromisso cadastrado com sucesso",
      id: novoCompromisso.id,
      vinculado: Boolean(clienteIdFinal)
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

    if (atualizacao.data_prazo !== undefined) {
      atualizacao.data_prazo = vazioParaNulo(atualizacao.data_prazo);
    }

    if (atualizacao.hora_prazo !== undefined) {
      atualizacao.hora_prazo = vazioParaNulo(atualizacao.hora_prazo);
    }

    const clienteIdInformado =
      req.body.clienteId !== undefined
        ? req.body.clienteId
        : req.body.cliente_id;

    const mexeuNoCliente =
      atualizacao.cliente !== undefined ||
      clienteIdInformado !== undefined;

    if (
      Object.keys(atualizacao).length === 0 &&
      !mexeuNoCliente
    ) {
      return res.status(400).json({
        erro: "Nenhum campo válido foi informado."
      });
    }

    const { data: atual, error: erroAtual } = await supabaseAdmin
      .from("agenda")
      .select("*")
      .eq("id", id)
      .eq("advogado_id", advogadoId)
      .maybeSingle();

    if (erroAtual) throw erroAtual;

    if (!atual) {
      return res.status(404).json({
        erro: "Compromisso não encontrado."
      });
    }

    // Recalcula o vínculo com o cliente quando necessário.
    if (mexeuNoCliente || !atual.cliente_id) {
      const nomeBusca =
        atualizacao.cliente !== undefined
          ? atualizacao.cliente
          : atual.cliente;

      const vinculado = await buscarClienteVinculado(advogadoId, {
        clienteId: clienteIdInformado,
        nome: nomeBusca
      });

      if (vinculado) {
        atualizacao.cliente_id = vinculado.id;
        atualizacao.cliente = vinculado.nome;
      } else if (mexeuNoCliente) {
        // O advogado trocou/limpou o cliente: desfaz o vínculo antigo.
        atualizacao.cliente_id = null;
      }
    }

    // Se a data/hora mudou, o lembrete automático deve valer de novo.
    const mudouHorario =
      (atualizacao.data !== undefined && atualizacao.data !== atual.data) ||
      (atualizacao.horario !== undefined && atualizacao.horario !== atual.horario);

    if (mudouHorario) {
      atualizacao.lembrete_enviado = false;
    }

    const { data, error } = await supabaseAdmin
      .from("agenda")
      .update(atualizacao)
      .eq("id", id)
      .eq("advogado_id", advogadoId)
      .select("*");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        erro: "Compromisso não encontrado."
      });
    }

    const novo = data[0];

    const algoMudou = CAMPOS_MONITORADOS.some(
      campo => String(novo[campo] ?? "") !== String(atual[campo] ?? "")
    );

    const trocouCliente =
      String(novo.cliente_id ?? "") !== String(atual.cliente_id ?? "");

    // Cliente novo: avisa que o compromisso foi marcado para ele.
    if (novo.cliente_id && (algoMudou || trocouCliente)) {
      const cancelado =
        normalizarTexto(novo.status) === "cancelado" &&
        normalizarTexto(atual.status) !== "cancelado";

      const acao = trocouCliente
        ? "criado"
        : (cancelado ? "cancelado" : "atualizado");

      const notificacao = dadosNotificacao(novo.tipo, acao);

      await criarNotificacao({
        tipo: notificacao.tipo,
        titulo: notificacao.titulo,
        mensagem: montarMensagem(novo),
        clienteId: novo.cliente_id,
        compromissoId: novo.id
      });
    }

    // Cliente antigo (se mudou): avisa que saiu da agenda dele.
    if (trocouCliente && atual.cliente_id) {
      const notificacao = dadosNotificacao(atual.tipo, "removido");

      await criarNotificacao({
        tipo: notificacao.tipo,
        titulo: notificacao.titulo,
        mensagem: montarMensagem(atual),
        clienteId: atual.cliente_id
      });
    }

    emitir(novo.cliente_id, "agenda");

    if (trocouCliente) {
      emitir(atual.cliente_id, "agenda");
    }

    return res.status(200).json({
      mensagem: "Compromisso atualizado com sucesso.",
      vinculado: Boolean(novo.cliente_id)
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

    const { data: atual, error: erroAtual } = await supabaseAdmin
      .from("agenda")
      .select("*")
      .eq("id", id)
      .eq("advogado_id", advogadoId)
      .maybeSingle();

    if (erroAtual) throw erroAtual;

    if (!atual) {
      return res.status(404).json({
        erro: "Compromisso não encontrado."
      });
    }

    // Mantém o histórico de notificações, mas solta a referência
    // ao compromisso (evita erro de chave estrangeira ao excluir).
    const { error: erroNotificacoes } = await supabaseAdmin
      .from("notificacoes")
      .update({ compromisso_id: null })
      .eq("compromisso_id", id);

    if (erroNotificacoes) throw erroNotificacoes;

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

    if (atual.cliente_id) {
      const notificacao = dadosNotificacao(atual.tipo, "removido");

      await criarNotificacao({
        tipo: notificacao.tipo,
        titulo: notificacao.titulo,
        mensagem: montarMensagem(atual),
        clienteId: atual.cliente_id
      });

      emitir(atual.cliente_id, "agenda");
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