
// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CONFIG = {
  tokenKey: 'token',
  usuarioKeys: ['usuario', 'user'],
  login: 'login.html',
  modoDemonstracao: true
};

const el = {
  agenda: document.getElementById('agenda'),
  sub: document.getElementById('sub'),
  abas: document.getElementById('abas'),
  nome: document.getElementById('nomeUsuario'),
  inicial: document.getElementById('inicialUsuario'),
  sair: document.getElementById('btnSair'),
  modal: document.getElementById('modal'),
  titulo: document.getElementById('modalTitulo'),
  corpo: document.getElementById('modalCorpo'),
  fechar: document.getElementById('modalFechar')
};

let compromissos = [];
let filtroAtual = 'proximos';

// ============================================================
// DATAS
// ============================================================

function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(quantidade) {
  const data = new Date();
  data.setHours(12, 0, 0, 0);
  data.setDate(data.getDate() + quantidade);

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
  if (!data) return '—';

  const [ano, mes, dia] = data.split('-');

  return `${dia}/${mes}/${ano}`;
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

function partesData(data) {
  const [, mes, dia] = data.split('-');

  return {
    dia,
    mes: MESES[Number(mes) - 1] || '---'
  };
}

// ============================================================
// COMPROMISSOS FICTÍCIOS
// ============================================================

function gerarCompromissosDemonstracao() {
  return [
    {
      id: 1,
      titulo: 'Reunião com o advogado',
      data: adicionarDias(-3),
      hora: '09:00',
      tipo: 'Reunião',
      local: 'Escritório de Advocacia',
      processo: '0001234-56',
      advogado: 'Dr. Carlos Mendes',
      status: 'agendado',
      observacoes: 'Reunião para atualização sobre o andamento do processo.'
    },
    {
      id: 2,
      titulo: 'Audiência de conciliação',
      data: adicionarDias(2),
      hora: '14:00',
      tipo: 'Audiência',
      local: 'Fórum Central',
      processo: '0001234-56',
      advogado: 'Dr. Carlos Mendes',
      status: 'agendado',
      observacoes: 'Comparecer com documento de identificação e chegar com antecedência.'
    },
    {
      id: 3,
      titulo: 'Entrega de documentos',
      data: adicionarDias(5),
      hora: '10:00',
      tipo: 'Documentação',
      local: 'Escritório de Advocacia',
      processo: '0005678-90',
      advogado: 'Dra. Ana Souza',
      status: 'agendado',
      observacoes: 'Apresentar os documentos solicitados pelo advogado.'
    },
    {
      id: 4,
      titulo: 'Retorno sobre o processo',
      data: adicionarDias(9),
      hora: '15:30',
      tipo: 'Atendimento',
      local: 'Escritório de Advocacia',
      processo: '0001234-56',
      advogado: 'Dr. Carlos Mendes',
      status: 'agendado',
      observacoes: 'Atendimento para verificar atualizações e próximos passos do processo.'
    }
  ];
}

// ============================================================
// IDENTIFICAÇÃO DO CLIENTE
// ============================================================

function carregarUsuario() {
  for (const chave of CONFIG.usuarioKeys) {
    try {
      const usuario = JSON.parse(
        localStorage.getItem(chave) || 'null'
      );

      const nome = usuario?.nome ?? usuario?.name;

      if (nome) {
        el.nome.textContent = nome;
        el.inicial.textContent = nome.trim().charAt(0).toUpperCase();
        return;
      }
    } catch (erro) {
      console.error(erro);
    }
  }

  el.nome.textContent = 'Cliente Demonstração';
  el.inicial.textContent = 'C';
}

// ============================================================
// ESTADO DOS COMPROMISSOS
// ============================================================

function estadoDe(c) {
  if (c.status === 'concluido') return 'concluido';
  if (c.status === 'cancelado') return 'cancelado';

  if (c.data < hojeISO()) return 'atrasado';
  if (c.data === hojeISO()) return 'hoje';

  return 'agendado';
}

const ROTULOS = {
  atrasado: 'Anterior',
  hoje: 'Hoje',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  agendado: 'Agendado'
};

// ============================================================
// CARREGAMENTO
// ============================================================

function carregar() {
  el.agenda.innerHTML =
    '<div class="vazio">Carregando compromissos...</div>';

  if (CONFIG.modoDemonstracao) {
    // Não filtra pelo nome do usuário.
    // Todos os compromissos fictícios aparecem na demonstração.

    compromissos = gerarCompromissosDemonstracao();

    renderizar();

    console.log('Agenda de demonstração carregada:', compromissos);

    return;
  }
}

// ============================================================
// FILTROS
// ============================================================

function filtrar() {
  const hoje = hojeISO();

  let lista = [...compromissos];

  if (filtroAtual === 'proximos') {
    lista = lista.filter(c =>
      c.data >= hoje &&
      !['cancelado', 'concluido'].includes(c.status)
    );

  } else if (filtroAtual === 'anteriores') {
    lista = lista.filter(c =>
      c.data < hoje
    );
  }

  lista.sort((a, b) => {
    if (filtroAtual === 'anteriores') {
      return (b.data + b.hora).localeCompare(a.data + a.hora);
    }

    return (a.data + a.hora).localeCompare(b.data + b.hora);
  });

  return lista;
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================

function escaparHTML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderizar() {
  const lista = filtrar();

  const proximos = compromissos.filter(c =>
    c.data >= hojeISO() &&
    !['cancelado', 'concluido'].includes(c.status)
  ).length;

  el.sub.textContent =
    `Você tem ${proximos} compromisso(s) próximo(s) e ${compromissos.length} no total.`;

  if (!lista.length) {
    const mensagens = {
      proximos: 'Nenhum compromisso próximo.',
      anteriores: 'Nenhum compromisso anterior.',
      todos: 'Nenhum compromisso encontrado.'
    };

    el.agenda.innerHTML =
      `<div class="vazio">${mensagens[filtroAtual]}</div>`;

    return;
  }

  el.agenda.innerHTML = lista.map(c => {
    const estado = estadoDe(c);
    const { dia, mes } = partesData(c.data);

    return `
      <button type="button"
        class="item s-${estado}"
        data-id="${c.id}">

        <div class="data-bloco">
          <span class="dia">${dia}</span>
          <span class="mes">${mes}</span>
        </div>

        <div class="item-info">

          <div class="item-titulo">
            ${escaparHTML(c.titulo)}
          </div>

          <div class="item-meta">

            <span>
              <i class="fa-regular fa-clock"></i>
              ${escaparHTML(c.hora)}
            </span>

            <span>
              <i class="fa-solid fa-tag"></i>
              ${escaparHTML(c.tipo)}
            </span>

            <span>
              <i class="fa-solid fa-location-dot"></i>
              ${escaparHTML(c.local)}
            </span>

          </div>
        </div>

        <span class="badge ${estado}">
          ${ROTULOS[estado]}
        </span>

        <i class="fa-solid fa-chevron-right item-seta"></i>

      </button>
    `;
  }).join('');
}

// ============================================================
// DETALHES DO COMPROMISSO
// ============================================================

function linhaDetalhe(icone, rotulo, valor) {
  if (!valor) return '';

  return `
    <div class="linha">
      <i class="${icone}"></i>

      <div>
        <small>${rotulo}</small>
        <span>${escaparHTML(valor)}</span>
      </div>
    </div>
  `;
}

function abrirModal(c) {
  const estado = estadoDe(c);

  el.titulo.textContent = c.titulo;

  el.corpo.innerHTML =
    linhaDetalhe(
      'fa-regular fa-calendar',
      'Data',
      formatarData(c.data)
    ) +

    linhaDetalhe(
      'fa-regular fa-clock',
      'Horário',
      c.hora
    ) +

    linhaDetalhe(
      'fa-solid fa-tag',
      'Tipo',
      c.tipo
    ) +

    linhaDetalhe(
      'fa-solid fa-location-dot',
      'Local',
      c.local
    ) +

    linhaDetalhe(
      'fa-solid fa-scale-balanced',
      'Processo',
      c.processo
    ) +

    linhaDetalhe(
      'fa-solid fa-user-tie',
      'Advogado',
      c.advogado
    ) +

    linhaDetalhe(
      'fa-solid fa-circle-check',
      'Situação',
      ROTULOS[estado]
    ) +

    linhaDetalhe(
      'fa-regular fa-note-sticky',
      'Observações',
      c.observacoes
    );

  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  el.modal.hidden = true;
  el.corpo.innerHTML = '';
  document.body.style.overflow = '';
}

// ============================================================
// EVENTOS DAS ABAS
// ============================================================

el.abas.addEventListener('click', ev => {
  const botao = ev.target.closest('button[data-f]');

  if (!botao) return;

  filtroAtual = botao.dataset.f;

  el.abas.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String(b === botao));
  });

  renderizar();
});

// ============================================================
// EVENTOS DOS COMPROMISSOS
// ============================================================

el.agenda.addEventListener('click', ev => {
  const item = ev.target.closest('.item');

  if (!item) return;

  const compromisso = compromissos.find(
    c => c.id === Number(item.dataset.id)
  );

  if (compromisso) {
    abrirModal(compromisso);
  }
});

// ============================================================
// FECHAR MODAL
// ============================================================

el.fechar.addEventListener('click', fecharModal);

el.modal.addEventListener('click', ev => {
  if (ev.target === el.modal) {
    fecharModal();
  }
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !el.modal.hidden) {
    fecharModal();
  }
});

// ============================================================
// SAIR
// ============================================================

el.sair.addEventListener('click', () => {
  localStorage.removeItem(CONFIG.tokenKey);

  CONFIG.usuarioKeys.forEach(chave => {
    localStorage.removeItem(chave);
  });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

carregarUsuario();
carregar();
