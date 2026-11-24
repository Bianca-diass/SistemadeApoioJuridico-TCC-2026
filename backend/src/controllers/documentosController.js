
const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");

const TIPOS_VALIDOS = [
  "Contrato",
  "Procuração",
  "RG",
  "CPF",
  "Comprovante",
  "Petição",
  "Outros"
];

const STATUS_VALIDOS = [
  "Pendente",
  "Aprovado",
  "Rejeitado",
  "Enviado"
];

const BUCKET = "documentos";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const TIPOS_ARQUIVO = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function obterUid(usuario) {
  return texto(
    usuario && (
      usuario.uid ||
      usuario.auth_user_id ||
      usuario.user_id
    )
  );
}

function obterEmail(usuario) {
  return texto(usuario && usuario.email).toLowerCase();
}

function nomeSeguro(nome) {
  return (
    texto(nome)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(-80) || "arquivo"
  );
}

// ==========================================
// BUSCAR ADVOGADO
// ==========================================

async function buscarAdvogado(uid) {
  if (!uid) return null;

  const { data, error } = await supabaseAdmin
    .from("advogados")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// ==========================================
// BUSCAR CLIENTE PELO UID OU EMAIL
// ==========================================

async function buscarCliente(usuario) {
  const uid = obterUid(usuario);
  const email = obterEmail(usuario);

  if (!uid) return null;

  // Primeiro tenta localizar pelo UID do Supabase.
  const { data: clienteUid, error: erroUid } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, auth_user_id")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (erroUid) throw erroUid;

  if (clienteUid) return clienteUid;

  // Se não encontrou pelo UID, tenta pelo e-mail autenticado.
  if (!email) return null;

  const { data: clientesEmail, error: erroEmail } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, auth_user_id")
    .ilike("email", email);

  if (erroEmail) throw erroEmail;

  if (!clientesEmail || clientesEmail.length === 0) {
    return null;
  }

  // Não escolhe entre cadastros duplicados.
  if (clientesEmail.length > 1) {
    throw new Error(
      "Existem vários cadastros com o mesmo e-mail. É necessário identificar o cadastro correto."
    );
  }

  const cliente = clientesEmail[0];

  // Vincula o UID somente se o cadastro ainda estiver sem UID.
  if (!cliente.auth_user_id) {
    const { data: atualizado, error: erroUpdate } =
      await supabaseAdmin
        .from("clientes")
        .update({
          auth_user_id: uid
        })
        .eq("id", cliente.id)
        .is("auth_user_id", null)
        .select("id, nome, auth_user_id")
        .maybeSingle();

    if (erroUpdate) throw erroUpdate;

    if (atualizado) {
      return atualizado;
    }

    // Verifica se outra operação já vinculou o cadastro.
    const { data: conferido, error: erroConferencia } =
      await supabaseAdmin
        .from("clientes")
        .select("id, nome, auth_user_id")
        .eq("id", cliente.id)
        .maybeSingle();

    if (erroConferencia) throw erroConferencia;

    if (conferido && conferido.auth_user_id === uid) {
      return conferido;
    }

    return null;
  }

  return cliente.auth_user_id === uid ? cliente : null;
}

// ==========================================
// BUSCAR ID DO CLIENTE
// ==========================================

async function buscarClienteId(uid) {
  if (!uid) return null;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();

  if (error) throw error;

  return data ? data.id : null;
}

// ==========================================
// VÍNCULOS
// ==========================================

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

async function listarIdsClientesDoAdvogado(advogadoId) {
  const { data, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId);

  if (error) throw error;

  return (data || []).map(item => item.cliente_id);
}

async function podeAcessarDocumento(uid, documento) {
  const advogado = await buscarAdvogado(uid);

  if (advogado) {
    return verificarVinculo(
      advogado.id,
      documento.cliente_id
    );
  }

  const clienteId = await buscarClienteId(uid);

  return !!clienteId &&
    String(clienteId) === String(documento.cliente_id);
}

// ==========================================
// CADASTRAR DOCUMENTO PELO ADVOGADO
// ==========================================

const cadastrarDocumento = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);
    const advogado = await buscarAdvogado(uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem cadastrar documentos."
      });
    }

    const titulo = texto(req.body.titulo);
    const tipo = texto(req.body.tipo);
    const clienteId = texto(
      req.body.clienteId || req.body.cliente_id
    );
    const processo = texto(req.body.processo);
    const descricao = texto(req.body.descricao);
    const dataEnvio = texto(
      req.body.dataEnvio || req.body.data_envio
    );
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
      cliente_id: cliente.id,
      processo,
      descricao,
      data_envio: dataEnvio,
      status,
      criado_por: uid,
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

    await criarNotificacao({
      tipo: "documento",
      titulo: "Novo documento: " + titulo,
      mensagem: processo
        ? "Seu advogado adicionou um documento ao processo " + processo + "."
        : "Seu advogado adicionou um novo documento.",
      clienteId: cliente.id
    });

    return res.status(201).json({
      mensagem: "Documento cadastrado com sucesso.",
      id: data.id
    });

  } catch (error) {
    console.error("Erro ao cadastrar documento:", error);

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
    const uid = obterUid(req.usuario);

    if (!uid) {
      return res.status(401).json({
        erro: "Usuário não autenticado."
      });
    }

    const advogado = await buscarAdvogado(uid);

    if (!advogado) {
      const cliente = await buscarCliente(req.usuario);

      if (!cliente) {
        return res.status(403).json({
          erro: "Cadastro de cliente não encontrado."
        });
      }

      const { data, error } = await supabaseAdmin
        .from("documentos")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("data_envio", { ascending: false });

      if (error) throw error;

      return res.status(200).json(data || []);
    }

    const idsClientes = await listarIdsClientesDoAdvogado(
      advogado.id
    );

    if (idsClientes.length === 0) {
      return res.status(200).json([]);
    }

    const { data, error } = await supabaseAdmin
      .from("documentos")
      .select("*")
      .in("cliente_id", idsClientes)
      .order("data_envio", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data || []);

  } catch (error) {
    console.error("Erro ao listar documentos:", error);

    return res.status(500).json({
      erro: "Erro ao listar documentos.",
      detalhes: error.message
    });
  }
};

