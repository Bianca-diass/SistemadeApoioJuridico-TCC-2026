// backend/src/utils/clienteResolver.js

const { supabaseAdmin } = require("../config/supabase");
const { normalizarTexto } = require("./vinculoCliente");

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Busca cadastros de clientes pelo e-mail (já normalizado).
 */
async function buscarClientesPorEmail(email) {
  const emailNormalizado = normalizarEmail(email);

  if (!emailNormalizado) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("email", emailNormalizado);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Localiza um cadastro existente pelo e-mail e vincula
 * esse cadastro ao usuário autenticado.
 */
async function reivindicarCadastroExistente(email, authUserId, dadosPerfil = {}) {
  const emailNormalizado = normalizarEmail(email);

  if (!emailNormalizado || !authUserId) {
    return null;
  }

  const { data: clientes, error: buscaError } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("email", emailNormalizado)
    .limit(1);

  if (buscaError) {
    throw buscaError;
  }

  const cliente = clientes && clientes.length > 0 ? clientes[0] : null;

  if (!cliente) {
    return null;
  }

  // Não permite vincular um cadastro que já pertence a outra conta.
  if (
    cliente.auth_user_id &&
    cliente.auth_user_id !== authUserId
  ) {
    throw new Error(
      "Este cadastro já está vinculado a outra conta."
    );
  }

  const atualizacao = {
    auth_user_id: authUserId
  };

  // Atualiza somente informações recebidas e que estejam disponíveis.
  if (dadosPerfil.nome) {
    atualizacao.nome = dadosPerfil.nome;
  }

  if (dadosPerfil.telefone) {
    atualizacao.telefone = dadosPerfil.telefone;
  }

  const { data: clienteAtualizado, error: updateError } =
    await supabaseAdmin
      .from("clientes")
      .update(atualizacao)
      .eq("id", cliente.id)
      .select("*")
      .single();

  if (updateError) {
    throw updateError;
  }

  return clienteAtualizado;
}

/**
 * Garante que o cadastro existente esteja vinculado
 * ao usuário autenticado.
 *
 * Não exclui cadastros nem altera processos automaticamente.
 */
async function unirCadastros(authUserId, email) {
  const emailNormalizado = normalizarEmail(email);

  if (!authUserId || !emailNormalizado) {
    return null;
  }

  const { data: cliente, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (cliente) {
    return cliente;
  }

  return await reivindicarCadastroExistente(
    emailNormalizado,
    authUserId
  );
}

/**
 * Compromissos e processos antigos (criados quando ainda não havia
 * cliente_id) só tinham o NOME do cliente. Esta função liga esses
 * registros ao cliente logado, mas somente quando:
 *   - o registro pertence a um advogado vinculado a este cliente;
 *   - o nome é igual (sem acento/maiúscula);
 *   - esse advogado não tem outro cliente com o mesmo nome.
 * As notificações geradas por esses registros também são ligadas.
 * Nunca interrompe a requisição: qualquer erro só vai para o log.
 */
async function vincularLegado(cliente) {
  try {
    if (!cliente || !cliente.id || !cliente.nome) return;

    const nomeAlvo = normalizarTexto(cliente.nome);

    if (!nomeAlvo) return;

    const { data: vinculos, error: erroVinculos } = await supabaseAdmin
      .from("advogado_clientes")
      .select("advogado_id")
      .eq("cliente_id", cliente.id);

    if (erroVinculos) throw erroVinculos;

    const advogadosIds = [
      ...new Set((vinculos || []).map(v => v.advogado_id))
    ];

    if (advogadosIds.length === 0) return;

    // Descarta advogados que tenham dois clientes com o mesmo nome.
    const advogadosSeguros = [];

    for (const advogadoId of advogadosIds) {
      const { data: lista, error: erroLista } = await supabaseAdmin
        .from("advogado_clientes")
        .select("cliente_id")
        .eq("advogado_id", advogadoId);

      if (erroLista) throw erroLista;

      const ids = (lista || []).map(v => v.cliente_id);

      const { data: clientes, error: erroClientes } = await supabaseAdmin
        .from("clientes")
        .select("id, nome")
        .in("id", ids);

      if (erroClientes) throw erroClientes;

      const iguais = (clientes || []).filter(
        c => normalizarTexto(c.nome) === nomeAlvo
      );

      if (iguais.length === 1) advogadosSeguros.push(advogadoId);
    }

    if (advogadosSeguros.length === 0) return;

    const tabelas = [
      { tabela: "agenda", coluna: "compromisso_id" },
      { tabela: "processos", coluna: "processo_id" }
    ];

    for (const { tabela, coluna } of tabelas) {
      const { data: soltos, error: erroSoltos } = await supabaseAdmin
        .from(tabela)
        .select("id, cliente")
        .is("cliente_id", null)
        .in("advogado_id", advogadosSeguros);

      if (erroSoltos) throw erroSoltos;

      const ids = (soltos || [])
        .filter(r => normalizarTexto(r.cliente) === nomeAlvo)
        .map(r => r.id);

      if (ids.length === 0) continue;

      const { error: erroUpdate } = await supabaseAdmin
        .from(tabela)
        .update({ cliente_id: cliente.id })
        .in("id", ids);

      if (erroUpdate) throw erroUpdate;

      const { error: erroNotif } = await supabaseAdmin
        .from("notificacoes")
        .update({ cliente_id: cliente.id })
        .is("cliente_id", null)
        .in(coluna, ids);

      if (erroNotif) throw erroNotif;
    }
  } catch (error) {
    console.error(
      "Aviso: não foi possível vincular registros antigos:",
      error.message
    );
  }
}

module.exports = {
  normalizarEmail,
  emailNormalizado: normalizarEmail,
  buscarClientesPorEmail,
  reivindicarCadastroExistente,
  unirCadastros,
  vincularLegado
};