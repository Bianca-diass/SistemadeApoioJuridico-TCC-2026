
const { supabaseAdmin } = require("../config/supabase");

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

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

async function buscarAdvogado(uid) {
  const { data, error } = await supabaseAdmin
    .from("advogados")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function buscarClienteId(uid) {
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (error) throw error;

  return data ? data.id : null;
}

async function listarIdsClientesDoAdvogado(advogadoId) {
  const { data, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId);

  if (error) throw error;

  return (data || []).map((item) => item.cliente_id);
}

async function verificarVinculo(advogadoId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

// ==========================================
// CADASTRAR DOCUMENTO
// ==========================================

const cadastrarDocumento = async (req, res) => {
  try {
    const advogado = await buscarAdvogado(req.usuario.uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem cadastrar documentos."
      });
    }

    const titulo = texto(req.body.titulo);
    const tipo = texto(req.body.tipo);
    const clienteId = texto(req.body.clienteId || req.body.cliente_id);
    const processo = texto(req.body.processo);
    const descricao = texto(req.body.descricao);
    const dataEnvio = texto(req.body.dataEnvio || req.body.data_envio);
    const status = texto(req.body.status);

    if (!titulo || !tipo || !clienteId || !dataEnvio || !status) {
      return res.status(400).json({
        erro: "Preencha título, tipo, cliente, data de envio e status."
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        erro: "Tipo de documento inválido."
      });
    }

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({
        erro: "Status inválido."
      });
    }

    const possuiVinculo = await verificarVinculo(
      advogado.id,
      clienteId
    );

    if (!possuiVinculo) {
      return res.status(403).json({
        erro: "Este cliente não está vinculado ao seu cadastro."
      });
    }

    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from("clientes")
      .select("id, nome")
      .eq("id", clienteId)
      .maybeSingle();

    if (erroCliente) throw erroCliente;

    if (!cliente) {
      return res.status(404).json({
        erro: "Cliente não encontrado."
      });
    }

    const documento = {
      titulo,
      tipo,
      cliente: cliente.nome || "",
      cliente_id: clienteId,
      processo,
      descricao,
      data_envio: dataEnvio,
      status,
      criado_por: req.usuario.uid,
      origem: "advogado",
      arquivo_path: texto(req.body.arquivo_path) || null,
      arquivo_tipo: texto(req.body.arquivo_tipo) || null,
      arquivo_tamanho: req.body.arquivo_tamanho || null
    };

    const { data, error } = await supabaseAdmin
      .from("documentos")
      .insert(documento)
      .select("id")
      .single();

    if (error) throw error;

    return res.status(201).json({
      mensagem: "Documento cadastrado com sucesso.",
      id: data.id
    });

  } catch (error) {
    console.error("Erro ao cadastrar documento:", error.message);

    return res.status(500).json({
      erro: "Erro ao cadastrar documento."
    });
  }
};

// ==========================================
// LISTAR DOCUMENTOS
// ==========================================

const listarDocumentos = async (req, res) => {
  try {
    const advogado = await buscarAdvogado(req.usuario.uid);

    let consulta = supabaseAdmin
      .from("documentos")
      .select("*");

    if (advogado) {
      const idsClientes = await listarIdsClientesDoAdvogado(
        advogado.id
      );

      if (idsClientes.length === 0) {
        return res.status(200).json([]);
      }

      consulta = consulta.in("cliente_id", idsClientes);
    } else {
      const clienteId = await buscarClienteId(req.usuario.uid);

      if (!clienteId) {
        return res.status(403).json({
          erro: "Acesso negado."
        });
      }

      consulta = consulta.eq("cliente_id", clienteId);
    }

    const { data, error } = await consulta
      .order("data_envio", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data || []);

  } catch (error) {
    console.error("Erro ao listar documentos:", error.message);

    return res.status(500).json({
      erro: "Erro ao listar documentos."
    });
  }
};

// ==========================================
// BUSCAR DOCUMENTO POR ID
// ==========================================

