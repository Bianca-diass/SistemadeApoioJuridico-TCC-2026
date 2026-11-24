import {
  listarCompromissosDoCliente,
  assinarEventosCliente
} from "./clienteDashboardService.js";

export const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export function escaparHTML(valor) {
  const div = document.createElement("div");
  div.textContent = valor == null ? "" : String(valor);
  return div.innerHTML;
}

export function texto(valor) {
  return valor == null ? "" : String(valor).trim();
}

export function pegar(obj, ...campos) {
  for (const campo of campos) {
    const valor = obj[campo];
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      return valor;
    }
  }
  return "";
}

export function formatarData(valor) {
  const s = texto(valor);
  if (!s) return "";

  const m = s.substring(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("pt-BR");
}

export function formatarHora(valor) {
  const s = texto(valor);
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}h${m[2]}` : s;
}

export function momentoDoCompromisso(c) {
  const data = texto(pegar(c, "data")).substring(0, 10);
  const hora = texto(pegar(c, "horario", "hora")).substring(0, 5);
  const dataPrazo = texto(pegar(c, "data_prazo", "dataPrazo")).substring(0, 10);
  const horaPrazo = texto(pegar(c, "hora_prazo", "horaPrazo")).substring(0, 5);

  const dia = data || dataPrazo;
  if (!dia) return null;

  const h = data ? hora : horaPrazo;
  const d = new Date(`${dia}T${h || "23:59"}:00`);

  return isNaN(d) ? null : d;
}

export function foiConcluidoOuCancelado(c) {
  const status = texto(c.status).toLowerCase();
  return c.concluido === true ||
    status === "concluído" || status === "concluido" || status === "cancelado";
}

export function compromissosFuturos(lista) {
  const agora = new Date();

  return lista
    .filter(c => {
      const m = momentoDoCompromisso(c);
      return m && m >= agora && !foiConcluidoOuCancelado(c);
    })
    .sort((a, b) => momentoDoCompromisso(a) - momentoDoCompromisso(b));
}

export function compromissosAnteriores(lista) {
  const agora = new Date();

  return lista
    .filter(c => {
      const m = momentoDoCompromisso(c);
      return m && m < agora;
    })
    .sort((a, b) => momentoDoCompromisso(b) - momentoDoCompromisso(a));
}

export function observarCompromissos(aoReceber, aoFalhar) {
  const INTERVALO = 8000;
  let ativo = true;
  let carregando = false;
  let pendente = false;

  async function atualizar() {
    if (!ativo) return;

    // Se chegar um aviso durante uma consulta, repete ao terminar.
    if (carregando) {
      pendente = true;
      return;
    }

    carregando = true;

    try {
      const lista = await listarCompromissosDoCliente();
      if (ativo) aoReceber(lista);
    } catch (erro) {
      if (ativo && aoFalhar) aoFalhar(erro);
    } finally {
      carregando = false;

      if (pendente && ativo) {
        pendente = false;
        atualizar();
      }
    }
  }

  const timer = setInterval(() => { if (!document.hidden) atualizar(); }, INTERVALO);
  const aoVoltar = () => { if (!document.hidden) atualizar(); };
  document.addEventListener("visibilitychange", aoVoltar);

  // Tempo real: atualiza assim que o advogado mexer na agenda.
  const pararEventos = assinarEventosCliente(tipo => {
    if (tipo !== "notificacoes") atualizar();
  });

  atualizar();

  return () => {
    ativo = false;
    clearInterval(timer);
    pararEventos();
    document.removeEventListener("visibilitychange", aoVoltar);
  };
}