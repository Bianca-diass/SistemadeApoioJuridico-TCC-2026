const { supabaseAdmin } = require("../config/supabase");

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function listarClientesDoAdvogado(advogadoId) {
  const { data: vinculos, error: erroVinculos } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId);

  if (erroVinculos) throw erroVinculos;

  const ids = (vinculos || []).map((v) => v.cliente_id);

  if (ids.length === 0) return [];

  const { data: clientes, error: erroClientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome")
    .in("id", ids);

  if (erroClientes) throw erroClientes;

  return clientes || [];
}

async function resolverClienteId(advogadoId, { clienteId, nome } = {}) {
  const clientes = await listarClientesDoAdvogado(advogadoId);

  if (clienteId) {
    const vinculado = clientes.find((c) => String(c.id) === String(clienteId));
    return vinculado ? vinculado.id : null;
  }

  const alvo = normalizarTexto(nome);

  if (!alvo) return null;

  const iguais = clientes.filter((c) => normalizarTexto(c.nome) === alvo);

  return iguais.length === 1 ? iguais[0].id : null;
}

module.exports = {
  normalizarTexto,
  listarClientesDoAdvogado,
  resolverClienteId
};