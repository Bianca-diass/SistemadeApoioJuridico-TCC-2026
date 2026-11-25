const express = require("express");
const jwt = require("jsonwebtoken");
const { supabaseAdmin } = require("../config/supabase");

let bcrypt;
try { bcrypt = require("bcryptjs"); } catch { bcrypt = require("bcrypt"); }

const router = express.Router();

// Usa o mesmo cliente do restante do back-end (config/supabase.js)
const supabase = supabaseAdmin;

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ erro: "Não autenticado." });

  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: p.id || p.advogado_id || p.user_id || p.sub || null,
      email: p.email || null
    };
    if (!req.usuario.id && !req.usuario.email) throw new Error("token sem id");
    next();
  } catch {
    return res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });
  }
}

function filtro(query, usuario) {
  return usuario.id ? query.eq("id", usuario.id) : query.eq("email", usuario.email);
}

// GET /advogado/perfil
router.get("/perfil", auth, async (req, res) => {
  const { data, error } = await filtro(
    supabase.from("advogados").select("nome, email, telefone, cpf, oab"),
    req.usuario
  ).maybeSingle();

  if (error) return res.status(500).json({ erro: error.message });
  if (!data) return res.status(404).json({ erro: "Advogado não encontrado." });
  res.json(data);
});

// PUT /advogado/perfil
router.put("/perfil", auth, async (req, res) => {
  const { nome, email, telefone, cpf, oab } = req.body || {};

  if (!nome || String(nome).trim().length < 3)
    return res.status(400).json({ erro: "Informe seu nome completo." });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ erro: "Informe um e-mail válido." });

  const { data, error } = await filtro(
    supabase.from("advogados").update({
      nome: String(nome).trim(),
      email: String(email).trim().toLowerCase(),
      telefone: telefone || null,
      cpf: cpf || null,
      oab: oab || null
    }),
    req.usuario
  ).select("nome, email, telefone, cpf, oab").maybeSingle();

  if (error) return res.status(500).json({ erro: error.message });
  if (!data) return res.status(404).json({ erro: "Advogado não encontrado." });
  res.json({ mensagem: "Dados salvos com sucesso!", perfil: data });
});

// PUT /advogado/senha
router.put("/senha", auth, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};

  if (!senhaAtual) return res.status(400).json({ erro: "Informe sua senha atual." });
  if (!novaSenha || novaSenha.length < 6)
    return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });

  const { data: adv, error } = await filtro(
    supabase.from("advogados").select("*"),
    req.usuario
  ).maybeSingle();

  if (error) return res.status(500).json({ erro: error.message });
  if (!adv) return res.status(404).json({ erro: "Advogado não encontrado." });

  const coluna = ["senha_hash", "senha", "password_hash", "password"].find((c) => c in adv);
  if (!coluna) return res.status(500).json({ erro: "Coluna de senha não encontrada na tabela advogados." });

  const hashSalvo = adv[coluna] || "";
  const eHash = /^\$2[aby]\$/.test(hashSalvo);
  const confere = eHash ? await bcrypt.compare(senhaAtual, hashSalvo) : senhaAtual === hashSalvo;

  if (!confere) return res.status(400).json({ erro: "Senha atual incorreta." });

  const novo = eHash ? await bcrypt.hash(novaSenha, 10) : novaSenha;

  const { error: erroUpdate } = await supabase
    .from("advogados")
    .update({ [coluna]: novo })
    .eq("id", adv.id);

  if (erroUpdate) return res.status(500).json({ erro: erroUpdate.message });
  res.json({ mensagem: "Senha alterada com sucesso!" });
});

module.exports = router;