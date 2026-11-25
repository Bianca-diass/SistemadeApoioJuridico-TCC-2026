
const { supabaseAdmin } = require("../config/supabase");
const {
  unirCadastros,
  vincularLegado
} = require("../utils/clienteResolver");

// ==========================================================
// BUSCAR CLIENTE AUTENTICADO
// ==========================================================

async function buscarCliente(usuario) {
  if (!usuario || !usuario.uid) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    await unirCadastros(usuario.uid, usuario.email);
  } catch (error) {
    console.error("Aviso ao vincular cadastro:", error.message);
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .or(
      `auth_user_id.eq.${usuario.uid},user_id.eq.${usuario.uid}`
    )
    .limit(1);

  if (error) {
    throw error;
  }

  const cliente = data && data.length > 0
    ? data[0]
    : null;

  if (cliente) {
    await vincularLegado(cliente);
  }

  return cliente;
}

// ==========================================================
// FORMATAR OAB
// ==========================================================

function formatarOab(advogado) {
  if (!advogado) {
    return "";
  }

  // Cadastro atual: número e UF separados.
  if (advogado.oab_numero && advogado.oab_uf) {
    return `${advogado.oab_numero}/${advogado.oab_uf}`
      .toUpperCase();
  }

  // Cadastro antigo: OAB armazenada em um único campo.
  if (advogado.oab) {
    return String(advogado.oab).trim().toUpperCase();
  }

  return "";
}

// ==========================================================
// BUSCAR DADOS DOS ADVOGADOS RESPONSÁVEIS
// ==========================================================

async function buscarAdvogadosDosProcessos(processos) {
  const ids = [
    ...new Set(
      processos
        .map(processo => processo.advogado_id)
        .filter(Boolean)
        .map(String)
    )
  ];

  if (ids.length === 0) {
    return processos;
  }

  const { data: advogados, error } = await supabaseAdmin
    .from("advogados")
    .select("id, nome, oab, oab_numero, oab_uf")
    .in("id", ids);

  if (error) {
    throw error;
  }

  const mapaAdvogados = new Map(
    (advogados || []).map(advogado => [
      String(advogado.id),
      advogado
    ])
  );

  return processos.map(processo => {
    const advogado = mapaAdvogados.get(
      String(processo.advogado_id)
    );

    if (!advogado) {
      return processo;
    }

    const nome = advogado.nome || processo.advogado || "";
    const oab = formatarOab(advogado);

    // O dashboard já exibe o campo "advogado".
    // Assim, não precisamos alterar o HTML nem o JavaScript.
    const advogadoResponsavel = oab
      ? `${nome} — OAB: ${oab}`
      : nome;

    return {
      ...processo,
      advogado: advogadoResponsavel
    };
  });
}

// ==========================================================
// LISTAR PROCESSOS DO CLIENTE
// ==========================================================

exports.listarProcessosDoCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(404).json({
        sucesso: false,
        erro: "Cadastro do cliente não encontrado.",
        mensagem: "Cadastro do cliente não encontrado."
      });
    }

    const { data: processos, error } = await supabaseAdmin
      .from("processos")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("criado_em", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    // Acrescenta o nome e a OAB do advogado responsável.
    const processosComAdvogados =
      await buscarAdvogadosDosProcessos(processos || []);

    return res.status(200).json({
      sucesso: true,
      processos: processosComAdvogados
    });

  } catch (error) {
    console.error(
      "Erro ao listar processos do cliente:",
      error
    );

    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao carregar os processos.",
      mensagem: "Erro ao carregar os processos."
    });
  }
};

// ==========================================================
// LISTAR COMPROMISSOS DO CLIENTE
// ==========================================================

exports.listarCompromissosDoCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(404).json({
        sucesso: false,
        erro: "Cadastro do cliente não encontrado.",
        mensagem: "Cadastro do cliente não encontrado."
      });
    }

    const { data: compromissos, error } = await supabaseAdmin
      .from("agenda")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("data", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      sucesso: true,
      compromissos: compromissos || []
    });

  } catch (error) {
    console.error(
      "Erro ao listar compromissos do cliente:",
      error
    );

    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao carregar os compromissos.",
      mensagem: "Erro ao carregar os compromissos."
    });
  }
};

// ==========================================================
// ALIASES UTILIZADOS PELAS ROTAS
// ==========================================================

exports.listarProcessosCliente =
  exports.listarProcessosDoCliente;

exports.listarCompromissosCliente =
  exports.listarCompromissosDoCliente;
