
const { supabaseAdmin } = require("../config/supabase");

// Identifica se o usuário autenticado é advogado ou cliente.
async function buscarPerfil(usuarioId) {
  const { data: advogado, error: erroAdvogado } = await supabaseAdmin
    .from("advogados")
    .select("id, nome, auth_user_id")
    .eq("auth_user_id", usuarioId)
    .maybeSingle();

  if (erroAdvogado) throw erroAdvogado;

  if (advogado) {
    return { tipo: "advogado", perfil: advogado };
  }

  const { data: cliente, error: erroCliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, auth_user_id, user_id")
    .or(`auth_user_id.eq.${usuarioId},user_id.eq.${usuarioId}`)
    .maybeSingle();

  if (erroCliente) throw erroCliente;

  if (cliente) {
    return { tipo: "cliente", perfil: cliente };
  }

  return null;
}

// Confirma se o advogado possui vínculo com o cliente.
async function verificarVinculoAdvogado(advogadoId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("id")
    .eq("advogado_id", advogadoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

// Confirma se processo e compromisso pertencem ao cliente informado.
async function validarReferencias(clienteId, processoId, compromissoId) {
  if (processoId) {
    const { data, error } = await supabaseAdmin
      .from("processos")
      .select("id")
      .eq("id", processoId)
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;
  }

  if (compromissoId) {
    const { data, error } = await supabaseAdmin
      .from("agenda")
      .select("id")
      .eq("id", compromissoId)
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;
  }

  return true;
}

// Lista somente as notificações permitidas para o usuário.
async function listarNotificacoes(req, res) {
  try {
    const usuario = await buscarPerfil(req.usuario.uid);

    if (!usuario) {
      return res.status(403).json({
        erro: "Perfil de usuário não encontrado."
      });
    }

    let consulta = supabaseAdmin
      .from("notificacoes")
      .select("*")
      .order("data_envio", { ascending: false });

    if (usuario.tipo === "cliente") {
      consulta = consulta.eq("cliente_id", usuario.perfil.id);
    } else {
      const { data: vinculos, error } = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", usuario.perfil.id);

      if (error) throw error;

      const clientesIds = (vinculos || []).map(v => v.cliente_id);

      if (clientesIds.length === 0) {
        return res.status(200).json([]);
      }

      consulta = consulta.in("cliente_id", clientesIds);
    }

    const { data, error } = await consulta;

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (error) {
    console.error("Erro ao listar notificações:", error);

    return res.status(500).json({
      erro: "Não foi possível listar as notificações."
    });
  }
}

// Cria uma notificação para um cliente autorizado.
async function criarNotificacao(req, res) {
  try {
    const usuario = await buscarPerfil(req.usuario.uid);

    if (!usuario) {
      return res.status(403).json({
        erro: "Perfil de usuário não encontrado."
      });
    }

    const {
      tipo = "sistema",
      titulo,
      mensagem,
      clienteId,
      cliente_id,
      processoId,
      processo_id,
      compromissoId,
      compromisso_id
    } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({
        erro: "Título e mensagem são obrigatórios."
      });
    }

    let clienteIdFinal;

    if (usuario.tipo === "cliente") {
      clienteIdFinal = usuario.perfil.id;

      if (
        (clienteId && clienteId !== clienteIdFinal) ||
        (cliente_id && cliente_id !== clienteIdFinal)
      ) {
        return res.status(403).json({
          erro: "Você não pode criar notificações para outro cliente."
        });
      }
    } else {
      clienteIdFinal = clienteId || cliente_id;

      if (!clienteIdFinal) {
        return res.status(400).json({
          erro: "Informe o cliente da notificação."
        });
      }

      const vinculado = await verificarVinculoAdvogado(
        usuario.perfil.id,
        clienteIdFinal
      );

      if (!vinculado) {
        return res.status(403).json({
          erro: "Este cliente não está vinculado ao advogado."
        });
      }
    }

    const processoIdFinal = processoId || processo_id || null;
    const compromissoIdFinal = compromissoId || compromisso_id || null;

    const referenciasValidas = await validarReferencias(
      clienteIdFinal,
      processoIdFinal,
      compromissoIdFinal
    );

    if (!referenciasValidas) {
      return res.status(400).json({
        erro: "O processo ou compromisso não pertence ao cliente informado."
      });
    }

    const agora = new Date().toISOString();

    const dados = {
      tipo,
      titulo,
      mensagem,
      cliente_id: clienteIdFinal,
      processo_id: processoIdFinal,
      compromisso_id: compromissoIdFinal,
      lida: false,
      status: "Não Lida",
      data_envio: agora,
      criado_em: agora
    };

    const { data, error } = await supabaseAdmin
      .from("notificacoes")
      .insert(dados)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);

    return res.status(500).json({
      erro: "Não foi possível criar a notificação."
    });
  }
}

// Atualiza somente uma notificação pertencente ao usuário.
async function atualizarNotificacao(req, res) {
  try {
    const usuario = await buscarPerfil(req.usuario.uid);

    if (!usuario) {
      return res.status(403).json({
        erro: "Perfil de usuário não encontrado."
      });
    }

    let consulta = supabaseAdmin
      .from("notificacoes")
      .select("id, cliente_id")
      .eq("id", req.params.id);

    if (usuario.tipo === "cliente") {
      consulta = consulta.eq("cliente_id", usuario.perfil.id);
    } else {
      const vinculos = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", usuario.perfil.id);

      if (vinculos.error) throw vinculos.error;

      const clientesIds = (vinculos.data || []).map(v => v.cliente_id);

      if (clientesIds.length === 0) {
        return res.status(404).json({
          erro: "Notificação não encontrada."
        });
      }

      consulta = consulta.in("cliente_id", clientesIds);
    }

    const { data: notificacao, error: erroBusca } = await consulta.maybeSingle();

    if (erroBusca) throw erroBusca;

    if (!notificacao) {
      return res.status(404).json({
        erro: "Notificação não encontrada."
      });
    }

    const { titulo, mensagem, lida, status } = req.body;
    const atualizacao = {};

    if (titulo !== undefined) atualizacao.titulo = titulo;
    if (mensagem !== undefined) atualizacao.mensagem = mensagem;

    if (lida !== undefined) {
      if (typeof lida !== "boolean") {
        return res.status(400).json({
          erro: "O campo lida deve ser verdadeiro ou falso."
        });
      }

      atualizacao.lida = lida;
      atualizacao.status = lida ? "Lida" : "Não Lida";
    } else if (status !== undefined) {
      atualizacao.status = status;
      atualizacao.lida = status === "Lida";
    }

    if (Object.keys(atualizacao).length === 0) {
      return res.status(400).json({
        erro: "Nenhum campo para atualizar."
      });
    }

    const { error } = await supabaseAdmin
      .from("notificacoes")
      .update(atualizacao)
      .eq("id", notificacao.id);

    if (error) throw error;

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

// Exclui somente uma notificação pertencente ao usuário.
async function excluirNotificacao(req, res) {
  try {
    const usuario = await buscarPerfil(req.usuario.uid);

    if (!usuario) {
      return res.status(403).json({
        erro: "Perfil de usuário não encontrado."
      });
    }

    let consulta = supabaseAdmin
      .from("notificacoes")
      .delete()
      .eq("id", req.params.id);

    if (usuario.tipo === "cliente") {
      consulta = consulta.eq("cliente_id", usuario.perfil.id);
    } else {
      const { data: vinculos, error } = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", usuario.perfil.id);

      if (error) throw error;

      const clientesIds = (vinculos || []).map(v => v.cliente_id);

      if (clientesIds.length === 0) {
        return res.status(404).json({
          erro: "Notificação não encontrada."
        });
      }

      consulta = consulta.in("cliente_id", clientesIds);
    }

    const { data, error } = await consulta.select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        erro: "Notificação não encontrada."
      });
    }

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
