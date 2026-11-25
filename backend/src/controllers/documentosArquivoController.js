// Anexar e baixar o ARQUIVO de um documento.
// Usado pelas rotas POST /documentos/:id/arquivo e GET /documentos/:id/arquivo

const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");

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
// AUXILIARES
// ==========================================

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function obterUid(usuario) {
  return texto(
    usuario && (usuario.uid || usuario.auth_user_id || usuario.user_id)
  );
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

// IDs de cadastro do cliente logado: pelo UID e, se não encontrar,
// pelo e-mail do login.
async function idsDoClienteLogado(usuario) {
  const uid = obterUid(usuario);
  const email = texto(usuario && usuario.email).toLowerCase();

  if (!uid) return [];

  const { data: porUid, error: erroUid } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .or(`auth_user_id.eq.${uid},user_id.eq.${uid}`);

  if (erroUid) throw erroUid;

  if (porUid && porUid.length > 0) {
    return porUid.map(cliente => String(cliente.id));
  }

  if (!email) return [];

  const { data: porEmail, error: erroEmail } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .ilike("email", email);

  if (erroEmail) throw erroEmail;

  return (porEmail || []).map(cliente => String(cliente.id));
}

async function podeAcessar(usuario, documento) {
  const advogado = await buscarAdvogado(obterUid(usuario));

  if (advogado) {
    return verificarVinculo(
      advogado.id,
      documento.cliente_id
    );
  }

  const ids = await idsDoClienteLogado(usuario);

  return ids.includes(String(documento.cliente_id));
}

function dataBR(valor) {
  const partes = String(valor || "").slice(0, 10).split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : "—";
}

function fichaDoDocumento(doc) {
  return [
    "SISTEMA DE APOIO JURÍDICO DIGITAL",
    "FICHA DO DOCUMENTO",
    "",
    "Título: " + (doc.titulo || "—"),
    "Tipo: " + (doc.tipo || "—"),
    "Cliente: " + (doc.cliente || "—"),
    "Processo: " + (doc.processo || "—"),
    "Data: " + dataBR(doc.data_envio),
    "Situação: " + (doc.status || "—"),
    "",
    "Descrição:",
    doc.descricao || "Sem descrição.",
    "",
    "Observação: este documento ainda não possui arquivo anexado.",
    "Esta ficha reúne as informações cadastradas no sistema."
  ].join("\r\n");
}

// ==========================================
// ANEXAR ARQUIVO (ADVOGADO)
// ==========================================

const anexarArquivo = async (req, res) => {
  let caminhoNovo = null;

  try {
    const uid = obterUid(req.usuario);
    const advogado = await buscarAdvogado(uid);

    if (!advogado) {
      return res.status(403).json({
        erro: "Apenas advogados podem anexar arquivos."
      });
    }

    const { data: documento, error: erroDoc } = await supabaseAdmin
      .from("documentos")
      .select("id, titulo, cliente_id, arquivo_path")
      .eq("id", req.params.id)
      .maybeSingle();

    if (erroDoc) throw erroDoc;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    const vinculado = await verificarVinculo(
      advogado.id,
      documento.cliente_id
    );

    if (!vinculado) {
      return res.status(403).json({
        erro: "Você não tem permissão para alterar este documento."
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

    caminhoNovo =
      documento.cliente_id +
      "/" +
      Date.now() +
      "-" +
      nomeSeguro(req.query.nome);

    const { error: erroUpload } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(caminhoNovo, arquivo, {
        contentType: mime,
        upsert: false
      });

    if (erroUpload) throw erroUpload;

    const { error: erroUpdate } = await supabaseAdmin
      .from("documentos")
      .update({
        arquivo_path: caminhoNovo,
        arquivo_tipo: mime,
        arquivo_tamanho: arquivo.length
      })
      .eq("id", documento.id);

    if (erroUpdate) throw erroUpdate;

    // Remove o arquivo antigo, caso exista.
    if (documento.arquivo_path) {
      const { error: erroRemocao } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([documento.arquivo_path]);

      if (erroRemocao) {
        console.error(
          "Erro ao remover arquivo antigo:",
          erroRemocao
        );
      }
    }

    try {
      await criarNotificacao({
        tipo: "documento",
        titulo: "Arquivo disponível: " + (documento.titulo || "documento"),
        mensagem:
          "O arquivo do documento já pode ser baixado na aba Documentos.",
        clienteId: documento.cliente_id
      });
    } catch (erroNotificacao) {
      console.error(
        "Aviso ao notificar o cliente:",
        erroNotificacao.message
      );
    }

    return res.status(200).json({
      mensagem: "Arquivo anexado com sucesso."
    });

  } catch (error) {
    if (caminhoNovo) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([caminhoNovo])
        .catch(() => {});
    }

    console.error("Erro ao anexar arquivo:", error);

    return res.status(500).json({
      erro: "Erro ao anexar arquivo.",
      detalhes: error.message
    });
  }
};

// ==========================================
// BAIXAR ARQUIVO (ADVOGADO E CLIENTE)
// ==========================================
// Resposta:
// { url, nome }   -> existe arquivo no storage
// { texto, nome } -> documento sem arquivo: devolve a ficha em texto

const baixarArquivo = async (req, res) => {
  try {
    const { data: documento, error } = await supabaseAdmin
      .from("documentos")
      .select(
        "id, cliente_id, arquivo_path, titulo, tipo, cliente, processo, descricao, data_envio, status, arquivo_tipo"
      )
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;

    if (!documento) {
      return res.status(404).json({
        erro: "Documento não encontrado."
      });
    }

    if (!(await podeAcessar(req.usuario, documento))) {
      return res.status(403).json({
        erro: "Acesso negado."
      });
    }

    const visualizar = String(req.query.visualizar || "") === "1";
    let nomeBase = nomeSeguro(documento.titulo || "documento");

    // Se não houver arquivo, disponibiliza a ficha em TXT.
    if (!documento.arquivo_path) {
      if (visualizar) {
        return res.status(404).json({
          erro: "Este documento não possui arquivo anexado."
        });
      }

      return res.status(200).json({
        texto: fichaDoDocumento(documento),
        nome:
          nomeBase.replace(/\.[a-zA-Z0-9]{1,5}$/, "") + ".txt"
      });
    }

    const extensao = (
      documento.arquivo_path.match(/\.([a-zA-Z0-9]{1,5})$/) || []
    )[1];

    if (
      extensao &&
      !nomeBase.toLowerCase().endsWith("." + extensao.toLowerCase())
    ) {
      nomeBase += "." + extensao.toLowerCase();
    }

    const opcoesDownload = visualizar
      ? undefined
      : { download: nomeBase };

    const { data, error: erroUrl } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(
        documento.arquivo_path,
        60,
        opcoesDownload
      );

    if (erroUrl) throw erroUrl;

    return res.status(200).json({
      url: data.signedUrl,
      nome: nomeBase,
      tipo: documento.arquivo_tipo || null
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
  anexarArquivo,
  baixarArquivo
};