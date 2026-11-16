const { supabaseAdmin } = require("../config/supabase");
const { adicionar } = require("../services/eventosService");
const { vincularLegado, unirCadastros } = require("../utils/clienteResolver");

async function buscarCliente(usuario) {
  const uid = usuario.uid;

  await unirCadastros(uid, usuario.email);

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nome")
    .or(`auth_user_id.eq.${uid},user_id.eq.${uid}`)
    .maybeSingle();

  if (error) throw error;

  return data;
}

exports.listarProcessosCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(404).json({ erro: "Cadastro de cliente não encontrado." });
    }

    await vincularLegado(cliente);

    const { data, error } = await supabaseAdmin
      .from("processos")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("criado_em", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (e) {
    console.error("ERRO PROCESSOS CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao carregar seus processos." });
  }
};

exports.listarAgendaCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(404).json({ erro: "Cadastro de cliente não encontrado." });
    }

    await vincularLegado(cliente);

    const { data, error } = await supabaseAdmin
      .from("agenda")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("data", { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (e) {
    console.error("ERRO AGENDA CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao carregar seus compromissos." });
  }
};

exports.eventosCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.usuario);

    if (!cliente) {
      return res.status(404).json({ erro: "Cadastro de cliente não encontrado." });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    res.write("retry: 3000\n\n");
    res.write("event: conectado\ndata: {}\n\n");

    const remover = adicionar(cliente.id, res);

    const batimento = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch (e) {}
    }, 20000);

    req.on("close", () => {
      clearInterval(batimento);
      remover();
    });
  } catch (e) {
    console.error("ERRO EVENTOS CLIENTE:", e);

    if (!res.headersSent) {
      res.status(500).json({ erro: "Erro ao abrir conexão em tempo real." });
    }
  }
};