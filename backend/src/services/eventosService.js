const conexoes = new Map();

function adicionar(clienteId, res) {
  const chave = String(clienteId);
  if (!conexoes.has(chave)) conexoes.set(chave, new Set());
  conexoes.get(chave).add(res);

  return () => {
    const set = conexoes.get(chave);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) conexoes.delete(chave);
  };
}

function emitir(clienteId, tipo, dados = {}) {
  if (!clienteId) return;
  const set = conexoes.get(String(clienteId));
  if (!set) return;
  const payload = `event: ${tipo}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch (e) {
      set.delete(res);
    }
  }
}

module.exports = { adicionar, emitir };