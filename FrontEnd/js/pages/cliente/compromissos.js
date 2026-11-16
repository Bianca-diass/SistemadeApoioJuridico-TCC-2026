// Fonte ÚNICA de compromissos: usada pela Agenda e pelo Dashboard.
// Para adicionar ou editar um compromisso, mexa só neste array.

const COMPROMISSOS = [
  { id: 1, titulo: 'Audiência de conciliação',       data: '2026-11-18', hora: '09:30', local: 'Fórum - Sala 3', status: 'Agendado' },
  { id: 2, titulo: 'Assinatura de documentos',       data: '2026-11-25', hora: '14:00', local: 'Escritório',     status: 'Agendado' },
  { id: 3, titulo: 'Videochamada de acompanhamento', data: '2026-12-03', hora: '10:00', local: 'Online',         status: 'Agendado' },
];

const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function dataHora(c) {
  return new Date(`${c.data}T${c.hora}:00`);
}

function getProximos(limite = Infinity) {
  const agora = new Date();
  return COMPROMISSOS
    .filter(c => dataHora(c) >= agora)
    .sort((a, b) => dataHora(a) - dataHora(b))
    .slice(0, limite);
}

function getDiaMes(c) {
  const d = dataHora(c);
  return { dia: String(d.getDate()).padStart(2, '0'), mes: MESES[d.getMonth()] };
}