// ==========================================
// BUSCAR DOCUMENTO POR ID
// ==========================================

const obterDocumento = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);

    const { data: documento, error } = await supabaseAdmin
      .from("documentos")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const permitido = await podeAcessarDocumento(
      uid,
      documento
    );

    if (!permitido) {
      return res.status(403).json({
        erro: "Acesso negado."
      });
    }

    return res.status(200).json(documento);

  } catch (error) {
    console.error("Erro ao buscar documento:", error);

    return res.status(500).json({
      erro: "Erro ao buscar documento."
    });
  }
};

// ==========================================
// EDITAR DOCUMENTO
// ==========================================

const editarDocumento = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);
    const advogado = await buscarAdvogado(uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem editar documentos."
      });
    }

    const { data: documento, error: erroDocumento } = await supabaseAdmin
      .from("documentos")
      .select("id, cliente_id")
      .eq("id", req.params.id)
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
      data_envio: texto(
        req.body.dataEnvio || req.body.data_envio
      ),
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
      .eq("id", req.params.id);

    if (error) throw error;

    await criarNotificacao({
      tipo: "documento",
      titulo: "Documento atualizado: " + dadosAtualizados.titulo,
      mensagem:
        "O documento foi atualizado. Status: " +
        dadosAtualizados.status + ".",
      clienteId: documento.cliente_id
    });

    return res.status(200).json({
      mensagem: "Documento atualizado com sucesso."
    });

  } catch (error) {
    console.error("Erro ao editar documento:", error);

    return res.status(500).json({
      erro: "Erro ao editar documento."
    });
  }
};

// ==========================================
// EXCLUIR DOCUMENTO
// ==========================================

const excluirDocumento = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);
    const advogado = await buscarAdvogado(uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem excluir documentos."
      });
    }

    const { data: documento, error: erroDocumento } = await supabaseAdmin
      .from("documentos")
      .select("id, cliente_id, arquivo_path")
      .eq("id", req.params.id)
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
      .eq("id", req.params.id);

    if (error) throw error;

    if (documento.arquivo_path) {
      const { error: erroArquivo } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([documento.arquivo_path]);

      if (erroArquivo) {
        console.error("Erro ao remover arquivo:", erroArquivo);
      }
    }

    return res.status(200).json({
      mensagem: "Documento excluído com sucesso."
    });

  } catch (error) {
    console.error("Erro ao excluir documento:", error);

    return res.status(500).json({
      erro: "Erro ao excluir documento."
    });
  }
};

// ==========================================
// CLIENTE ENVIA DOCUMENTO
// ==========================================

