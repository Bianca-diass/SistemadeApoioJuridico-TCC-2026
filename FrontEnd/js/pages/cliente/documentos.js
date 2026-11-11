
// ============================================================
// CONFIGURAÇÕES
// ============================================================

const CONFIG = {
  usuarioKeys: ['usuario', 'user'],
  tokenKey: 'token'
};

const el = {
  docs: document.getElementById('docs'),
  busca: document.getElementById('busca'),
  filtro: document.getElementById('filtro'),
  resumo: document.getElementById('resumoDocumentos'),

  nome: document.getElementById('nomeUsuario'),
  inicial: document.getElementById('inicialUsuario'),
  sair: document.getElementById('btnSair'),

  modal: document.getElementById('modal'),
  modalTitulo: document.getElementById('modalTitulo'),
  modalMeta: document.getElementById('modalMeta'),
  modalCorpo: document.getElementById('modalCorpo'),
  modalBaixar: document.getElementById('modalBaixar'),
  modalFechar: document.getElementById('modalFechar')
};

let documentos = [];
let documentoAtual = null;

// ============================================================
// DATAS
// ============================================================

function dataAnterior(dias) {
  const data = new Date();
  data.setHours(12, 0, 0, 0);
  data.setDate(data.getDate() - dias);

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

// ============================================================
// DOCUMENTOS FICTÍCIOS
// ============================================================

function gerarDocumentosDemonstracao() {
  return [
    {
      id: 1,
      nome: 'Documento de Identidade.pdf',
      tipo: 'Identidade',
      extensao: 'PDF',
      data: dataAnterior(12),
      processo: '0001234-56',
      tamanho: '1,2 MB',
      status: 'Disponível',
      conteudo: 'Documento de identificação apresentado pelo cliente para identificação e registro no processo.'
    },

    {
      id: 2,
      nome: 'Comprovante de Residência.pdf',
      tipo: 'Comprovante',
      extensao: 'PDF',
      data: dataAnterior(8),
      processo: '0001234-56',
      tamanho: '850 KB',
      status: 'Disponível',
      conteudo: 'Comprovante de residência utilizado para confirmar o endereço cadastrado do cliente.'
    },

    {
      id: 3,
      nome: 'Procuração.pdf',
      tipo: 'Procuração',
      extensao: 'PDF',
      data: dataAnterior(5),
      processo: '0005678-90',
      tamanho: '980 KB',
      status: 'Disponível',
      conteudo: 'Instrumento de procuração para representação do cliente em procedimentos jurídicos.'
    },

    {
      id: 4,
      nome: 'Contrato de Honorários.pdf',
      tipo: 'Contrato',
      extensao: 'PDF',
      data: dataAnterior(2),
      processo: '0005678-90',
      tamanho: '1,5 MB',
      status: 'Disponível',
      conteudo: 'Contrato demonstrativo contendo informações sobre a prestação de serviços advocatícios e honorários.'
    }
  ];
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function escaparHTML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iconeDocumento(extensao) {
  if (extensao === 'PDF') {
    return 'fa-solid fa-file-pdf';
  }

  return 'fa-solid fa-file';
}

// ============================================================
// USUÁRIO
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
        el.inicial.textContent =
          nome.trim().charAt(0).toUpperCase();

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
// CARREGAMENTO DOS DOCUMENTOS
// ============================================================

function carregarDocumentos() {
  documentos = gerarDocumentosDemonstracao();

  atualizarFiltros();
  renderizarDocumentos();
}

// ============================================================
// FILTROS
// ============================================================

function atualizarFiltros() {
  const tipos = [...new Set(
    documentos.map(doc => doc.tipo)
  )];

  el.filtro.innerHTML = `
    <option value="todos">Todos os tipos</option>

    ${tipos.map(tipo => `
      <option value="${escaparHTML(tipo)}">
        ${escaparHTML(tipo)}
      </option>
    `).join('')}
  `;
}

function filtrarDocumentos() {
  const pesquisa = el.busca.value.trim().toLowerCase();
  const tipo = el.filtro.value;

  return documentos.filter(doc => {
    const correspondePesquisa =
      doc.nome.toLowerCase().includes(pesquisa) ||
      doc.processo.toLowerCase().includes(pesquisa) ||
      doc.tipo.toLowerCase().includes(pesquisa);

    const correspondeTipo =
      tipo === 'todos' || doc.tipo === tipo;

    return correspondePesquisa && correspondeTipo;
  });
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================

function renderizarDocumentos() {
  const lista = filtrarDocumentos();

  el.resumo.textContent =
    `${documentos.length} documento(s) cadastrado(s).`;

  if (!lista.length) {
    el.docs.innerHTML = `
      <div class="vazio">
        <i class="fa-regular fa-folder-open"></i>
        Nenhum documento encontrado.
      </div>
    `;

    return;
  }

  el.docs.innerHTML = lista.map(doc => `
    <div
      class="doc-item"
      data-id="${doc.id}"
      role="button"
      tabindex="0"
      aria-label="Visualizar ${escaparHTML(doc.nome)}">

      <div class="doc-icone">
        <i class="${iconeDocumento(doc.extensao)}"></i>
      </div>

      <div class="doc-info">

        <div class="doc-nome">
          ${escaparHTML(doc.nome)}
        </div>

        <div class="doc-meta">

          <span>
            <i class="fa-regular fa-calendar"></i>
            ${formatarData(doc.data)}
          </span>

          <span>
            <i class="fa-solid fa-scale-balanced"></i>
            Processo ${escaparHTML(doc.processo)}
          </span>

          <span>
            <i class="fa-solid fa-file"></i>
            ${escaparHTML(doc.tamanho)}
          </span>

        </div>

      </div>

      <span class="doc-status">
        ${escaparHTML(doc.status)}
      </span>

      <i class="fa-solid fa-chevron-right doc-seta"></i>

    </div>
  `).join('');
}

// ============================================================
// PRÉ-VISUALIZAÇÃO
// ============================================================

function gerarPreview(doc) {
  return `
    <div class="preview-aviso">
      <i class="fa-solid fa-circle-info"></i>
      Documento fictício para demonstração do sistema.
    </div>

    <div class="documento-preview">

      <div class="preview-topo">
        <h4>DOCUMENTO JURÍDICO</h4>
        <p>SISTEMA DE APOIO JURÍDICO DIGITAL</p>
      </div>

      <div class="preview-conteudo">

        <p>
          <strong>
            ${escaparHTML(doc.nome.replace(/\.pdf$/i, ''))}
          </strong>
        </p>

        <br>

        <p>
          Este documento faz parte do cadastro demonstrativo
          do Sistema de Apoio Jurídico Digital.
        </p>

        <br>

        <p>${escaparHTML(doc.conteudo)}</p>

        <br>

        <p>
          <strong>Processo:</strong>
          ${escaparHTML(doc.processo)}
        </p>

        <p>
          <strong>Tipo:</strong>
          ${escaparHTML(doc.tipo)}
        </p>

        <p>
          <strong>Data de registro:</strong>
          ${formatarData(doc.data)}
        </p>

      </div>

      <div class="preview-assinatura">
        ______________________________
        <p>Documento demonstrativo</p>
      </div>

    </div>
  `;
}

// ============================================================
// ABRIR DOCUMENTO
// ============================================================

function abrirDocumento(doc) {
  documentoAtual = doc;

  el.modalTitulo.textContent = doc.nome;

  el.modalMeta.textContent =
    `${doc.tipo} • ${formatarData(doc.data)} • ${doc.tamanho}`;

  const detalhes = `
    <div class="detalhes-doc">

      <div class="detalhe-doc">
        <small>Tipo</small>
        <strong>${escaparHTML(doc.tipo)}</strong>
      </div>

      <div class="detalhe-doc">
        <small>Processo</small>
        <strong>${escaparHTML(doc.processo)}</strong>
      </div>

      <div class="detalhe-doc">
        <small>Data de registro</small>
        <strong>${formatarData(doc.data)}</strong>
      </div>

      <div class="detalhe-doc">
        <small>Situação</small>
        <strong>${escaparHTML(doc.status)}</strong>
      </div>

    </div>
  `;

  el.modalCorpo.innerHTML =
    detalhes + gerarPreview(doc);

  el.modal.hidden = false;

  document.body.style.overflow = 'hidden';
}

// ============================================================
// BAIXAR DOCUMENTO DEMONSTRATIVO
// ============================================================

function baixarDocumento() {
  if (!documentoAtual) return;

  const doc = documentoAtual;

  const conteudo = `
SISTEMA DE APOIO JURÍDICO DIGITAL

${doc.nome}

Tipo: ${doc.tipo}
Processo: ${doc.processo}
Data: ${formatarData(doc.data)}
Situação: ${doc.status}

Descrição:
${doc.conteudo}

DOCUMENTO FICTÍCIO PARA DEMONSTRAÇÃO DO TCC.
  `;

  const blob = new Blob(
    [conteudo],
    { type: 'text/plain;charset=utf-8' }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download =
    doc.nome.replace(/\.pdf$/i, '') + '.txt';

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ============================================================
// FECHAR MODAL
// ============================================================

function fecharModal() {
  el.modal.hidden = true;
  el.modalCorpo.innerHTML = '';

  documentoAtual = null;

  document.body.style.overflow = '';
}

// ============================================================
// EVENTOS DE PESQUISA
// ============================================================

el.busca.addEventListener('input', renderizarDocumentos);

el.filtro.addEventListener('change', renderizarDocumentos);

// ============================================================
// EVENTOS DA LISTA
// ============================================================

function selecionarDocumento(item) {
  const doc = documentos.find(
    documento => documento.id === Number(item.dataset.id)
  );

  if (doc) {
    abrirDocumento(doc);
  }
}

el.docs.addEventListener('click', ev => {
  const item = ev.target.closest('.doc-item');

  if (item) selecionarDocumento(item);
});

el.docs.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;

  const item = ev.target.closest('.doc-item');

  if (!item) return;

  ev.preventDefault();

  selecionarDocumento(item);
});

// ============================================================
// EVENTOS DO MODAL
// ============================================================

el.modalBaixar.addEventListener('click', baixarDocumento);

el.modalFechar.addEventListener('click', fecharModal);

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
carregarDocumentos();
