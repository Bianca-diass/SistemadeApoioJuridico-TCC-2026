const { supabaseAdmin } = require("../config/supabase");
const { unirCadastros, vincularLegado } = require("../utils/clienteResolver");

async function buscarCliente(usuario) {
  if (!usuario || !usuario.uid) {
    throw new Error("Usuário não autenticado.");
  }

  // Vincula o cadastro (feito pelo advogado) à conta de login, se ainda não estiver.
  try {
    await unirCadastros(usuario.uid, usuario.email);
  } catch (e) {
    console.error("Aviso ao vincular cadastro:", e.message);
  }

  // Procura nos dois campos, igual ao perfil (cadastros antigos usam user_id).
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .or(`auth_user_id.eq.${usuario.uid},user_id.eq.${usuario.uid}`)
    .limit(1);

  if (error) {
    throw error;
  }

  const cliente = data && data.length > 0 ? data[0] : null;

  // Liga processos/compromissos antigos (sem cliente_id) a este cliente.
  if (cliente) {
    await vincularLegado(cliente);
  }

  return cliente;
}

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
      .order("criado_em", { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      sucesso: true,
      processos: processos || []
    });

  } catch (error) {
    console.error("Erro ao listar processos do cliente:", error);

    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao carregar os processos.",
      mensagem: "Erro ao carregar os processos."
    });
  }
};

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
      .order("data", { ascending: true });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      sucesso: true,
      compromissos: compromissos || []
    });

  } catch (error) {
    console.error("Erro ao listar compromissos do cliente:", error);

    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao carregar os compromissos.",
      mensagem: "Erro ao carregar os compromissos."
    });
  }
};

exports.listarProcessosCliente = exports.listarProcessosDoCliente;
exports.listarCompromissosCliente = exports.listarCompromissosDoCliente;