// backend/src/utils/helpers.js
//
// Funções pequenas usadas pelos controllers e middlewares
// que conversam com o Supabase.

// ==========================================================
// numero_processo -> numeroProcesso
// O banco usa snake_case; o front-end continua recebendo
// camelCase, como no Firebase. Funciona com objeto ou lista.
// ==========================================================

function paraCamel(chave) {
  return chave.replace(/_([a-z0-9])/g, (_, letra) =>
    letra.toUpperCase()
  );
}

function snakeParaCamel(valor) {
  if (Array.isArray(valor)) {
    return valor.map(snakeParaCamel);
  }

  if (valor && valor.constructor === Object) {
    const resultado = {};

    for (const [chave, conteudo] of Object.entries(valor)) {
      resultado[paraCamel(chave)] = conteudo;
    }

    return resultado;
  }

  return valor;
}

// ==========================================================
// Erros do Supabase Auth -> mensagem em português.
// Devolve null quando o erro não é um dos conhecidos (aí o
// controller responde 500 e registra o erro no console).
// ==========================================================

function traduzirErroAuth(erro) {
  switch (erro && erro.code) {
    case "email_exists":
    case "user_already_exists":
      return "Este email já está sendo utilizado";

    case "email_address_invalid":
      return "O email informado é inválido";

    case "weak_password":
      return "A senha é muito fraca. Use pelo menos 6 caracteres";

    default:
      return null;
  }
}

module.exports = {
  snakeParaCamel,
  traduzirErroAuth
};