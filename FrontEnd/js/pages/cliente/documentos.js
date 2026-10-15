// js/pages/cliente/documentos.js

import { authController } from "../../controllers/authController.js";
import { listarDocumentos } from "../../services/documentoService.js";

const input = document.getElementById("arquivo");
const lista = document.getElementById("docs");
const MAX = 10 * 1024 * 1024;


// ==========================================
// PROTEGER A PÁGINA (igual ao dashboard)
// ==========================================

if (!authController.logado) {
  window.location.href = "login.html";
}


// ==========================================
// AUXILIARES
// ==========================================

function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarData(data) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function classeStatus(status) {
  switch (status) {
    case "Aprovado":
      return "b-ok";
    case "Pendente":
      return "b-warn";
    case "Rejeitado":
      return "b-err";
    default:
      return "b-info";
  }
}

function mensagem(texto) {
  lista.innerHTML = `<p class="sub" style="padding:16px;">${escapar(texto)}</p>`;
}


// ==========================================
// MOSTRAR OS DOCUMENTOS DO CLIENTE
// (o back-end só devolve os documentos dele)
// ==========================================

function renderizar(documentos) {

  if (!documentos || documentos.length === 0) {
    mensagem("Você ainda não possui documentos.");
    return;
  }

  lista.innerHTML = documentos.map((doc) => {

    const detalhes = [
      `Enviado em ${formatarData(doc.dataEnvio)}`,
      doc.tipo,
      doc.processo ? `Processo ${doc.processo}` : ""
    ].filter(Boolean).join(" · ");

    return `
      <div class="doc">
        <div>
          <b>${escapar(doc.titulo || "Sem nome")}</b>
          <small>${escapar(detalhes)}</small>
        </div>
        <span class="badge ${classeStatus(doc.status)}">
          ${escapar(doc.status || "Sem status")}
        </span>
      </div>
    `;

  }).join("");

}

async function carregar() {

  mensagem("Carregando documentos...");

  try {
    renderizar(await listarDocumentos());
  } catch (erro) {
    console.error("Erro ao carregar documentos:", erro);
    mensagem(erro.message || "Não foi possível carregar os documentos.");
  }

}


// ==========================================
// ENVIO DE ARQUIVO
// TODO: o sistema ainda não guarda arquivos (falta o
// Firebase Storage). Até lá, avisamos o cliente em vez de
// mostrar um envio que não foi realmente feito.
// ==========================================

input.addEventListener("change", () => {

  const arquivo = input.files[0];

  if (!arquivo) return;

  if (arquivo.size > MAX) {
    alert("O arquivo passa de 10 MB.");
    input.value = "";
    return;
  }

  alert(
    "O envio de arquivos ainda não está disponível. " +
    "Entre em contato com o seu advogado."
  );

  input.value = "";

});


carregar();