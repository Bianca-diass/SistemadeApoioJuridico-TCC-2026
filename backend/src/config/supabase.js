// backend/src/config/supabase.js
//
// Conexão com o Supabase. Substitui o config/firebase.js
// (que continua existindo até a Etapa 4, porque os outros
// controllers ainda usam o Firestore).
//
// As chaves ficam no backend/.env (nunca no front-end):
//   SUPABASE_URL=
//   SUPABASE_SECRET_KEY=        (ignora o RLS: só no back-end!)
//   SUPABASE_PUBLISHABLE_KEY=   (usada só para conferir login/senha)

const { createClient } = require("@supabase/supabase-js");

const {
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  SUPABASE_PUBLISHABLE_KEY
} = process.env;

const faltando = [
  ["SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY],
  ["SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY]
]
  .filter(([, valor]) => !valor)
  .map(([nome]) => nome);

if (faltando.length > 0) {
  throw new Error(
    `Faltam variáveis no backend/.env: ${faltando.join(", ")}`
  );
}

// O servidor não guarda sessão de ninguém: cada requisição
// traz o próprio token.
const opcoes = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};

// Cliente "administrador" (secret key): lê e grava em todas
// as tabelas e gerencia contas. A checagem de permissão
// continua sendo feita no código (middlewares e controllers).
// NUNCA use este cliente para fazer signInWithPassword: o
// login prenderia a sessão do usuário nele e as próximas
// consultas deixariam de usar a secret key.
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  opcoes
);

// Cliente novo e descartável (publishable key), usado só
// para conferir e-mail e senha no login.
function criarClienteAnonimo() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    opcoes
  );
}

module.exports = {
  supabaseAdmin,
  criarClienteAnonimo
};