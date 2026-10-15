const { admin, db } = require("../config/firebase");

const COLECAO = "clientes";

// Acha o cadastro do cliente (doc com id = uid, ou campo uid)
async function buscarClienteRef(uid) {
  const direto = db.collection(COLECAO).doc(uid);
  if ((await direto.get()).exists) return direto;

  const q = await db
    .collection(COLECAO)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  return q.empty ? null : q.docs[0].ref;
}

// Confere a senha atual usando o mesmo endpoint do login
async function senhaAtualConfere(email, senha) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: senha,
        returnSecureToken: false
      })
    }
  );
  return r.ok;
}

exports.obterPerfilCliente = async (req, res) => {
  try {
    const { uid, email } = req.usuario;

    const ref = await buscarClienteRef(uid);
    if (!ref) {
      return res.status(404).json({ erro: "Cadastro de cliente não encontrado." });
    }

    const d = (await ref.get()).data();

    res.json({
      nome: d.nome || "",
      email: email || d.email || "",
      telefone: d.telefone || ""
    });
  } catch (e) {
    console.error("ERRO PERFIL CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao carregar seus dados." });
  }
};

exports.atualizarConfiguracoesCliente = async (req, res) => {
  try {
    const { uid } = req.usuario;
    const { nome, email, telefone, novaSenha, senhaAtual } = req.body;

    const ref = await buscarClienteRef(uid);
    if (!ref) {
      return res.status(404).json({ erro: "Cadastro de cliente não encontrado." });
    }

    const userRecord = await admin.auth().getUser(uid);

    const mudouEmail =
      !!email &&
      email.trim().toLowerCase() !== (userRecord.email || "").toLowerCase();
    const mudouSenha = !!novaSenha;

    if (
      mudouSenha &&
      (novaSenha.length < 8 || !/[A-Za-z]/.test(novaSenha) || !/\d/.test(novaSenha))
    ) {
      return res.status(400).json({
        erro: "A senha deve ter no mínimo 8 caracteres, com letras e números."
      });
    }

    // Trocar e-mail ou senha exige a senha atual
    if (mudouSenha || mudouEmail) {
      if (!senhaAtual) {
        return res.status(403).json({
          codigo: "REAUTH_REQUIRED",
          erro: "Informe sua senha atual."
        });
      }
      if (!(await senhaAtualConfere(userRecord.email, senhaAtual))) {
        return res.status(401).json({ erro: "Senha atual incorreta." });
      }
    }

    const nomeLimpo = typeof nome === "string" ? nome.trim() : "";

    const authUpdate = {};
    if (nomeLimpo) authUpdate.displayName = nomeLimpo;
    if (mudouEmail) authUpdate.email = email.trim();
    if (mudouSenha) authUpdate.password = novaSenha;
    if (Object.keys(authUpdate).length) {
      await admin.auth().updateUser(uid, authUpdate);
    }

    const upd = {
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    };
    if (nomeLimpo) upd.nome = nomeLimpo;
    if (mudouEmail) upd.email = email.trim();
    if (telefone !== undefined) upd.telefone = telefone;
    await ref.update(upd);

    res.json({ ok: true, senhaAlterada: mudouSenha, emailAlterado: mudouEmail });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      return res.status(409).json({ erro: "Este e-mail já está em uso." });
    }
    if (e.code === "auth/invalid-email") {
      return res.status(400).json({ erro: "E-mail inválido." });
    }
    console.error("ERRO CONFIG CLIENTE:", e);
    res.status(500).json({ erro: "Erro ao salvar alterações." });
  }
};