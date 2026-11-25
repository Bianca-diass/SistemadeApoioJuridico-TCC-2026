const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const { supabaseAdmin } = require("../src/config/supabase");

const ADVOGADO = {
  nome: "Bianca Dias",
  email: "biancadias1444@gmail.com",
  senha: "advogado@123",
  oab: "OAB/MS 00000"
};

const CLIENTE = {
  nome: "Bianca Dias Gonzaga",
  email: "biancadiasgonzaga01@gmail.com",
  senha: "cliente123@"
};

const PROCESSO = {
  numero_processo: "0001234-56.2026.8.12.0001",
  vara: "1ª Vara Cível",
  tribunal: "TJMS",
  comarca: "Campo Grande",
  status: "Em andamento",
  tipo_manifestacao: "Nenhuma",
  ultima_movimentacao: "Processo distribuído",
  intimacao: false,
  prazo: "",
  data_abertura: new Date().toISOString().slice(0, 10),
  observacoes: "Processo de teste cadastrado pelo advogado."
};

const SEM_CONTA_CLIENTE = process.argv.includes("--sem-conta-cliente");

const normalizarEmail = (e) => String(e || "").trim().toLowerCase();

function emailJaCadastrado(error) {
  const m = (error?.message || "").toLowerCase();
  return (
    error?.code === "email_exists" ||
    m.includes("already been registered") ||
    m.includes("already registered")
  );
}

async function buscarUsuarioAuthPorEmail(email) {
  const alvo = normalizarEmail(email);

  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: pagina,
      perPage: 200
    });

    if (error) throw error;

    const achou = (data?.users || []).find(
      (u) => normalizarEmail(u.email) === alvo
    );

    if (achou) return achou;
    if (!data?.users || data.users.length < 200) return null;
  }

  return null;
}

async function obterOuCriarLogin({ email, senha, nome }) {
  const emailLimpo = normalizarEmail(email);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: emailLimpo,
    password: senha,
    email_confirm: true,
    user_metadata: { nome }
  });

  if (!error) {
    console.log(`  + login criado: ${emailLimpo}`);
    return data.user;
  }

  if (!emailJaCadastrado(error)) throw error;

  const existente = await buscarUsuarioAuthPorEmail(emailLimpo);

  if (!existente) throw error;

  const { error: erroUpdate } =
    await supabaseAdmin.auth.admin.updateUserById(existente.id, {
      password: senha,
      email_confirm: true
    });

  if (erroUpdate) throw erroUpdate;

  console.log(`  = login já existia (senha redefinida): ${emailLimpo}`);
  return existente;
}

async function garantirAdvogado() {
  console.log("\n[1/4] Advogado");

  const login = await obterOuCriarLogin(ADVOGADO);

  const { data: existente, error: erroBusca } = await supabaseAdmin
    .from("advogados")
    .select("*")
    .eq("auth_user_id", login.id)
    .maybeSingle();

  if (erroBusca) throw erroBusca;

  if (existente) {
    console.log(`  = perfil já existia (id ${existente.id})`);
    return existente;
  }

  const { data, error } = await supabaseAdmin
    .from("advogados")
    .insert({
      id: login.id,
      auth_user_id: login.id,
      nome: ADVOGADO.nome,
      email: normalizarEmail(ADVOGADO.email),
      telefone: "",
      cpf: "",
      oab: ADVOGADO.oab
    })
    .select("*")
    .single();

  if (error) throw error;

  console.log(`  + perfil criado (id ${data.id})`);
  return data;
}

