// backend/src/utils/vinculoCliente.js
//
// Liga um nome/id digitado pelo advogado a um cliente REAL da lista dele
// (tabela advogado_clientes). É isso que garante que processos e
// compromissos apareçam somente na área do cliente correto.

const { supabaseAdmin } = require("../config/supabase");

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function compararEmails(email1, email2) {
  return normalizarEmail(email1) === normalizarEmail(email2);
}

// Lista { id, nome } dos clientes vinculados ao advogado.
async function listarClientesDoAdvogado(advogadoId) {
  const { data: vinculos, error: erroVinculos } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId);

  if (erroVinculos) throw erroVinculos;

  const ids = (vinculos || []).map(v => v.cliente_id);

  if (ids.length === 0) return [];

  const { data: clientes, error: erroClientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome")
    .in("id", ids);

  if (erroClientes) throw erroClientes;

  return clientes || [];
}

// Procura o cliente do advogado pelo id (preferido) ou pelo nome.
// Nome: aceita igualdade exata (sem acento/maiúscula) e, se não houver,
// uma correspondência parcial ÚNICA. Se houver dúvida, devolve null.
// Retorno: { id, nome } ou null.
async function buscarClienteVinculado(advogadoId, { clienteId, nome } = {}) {
  if (!advogadoId) return null;

  const clientes = await listarClientesDoAdvogado(advogadoId);

  if (clientes.length === 0) return null;

  if (clienteId !== undefined && clienteId !== null && clienteId !== "") {
    const porId = clientes.find(
      c => String(c.id) === String(clienteId)
    );

    if (porId) return porId;
  }

  const alvo = normalizarTexto(nome);

  if (!alvo) return null;

  const exatos = clientes.filter(
    c => normalizarTexto(c.nome) === alvo
  );

  if (exatos.length === 1) return exatos[0];
  if (exatos.length > 1) return null;

  const parciais = clientes.filter(c => {
    const nomeCliente = normalizarTexto(c.nome);
    return nomeCliente.includes(alvo) || alvo.includes(nomeCliente);
  });

  return parciais.length === 1 ? parciais[0] : null;
}

// Atalho: devolve só o id do cliente (ou null).
async function resolverClienteId(advogadoId, dados = {}) {
  const cliente = await buscarClienteVinculado(advogadoId, dados);
  return cliente ? cliente.id : null;
}

module.exports = {
  normalizarTexto,
  normalizarEmail,
  compararEmails,
  listarClientesDoAdvogado,
  buscarClienteVinculado,
  resolverClienteId
};