const obterDocumento = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: documento, error } = await supabaseAdmin
      .from("documentos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const advogado = await buscarAdvogado(req.usuario.uid);

    if (advogado) {
      const possuiVinculo = await verificarVinculo(
        advogado.id,
        documento.cliente_id
      );

      if (!possuiVinculo) {
        return res.status(403).json({
          erro: "Acesso negado."
        });
      }
    } else {
      const clienteId = await buscarClienteId(req.usuario.uid);

      if (!clienteId || documento.cliente_id !== clienteId) {
        return res.status(403).json({
          erro: "Acesso negado."
        });
      }
    }

    return res.status(200).json(documento);

  } catch (error) {
    console.error("Erro ao buscar documento:", error.message);

    return res.status(500).json({
      erro: "Erro ao buscar documento."
    });
  }
};

// ==========================================
// EDITAR DOCUMENTO (SOMENTE ADVOGADO)
// ==========================================

const editarDocumento = async (req, res) => {
  try {
    const advogado = await buscarAdvogado(req.usuario.uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem editar documentos."
      });
    }

    const { id } = req.params;

    const { data: documento, error: erroDocumento } = await supabaseAdmin
      .from("documentos")
      .select("id, cliente_id")
      .eq("id", id)
      .maybeSingle();

    if (erroDocumento) throw erroDocumento;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const possuiVinculo = await verificarVinculo(
      advogado.id,
      documento.cliente_id
    );

    if (!possuiVinculo) {
      return res.status(403).json({
        erro: "Você não tem permissão para editar este documento."
      });
    }

    const dadosAtualizados = {
      titulo: texto(req.body.titulo),
      tipo: texto(req.body.tipo),
      processo: texto(req.body.processo),
      descricao: texto(req.body.descricao),
      data_envio: texto(req.body.dataEnvio || req.body.data_envio),
      status: texto(req.body.status)
    };

    if (
      !dadosAtualizados.titulo ||
      !dadosAtualizados.tipo ||
      !dadosAtualizados.data_envio ||
      !dadosAtualizados.status
    ) {
      return res.status(400).json({
        erro: "Preencha título, tipo, data de envio e status."
      });
    }

    if (!TIPOS_VALIDOS.includes(dadosAtualizados.tipo)) {
      return res.status(400).json({
        erro: "Tipo de documento inválido."
      });
    }

    if (!STATUS_VALIDOS.includes(dadosAtualizados.status)) {
      return res.status(400).json({
        erro: "Status inválido."
      });
    }

    const { error } = await supabaseAdmin
      .from("documentos")
      .update(dadosAtualizados)
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      mensagem: "Documento atualizado com sucesso."
    });

  } catch (error) {
    console.error("Erro ao editar documento:", error.message);

    return res.status(500).json({
      erro: "Erro ao editar documento."
    });
  }
};

// ==========================================
// EXCLUIR DOCUMENTO (SOMENTE ADVOGADO)
// ==========================================

const excluirDocumento = async (req, res) => {
  try {
    const advogado = await buscarAdvogado(req.usuario.uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem excluir documentos."
      });
    }

    const { id } = req.params;

    const { data: documento, error: erroDocumento } = await supabaseAdmin
      .from("documentos")
      .select("id, cliente_id")
      .eq("id", id)
      .maybeSingle();

    if (erroDocumento) throw erroDocumento;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const possuiVinculo = await verificarVinculo(
      advogado.id,
      documento.cliente_id
    );

    if (!possuiVinculo) {
      return res.status(403).json({
        erro: "Você não tem permissão para excluir este documento."
      });
    }

    const { error } = await supabaseAdmin
      .from("documentos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      mensagem: "Documento excluído com sucesso."
    });

  } catch (error) {
    console.error("Erro ao excluir documento:", error.message);

    return res.status(500).json({
      erro: "Erro ao excluir documento."
    });
  }
};

module.exports = {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento
};
