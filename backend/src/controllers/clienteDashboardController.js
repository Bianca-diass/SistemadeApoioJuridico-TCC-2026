const { supabaseAdmin } = require("../config/supabase");
const { normalizarTexto } = require("../utils/vinculoCliente");

async function buscarCliente(uid) {
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .or(`auth_user_id.eq.${uid},user_id.eq.${uid}`)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function advogadosDoCliente(clienteId) {
  const { data, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("advogado_id")
    .eq("cliente_id", clienteId);

  if (error) throw error;

  return (data || []).map((v) => v.advogado_id);
}

async function buscarDoCliente(tabela, cliente) {
  const { data: diretos, error } = await supabaseAdmin
    .from(tabela)
    .select("*")
    .eq("cliente_id", cliente.id);

  if (error) throw error;

  let resultado = diretos || [];

  const advogados = await advogadosDoCliente(cliente.id);
  const nomeCliente = normalizarTexto(cliente.nome);

  if (advogados.length > 0 && nomeCliente) {
    const { data: semVinculo, error: erroSemVinculo } = await supabaseAdmin
      .from(tabela)
      .select("*")
      .is("cliente_id", null)
      .in("advogado_id", advogados);

    if (erroSemVinculo) throw erroSemVinculo;

    const doMesmoNome = (semVinculo || []).filter(
      (linha) => normalizarTexto(linha.cliente) === nomeCliente
    );

    resultado = resultado.concat(doMesmoNome);
  }

  return resultado;
}

function ordenarPorData(lista, campo) {
  return lista.sort((a, b) =>
    String(b[campo] || "").localeCompare(String(a[campo] || ""))
  );
}

exports.listarProcessosDoCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario.uid);

    if (!cliente) {
      return res.status(403).json({
        erro: "Acesso permitido apenas para clientes."
      });
    }

    const processos = await buscarDoCliente("processos", cliente);

    return res.status(200).json(ordenarPorData(processos, "criado_em"));

  } catch (e) {
    console.error("ERRO PROCESSOS DO CLIENTE:", e);
    return res.status(500).json({ erro: "Erro ao carregar seus processos." });
  }
};

exports.listarCompromissosDoCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario.uid);

    if (!cliente) {
      return res.status(403).json({
        erro: "Acesso permitido apenas para clientes."
      });
    }

    const compromissos = await buscarDoCliente("agenda", cliente);

    return res.status(200).json(compromissos);

  } catch (e) {
    console.error("ERRO COMPROMISSOS DO CLIENTE:", e);
    return res.status(500).json({ erro: "Erro ao carregar seus compromissos." });
  }
};

// Nomes usados pelos arquivos que você já tinha (routes/processos.js)
exports.listarProcessosCliente = exports.listarProcessosDoCliente;
exports.listarCompromissosCliente = exports.listarCompromissosDoCliente;