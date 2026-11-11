
const { supabaseAdmin } = require("../config/supabase");

const cadastrarCliente = async (req, res) => {
  try {
    const {
      nome,
      email,
      telefone,
      cpf,
      cnpj,
      tipoPessoa,
      tipo_pessoa,
      rg,
      endereco,
      estado,
      cidade
    } = req.body;

    if (!req.advogado || !req.advogado.id) {
      return res.status(401).json({
        erro: "Advogado não identificado."
      });
    }

    const novoCliente = {
      nome,
      email,
      telefone,
      cpf: cpf || "",
      cnpj: cnpj || "",
      tipo_pessoa: tipoPessoa || tipo_pessoa || "fisica",
      rg,
      endereco,
      estado,
      cidade
    };

    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from("clientes")
      .insert(novoCliente)
      .select()
      .single();

    if (erroCliente) {
      throw erroCliente;
    }

    const { error: erroVinculo } = await supabaseAdmin
      .from("advogado_clientes")
      .insert({
        advogado_id: req.advogado.id,
        cliente_id: cliente.id
      });

    if (erroVinculo) {
      // Remove o cadastro caso não seja possível criar o vínculo.
      await supabaseAdmin
        .from("clientes")
        .delete()
        .eq("id", cliente.id);

      throw erroVinculo;
    }

    return res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso",
      id: cliente.id
    });

  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error.message);

    return res.status(500).json({
      erro: "Erro ao cadastrar cliente."
    });
  }
};

const listarClientes = async (req, res) => {
  try {
    const advogadoId = req.advogado.id;

    const { data: vinculos, error: erroVinculos } = await supabaseAdmin
      .from("advogado_clientes")
      .select("cliente_id")
      .eq("advogado_id", advogadoId);

    if (erroVinculos) {
      throw erroVinculos;
    }

    const idsClientes = (vinculos || []).map(
      (vinculo) => vinculo.cliente_id
    );

    if (idsClientes.length === 0) {
      return res.status(200).json([]);
    }

    const { data: clientes, error: erroClientes } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .in("id", idsClientes)
      .order("nome", { ascending: true });

    if (erroClientes) {
      throw erroClientes;
    }

    return res.status(200).json(clientes || []);

  } catch (error) {
    console.error("Erro ao listar clientes:", error.message);

    return res.status(500).json({
      erro: "Erro ao listar clientes."
    });
  }
};

const obterCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const advogadoId = req.advogado.id;

    const { data: vinculo, error: erroVinculo } = await supabaseAdmin
      .from("advogado_clientes")
      .select("cliente_id")
      .eq("advogado_id", advogadoId)
      .eq("cliente_id", id)
      .maybeSingle();

    if (erroVinculo) {
      throw erroVinculo;
    }

    if (!vinculo) {
      return res.status(404).json({
        erro: "Cliente não encontrado."
      });
    }

    const { data: cliente, error } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!cliente) {
      return res.status(404).json({
        erro: "Cliente não encontrado."
      });
    }

    return res.status(200).json(cliente);

  } catch (error) {
    console.error("Erro ao obter cliente:", error.message);

    return res.status(500).json({
      erro: "Erro ao buscar cliente."
    });
  }
};

const atualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const advogadoId = req.advogado.id;

    const { data: vinculo, error: erroVinculo } = await supabaseAdmin
      .from("advogado_clientes")
      .select("cliente_id")
      .eq("advogado_id", advogadoId)
      .eq("cliente_id", id)
      .maybeSingle();

    if (erroVinculo) {
      throw erroVinculo;
    }

    if (!vinculo) {
      return res.status(404).json({
        erro: "Cliente não encontrado."
      });
    }

    const camposPermitidos = [
      "nome",
      "email",
      "telefone",
      "cpf",
      "cnpj",
      "tipoPessoa",
      "tipo_pessoa",
      "rg",
      "endereco",
      "estado",
      "cidade"
    ];

    const atualizacao = {};

    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        const coluna = campo === "tipoPessoa" ? "tipo_pessoa" : campo;
        atualizacao[coluna] = req.body[campo];
      }
    });

    if (Object.keys(atualizacao).length === 0) {
      return res.status(400).json({
        erro: "Nenhum campo válido foi informado."
      });
    }

    atualizacao.atualizado_em = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("clientes")
      .update(atualizacao)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      mensagem: "Cliente atualizado com sucesso."
    });

  } catch (error) {
    console.error("Erro ao atualizar cliente:", error.message);

    return res.status(500).json({
      erro: "Erro ao atualizar cliente."
    });
  }
};

const excluirCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const advogadoId = req.advogado.id;

    const { data: vinculo, error: erroVinculo } = await supabaseAdmin
      .from("advogado_clientes")
      .select("cliente_id")
      .eq("advogado_id", advogadoId)
      .eq("cliente_id", id)
      .maybeSingle();

    if (erroVinculo) {
      throw erroVinculo;
    }

    if (!vinculo) {
      return res.status(404).json({
        erro: "Cliente não encontrado."
      });
    }

    const { error } = await supabaseAdmin
      .from("advogado_clientes")
      .delete()
      .eq("advogado_id", advogadoId)
      .eq("cliente_id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      mensagem: "Cliente removido da sua lista com sucesso."
    });

  } catch (error) {
    console.error("Erro ao excluir cliente:", error.message);

    return res.status(500).json({
      erro: "Erro ao excluir cliente."
    });
  }
};

module.exports = {
  cadastrarCliente,
  listarClientes,
  obterCliente,
  atualizarCliente,
  excluirCliente
};
