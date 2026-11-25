
const listarDocumentos = async (req, res) => {
  try {
    const uid = obterUid(req.usuario);

    if (!uid) {
      return res.status(401).json({
        erro: "Usuário não autenticado."
      });
    }

    const advogado = await buscarAdvogado(uid);

    // LISTAGEM DO CLIENTE
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

    // BUSCAR CLIENTES VINCULADOS AO ADVOGADO
    const idsClientes = await listarIdsClientesDoAdvogado(
      advogado.id
    );

    // DOCUMENTOS CADASTRADOS PELO ADVOGADO
    const { data: documentosCriados, error: erroCriados } =
      await supabaseAdmin
        .from("documentos")
        .select("*")
        .eq("criado_por", uid);

    if (erroCriados) throw erroCriados;

    // DOCUMENTOS DOS CLIENTES VINCULADOS
    let documentosClientes = [];

    if (idsClientes.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("documentos")
        .select("*")
        .in("cliente_id", idsClientes);

      if (error) throw error;

      documentosClientes = data || [];
    }

    // UNIFICAR SEM DUPLICAR
    const documentosUnificados = [
      ...(documentosCriados || []),
      ...documentosClientes
    ];

    const documentosUnicos = Array.from(
      new Map(
        documentosUnificados.map(doc => [
          String(doc.id),
          doc
        ])
      ).values()
    );

    documentosUnicos.sort((a, b) =>
      String(b.data_envio || "").localeCompare(
        String(a.data_envio || "")
      )
    );

    return res.status(200).json(documentosUnicos);

  } catch (error) {
    console.error("Erro ao listar documentos:", error);

    return res.status(500).json({
      erro: "Erro ao listar documentos.",
      detalhes: error.message
    });
  }
};

// EXPORTAÇÕES
module.exports = {
  cadastrarDocumento,
  listarDocumentos,
  obterDocumento,
  editarDocumento,
  excluirDocumento,
  enviarDocumentoCliente
};