async function garantirCliente(advogado) {
  console.log("\n[2/4] Cliente");

  const email = normalizarEmail(CLIENTE.email);

  let authUserId = null;

  if (!SEM_CONTA_CLIENTE) {
    const login = await obterOuCriarLogin(CLIENTE);
    authUserId = login.id;
  }

  const { data: existentes, error: erroBusca } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("email", email)
    .limit(1);

  if (erroBusca) throw erroBusca;

  let cliente = existentes && existentes[0];

  if (cliente) {
    if (
      authUserId &&
      cliente.auth_user_id &&
      cliente.auth_user_id !== authUserId
    ) {
      throw new Error(
        "Este e-mail já está ligado a outra conta de cliente."
      );
    }

    if (authUserId && !cliente.auth_user_id) {
      const { data, error } = await supabaseAdmin
        .from("clientes")
        .update({ auth_user_id: authUserId })
        .eq("id", cliente.id)
        .select("*")
        .single();

      if (error) throw error;

      cliente = data;
      console.log("  = cadastro já existia: ligado à conta de login");
    } else {
      console.log(`  = cadastro já existia (id ${cliente.id})`);
    }
  } else {
    const novo = {
      nome: CLIENTE.nome,
      email,
      telefone: "",
      cpf: "",
      cnpj: "",
      tipo_pessoa: "fisica"
    };

    if (authUserId) novo.auth_user_id = authUserId;

    const { data, error } = await supabaseAdmin
      .from("clientes")
      .insert(novo)
      .select("*")
      .single();

    if (error) throw error;

    cliente = data;
    console.log(`  + cadastro criado (id ${cliente.id})`);
  }

  const { data: vinculo, error: erroVinculo } = await supabaseAdmin
    .from("advogado_clientes")
    .select("cliente_id")
    .eq("advogado_id", advogado.id)
    .eq("cliente_id", cliente.id)
    .maybeSingle();

  if (erroVinculo) throw erroVinculo;

  if (!vinculo) {
    const { error } = await supabaseAdmin
      .from("advogado_clientes")
      .insert({
        advogado_id: advogado.id,
        cliente_id: cliente.id
      });

    if (error) throw error;

    console.log("  + vínculo advogado/cliente criado");
  } else {
    console.log("  = vínculo advogado/cliente já existia");
  }

  return cliente;
}

async function garantirProcesso(advogado, cliente) {
  console.log("\n[3/4] Processo");

  const { data: existente, error: erroBusca } = await supabaseAdmin
    .from("processos")
    .select("id")
    .eq("advogado_id", advogado.id)
    .eq("cliente_id", cliente.id)
    .eq("numero_processo", PROCESSO.numero_processo)
    .limit(1);

  if (erroBusca) throw erroBusca;

  if (existente && existente.length > 0) {
    console.log(`  = processo já existia (id ${existente[0].id})`);
    return existente[0];
  }

  const { data, error } = await supabaseAdmin
    .from("processos")
    .insert({
      ...PROCESSO,
      cliente: cliente.nome,
      cliente_id: cliente.id,
      advogado: advogado.nome,
      advogado_id: advogado.id
    })
    .select("*")
    .single();

  if (error) throw error;

  console.log(`  + processo criado (id ${data.id})`);
  return data;
}

async function conferir(advogado, cliente) {
  console.log("\n[4/4] Conferência");

  const { data, error } = await supabaseAdmin
    .from("processos")
    .select("numero_processo, cliente_id")
    .eq("cliente_id", cliente.id);

  if (error) throw error;

  const ok = (data || []).some(
    (p) => p.numero_processo === PROCESSO.numero_processo
  );

  console.log(
    ok
      ? `  OK: o processo está ligado a ${cliente.nome}.`
      : "  ERRO: o processo não ficou ligado ao cliente."
  );

  if (!ok) process.exitCode = 1;
}

(async () => {
  try {
    const advogado = await garantirAdvogado();
    const cliente = await garantirCliente(advogado);
    await garantirProcesso(advogado, cliente);
    await conferir(advogado, cliente);

    console.log("\nPronto.");
    console.log(`  Advogado: ${ADVOGADO.email}`);

    if (SEM_CONTA_CLIENTE) {
      console.log(
        `  Cliente:  ${CLIENTE.email} (ainda sem login: cadastre-se ` +
          "na tela de cadastro do cliente com este e-mail)"
      );
    } else {
      console.log(`  Cliente:  ${CLIENTE.email}`);
    }
  } catch (erro) {
    console.error("\nFalha no seed:", erro.message || erro);
    process.exitCode = 1;
  }
})();