const enviarDocumentoCliente = async (req, res) => {
  let caminho = null;

  try {
    const uid = obterUid(req.usuario);

    if (!uid) {
      return res.status(401).json({
        erro: "Usuário não autenticado."
      });
    }

    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(403).json({
        erro: "Cadastro de cliente não encontrado ou existem cadastros duplicados com o mesmo e-mail."
      });
    }

    const arquivo = req.body;

    if (!Buffer.isBuffer(arquivo) || arquivo.length === 0) {
      return res.status(400).json({
        erro: "Nenhum arquivo recebido."
      });
    }

    if (arquivo.length > TAMANHO_MAXIMO) {
      return res.status(400).json({
        erro: "O arquivo deve ter no máximo 10 MB."
      });
    }

    const mime = (req.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!TIPOS_ARQUIVO.includes(mime)) {
      return res.status(400).json({
        erro: "Formato não permitido. Envie PDF, JPG, PNG, DOC ou DOCX."
      });
    }

    const titulo = texto(req.query.titulo);
    const tipo = texto(req.query.tipo);
    const processo = texto(req.query.processo);
    const nomeArquivo = nomeSeguro(req.query.nome);

    if (!titulo || !tipo) {
      return res.status(400).json({
        erro: "Informe o título e o tipo do documento."
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        erro: "Tipo de documento inválido."
      });
    }

    const { data: vinculos, error: erroVinculo } = await supabaseAdmin
      .from("advogado_clientes")
      .select("advogado_id")
      .eq("cliente_id", cliente.id)
      .limit(1);

    if (erroVinculo) throw erroVinculo;

    if (!vinculos || vinculos.length === 0) {
      return res.status(403).json({
        erro: "Você ainda não está vinculado a um advogado."
      });
    }

    caminho =
      cliente.id +
      "/" +
      Date.now() +
      "-" +
      nomeArquivo;

    const { error: erroUpload } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(caminho, arquivo, {
        contentType: mime,
        upsert: false
      });

    if (erroUpload) throw erroUpload;

    const { data, error } = await supabaseAdmin
      .from("documentos")
      .insert({
        titulo,
        tipo,
        cliente: cliente.nome || "",
        cliente_id: cliente.id,
        processo,
        descricao: "",
        data_envio: new Date().toISOString().slice(0, 10),
        status: "Enviado",
        criado_por: uid,
        origem: "cliente",
        arquivo_path: caminho,
        arquivo_tipo: mime,
        arquivo_tamanho: arquivo.length
      })
      .select("id")
      .single();

    if (error) throw error;

    await criarNotificacao({
      tipo: "envio_cliente",
      titulo: "Cliente enviou um documento",
      mensagem:
        (cliente.nome || "O cliente") +
        ' enviou "' + titulo + '"' +
        (processo ? " (processo " + processo + ")." : "."),
      clienteId: cliente.id
    });

    return res.status(201).json({
      mensagem: "Documento enviado com sucesso.",
      id: data.id
    });

  } catch (error) {
    if (caminho) {
      const { error: erroRemocao } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([caminho]);

      if (erroRemocao) {
        console.error("Erro ao remover arquivo temporário:", erroRemocao);
      }
    }

    console.error("Erro ao enviar documento do cliente:", error);

    return res.status(500).json({
      erro: "Erro ao enviar documento.",
      detalhes: error.message
    });
  }
};

// ==========================================
// BAIXAR ARQUIVO
// ==========================================

const baixarArquivo = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);

    const { data: documento, error } = await supabaseAdmin
      .from("documentos")
      .select("id, cliente_id, arquivo_path, titulo")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const permitido = await podeAcessarDocumento(
      uid,
      documento
    );

    if (!permitido) {
      return res.status(403).json({
        erro: "Acesso negado."
      });
    }

    if (!documento.arquivo_path) {
      return res.status(404).json({
        erro: "Este documento não possui arquivo anexado."
      });
    }

    // Nome do arquivo baixado: título do documento + extensão original
    // (em vez do nome interno do storage, que começa com um número).
    const extensao = (
      documento.arquivo_path.match(/\.([a-zA-Z0-9]{1,5})$/) || []
    )[1];

    let nomeDownload = nomeSeguro(documento.titulo || "documento");

    if (
      extensao &&
      !nomeDownload.toLowerCase().endsWith("." + extensao.toLowerCase())
    ) {
      nomeDownload += "." + extensao.toLowerCase();
    }

    const { data, error: erroUrl } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(documento.arquivo_path, 60, {
        download: nomeDownload
      });

    if (erroUrl) throw erroUrl;

    return res.status(200).json({
      url: data.signedUrl
    });

  } catch (error) {
    console.error("Erro ao gerar link do arquivo:", error);

    return res.status(500).json({
      erro: "Erro ao baixar arquivo."
    });
  }
};

// ==========================================
// EXPORTAÇÕES
// ==========================================

module.exports = {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento,
  enviarDocumentoCliente,
  baixarArquivo
};