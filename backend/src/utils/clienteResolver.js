const { supabaseAdmin } = require("../config/supabase");

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

async function resolverClienteId(advogadoId, nome) {
  const alvo = norm(nome);

  if (!alvo) return null;

  const { data: vinculos, error } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogadoId);

  if (error) throw error;

  const ids = (vinculos || []).map((v) => v.cliente_id);

  if (!ids.length) return null;

  const { data: clientes, error: erro2 } = await supabaseAdmin
    .from("clientes")
    .select("id, nome")
    .in("id", ids);

  if (erro2) throw erro2;

  const lista = (clientes || []).filter((c) => norm(c.nome));

  const exatos = lista.filter((c) => norm(c.nome) === alvo);

  if (exatos.length === 1) return exatos[0].id;
  if (exatos.length > 1) return null;

  const parciais = lista.filter(
    (c) => norm(c.nome).includes(alvo) || alvo.includes(norm(c.nome))
  );

  return parciais.length === 1 ? parciais[0].id : null;
}

const ultimaVez = new Map();

async function vincularLegado(cliente) {
  try {
    if (!cliente?.id || !cliente.nome) return;

    const agora = Date.now();

    if (agora - (ultimaVez.get(cliente.id) || 0) < 30000) return;

    ultimaVez.set(cliente.id, agora);

    const { data: vinculos } = await supabaseAdmin
      .from("advogado_clientes")
      .select("advogado_id")
      .eq("cliente_id", cliente.id);

    const advogados = (vinculos || []).map((v) => v.advogado_id);

    if (!advogados.length) return;

    for (const tabela of ["processos", "agenda"]) {
      const { data } = await supabaseAdmin
        .from(tabela)
        .select("id, cliente")
        .is("cliente_id", null)
        .in("advogado_id", advogados);

      const ids = (data || [])
        .filter((r) => norm(r.cliente) === norm(cliente.nome))
        .map((r) => r.id);

      if (ids.length) {
        await supabaseAdmin
          .from(tabela)
          .update({ cliente_id: cliente.id })
          .in("id", ids);
      }
    }

    const [procs, ags] = await Promise.all([
      supabaseAdmin.from("processos").select("id").eq("cliente_id", cliente.id),
      supabaseAdmin.from("agenda").select("id").eq("cliente_id", cliente.id)
    ]);

    const pIds = (procs.data || []).map((p) => p.id);
    const aIds = (ags.data || []).map((a) => a.id);

    if (pIds.length) {
      await supabaseAdmin
        .from("notificacoes")
        .update({ cliente_id: cliente.id })
        .is("cliente_id", null)
        .in("processo_id", pIds);
    }

    if (aIds.length) {
      await supabaseAdmin
        .from("notificacoes")
        .update({ cliente_id: cliente.id })
        .is("cliente_id", null)
        .in("compromisso_id", aIds);
    }
  } catch (e) {
    console.error("Erro ao vincular registros antigos:", e.message);
  }
}

// Une o cadastro criado pelo advogado (sem login) com a conta do cliente
// (criada no "Cadastro" do cliente), pelo e-mail ou pelo nome.
const unioes = new Map();

function unirCadastros(uid, email) {
  const anterior = unioes.get(uid);

  if (anterior && Date.now() - anterior.t < 30000) return anterior.p;

  const p = executarUniao(uid, email);

  unioes.set(uid, { t: Date.now(), p });

  return p;
}

async function executarUniao(uid, email) {
  try {
    if (!uid) return;

    const { data: conta } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, email")
      .or(`auth_user_id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    if (!conta) return;

    const { data: soltos } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, email")
      .is("auth_user_id", null)
      .is("user_id", null)
      .neq("id", conta.id);

    const emailConta = String(email || conta.email || "").trim().toLowerCase();

    const duplicados = (soltos || []).filter((c) => {
      const mesmoEmail =
        emailConta && String(c.email || "").trim().toLowerCase() === emailConta;

      const mesmoNome = norm(c.nome) && norm(c.nome) === norm(conta.nome);

      return mesmoEmail || mesmoNome;
    });

    for (const antigo of duplicados) {
      for (const tabela of ["processos", "agenda", "notificacoes", "documentos"]) {
        await supabaseAdmin
          .from(tabela)
          .update({ cliente_id: conta.id })
          .eq("cliente_id", antigo.id);
      }

      const { data: links } = await supabaseAdmin
        .from("advogado_clientes")
        .select("advogado_id")
        .eq("cliente_id", antigo.id);

      for (const l of links || []) {
        const { data: existe } = await supabaseAdmin
          .from("advogado_clientes")
          .select("advogado_id")
          .eq("advogado_id", l.advogado_id)
          .eq("cliente_id", conta.id)
          .maybeSingle();

        if (!existe) {
          await supabaseAdmin
            .from("advogado_clientes")
            .insert({ advogado_id: l.advogado_id, cliente_id: conta.id });
        }
      }

      await supabaseAdmin
        .from("advogado_clientes")
        .delete()
        .eq("cliente_id", antigo.id);
    }
  } catch (e) {
    console.error("Erro ao unir cadastros do cliente:", e.message);
  }
}

module.exports = { resolverClienteId, vincularLegado, unirCadastros };