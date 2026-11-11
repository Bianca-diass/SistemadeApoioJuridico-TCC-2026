// ============================================================
// CONFIG: único bloco com suposições. Ajuste aqui se algo não bater.
// ============================================================
const CONFIG = {
  tokenKey: 'token',                              // chave do JWT no localStorage
  listar: '/documentos',                          // GET: lista de documentos do cliente
  enviar: '/documentos',                          // POST (multipart): envio
  campoUpload: 'arquivo',                         // nome do campo no FormData
  arquivo: (id) => `/documentos/${id}/arquivo`,   // GET: conteúdo do arquivo
  login: 'login.html',
  maxBytes: 10 * 1024 * 1024,
  tiposOk: ['application/pdf', 'image/jpeg', 'image/png']
};

const el = {
  docs: document.getElementById('docs'),
  busca: document.getElementById('busca'),
  filtro: document.getElementById('filtro'),
  input: document.getElementById('arquivo'),
  modal: document.getElementById('modal'),
  titulo: document.getElementById('modalTitulo'),
  meta: document.getElementById('modalMeta'),
  corpo: document.getElementById('modalCorpo'),
  baixar: document.getElementById('modalBaixar'),
  fechar: document.getElementById('modalFechar'),
  toast: document.getElementById('toast')
};

let documentos = [];
let blobAtual = null; // { url, nome }

// ---------- utilitários ----------
function escaparHTML(t) {
  return String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function obterData(d) {
  const valor = d.data_envio ?? d.dataEnvio ?? d.data_upload ?? d.dataUpload ??
    d.data_criacao ?? d.dataCriacao ?? d.criado_em ?? d.criadoEm ??
    d.created_at ?? d.createdAt ?? d.data ?? '';
  return valor ? String(valor).substring(0, 10) : '';
}

function formatarData(valor) {
  if (!valor) return '—';
  const [a, m, dia] = String(valor).substring(0, 10).split('-');
  return (a && m && dia) ? `${dia}/${m}/${a}` : '—';
}

function mostrarToast(msg, tipo = 'ok') {
  el.toast.textContent = msg;
  el.toast.className = `toast ${tipo}`;
  el.toast.hidden = false;
  clearTimeout(mostrarToast.t);
  mostrarToast.t = setTimeout(() => (el.toast.hidden = true), 3500);
}

// ---------- API ----------
async function fetchAuth(url, opcoes = {}) {
  const token = localStorage.getItem(CONFIG.tokenKey);
  const res = await fetch(url, {
    ...opcoes,
    headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${token}` }
  });
  if (res.status === 401) {
    mostrarToast('Sessão expirada. Faça login novamente.', 'erro');
    setTimeout(() => (window.location.href = CONFIG.login), 1200);
    throw new Error('401');
  }
  return res;
}

// ---------- padronização (snake_case e camelCase) ----------
function urlDireta(d) {
  const u = d.url ?? d.url_arquivo ?? d.urlArquivo ?? d.caminho ?? d.caminho_arquivo ?? d.caminhoArquivo ?? '';
  if (!u || /^[a-zA-Z]:|\\/.test(u)) return '';          // ignora caminho de disco
  if (/^https?:\/\//i.test(u) || u.startsWith('/')) return u;
  return `/${u}`;
}

function padronizar(d, indice) {
  return {
    k: indice,
    id: d.id,
    nome: d.nome_arquivo ?? d.nomeArquivo ?? d.nome ?? d.titulo ?? 'Documento',
    tipo: d.tipo ?? d.tipo_documento ?? d.tipoDocumento ?? '',
    processo: d.numero_processo ?? d.numeroProcesso ?? d.processo ?? '',
    status: String(d.status ?? 'Pendente'),
    data: obterData(d),
    url: urlDireta(d)
  };
}

// ---------- listagem ----------
async function carregar() {
  el.docs.innerHTML = '<div class="vazio"><i class="fa-solid fa-spinner fa-spin"></i>Carregando...</div>';
  try {
    const res = await fetchAuth(CONFIG.listar);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    const lista = Array.isArray(dados) ? dados : (dados.documentos ?? dados.data ?? []);
    documentos = lista.map(padronizar);
    montarFiltro();
    renderizar();
  } catch (e) {
    if (e.message === '401') return;
    el.docs.innerHTML = '<div class="erro"><i class="fa-solid fa-triangle-exclamation"></i>Não foi possível carregar os documentos.</div>';
    console.error('Erro ao carregar documentos:', e);
  }
}

function montarFiltro() {
  const atual = el.filtro.value;
  const tipos = [...new Set(documentos.map(d => d.tipo).filter(Boolean))].sort();
  el.filtro.innerHTML = '<option value="todos">Todos os tipos</option>' +
    tipos.map(t => `<option value="${escaparHTML(t)}">${escaparHTML(t)}</option>`).join('');
  if (tipos.includes(atual)) el.filtro.value = atual;
}

function renderizar() {
  const termo = el.busca.value.trim().toLowerCase();
  const filtro = el.filtro.value;

  const lista = documentos.filter(d => {
    const okTipo = filtro === 'todos' || d.tipo === filtro;
    const okBusca = !termo ||
      d.nome.toLowerCase().includes(termo) ||
      String(d.processo).toLowerCase().includes(termo);
    return okTipo && okBusca;
  });

  if (!lista.length) {
    el.docs.innerHTML = '<div class="vazio"><i class="fa-regular fa-folder-open"></i>Nenhum documento encontrado.</div>';
    return;
  }

  el.docs.innerHTML = lista.map(d => {
    const statusClasse = d.status.toLowerCase().replace(/\s+/g, '-');
    const statusTexto = d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase();
    const meta = [
      `Enviado em ${formatarData(d.data)}`,
      d.tipo && escaparHTML(d.tipo),
      d.processo && `Processo ${escaparHTML(d.processo)}`
    ].filter(Boolean).join(' · ');

    return `
      <article class="doc">
        <div class="doc-info">
          <div class="doc-nome">${escaparHTML(d.nome)}</div>
          <div class="doc-meta">${meta}</div>
        </div>
        <div class="doc-dir">
          <span class="badge ${escaparHTML(statusClasse)}">${escaparHTML(statusTexto)}</span>
          <button class="btn-ver" data-acao="ver" data-k="${d.k}"><i class="fa-regular fa-eye"></i> Visualizar</button>
          <button class="btn-ico" data-acao="baixar" data-k="${d.k}" title="Baixar" aria-label="Baixar"><i class="fa-solid fa-download"></i></button>
        </div>
      </article>`;
  }).join('');
}

// ---------- arquivo (blob com token) ----------
async function obterBlob(doc) {
  const candidatas = [doc.url, doc.id != null ? CONFIG.arquivo(doc.id) : ''].filter(Boolean);
  let ultimoErro = new Error('Sem origem do arquivo');
  for (const url of candidatas) {
    try {
      const res = await fetchAuth(url);
      if (res.ok) return await res.blob();
      ultimoErro = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e.message === '401') throw e;
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

function tipoDoBlob(blob, nome) {
  const t = (blob.type || '').toLowerCase();
  const ext = String(nome).split('.').pop().toLowerCase();
  if (t.includes('pdf') || ext === 'pdf') return 'pdf';
  if (t.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(ext)) return 'imagem';
  return 'outro';
}

function baixarUrl(url, nome) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function baixar(doc) {
  try {
    const blob = await obterBlob(doc);
    const url = URL.createObjectURL(blob);
    baixarUrl(url, doc.nome);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    if (e.message !== '401') mostrarToast('Arquivo indisponível para download.', 'erro');
    console.error(e);
  }
}

// ---------- modal ----------
function limparBlob() {
  if (blobAtual) {
    URL.revokeObjectURL(blobAtual.url);
    blobAtual = null;
  }
}

async function abrirModal(doc) {
  el.titulo.textContent = doc.nome;
  el.meta.textContent = [doc.tipo, doc.processo && `Processo ${doc.processo}`, formatarData(doc.data)]
    .filter(Boolean).join(' · ');
  el.corpo.innerHTML = '<div class="modal-msg"><i class="fa-solid fa-spinner fa-spin"></i>Carregando documento...</div>';
  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';

  try {
    const blobOriginal = await obterBlob(doc);
    const tipo = tipoDoBlob(blobOriginal, doc.nome);
    const blob = tipo === 'pdf' && !/pdf/i.test(blobOriginal.type)
      ? new Blob([blobOriginal], { type: 'application/pdf' })
      : blobOriginal;

    limparBlob();
    const url = URL.createObjectURL(blob);
    blobAtual = { url, nome: doc.nome };

    if (tipo === 'pdf') {
      el.corpo.innerHTML = `<iframe src="${url}" title="${escaparHTML(doc.nome)}"></iframe>`;
    } else if (tipo === 'imagem') {
      el.corpo.innerHTML = `<img src="${url}" alt="${escaparHTML(doc.nome)}">`;
    } else {
      el.corpo.innerHTML = '<div class="modal-msg"><i class="fa-regular fa-file"></i>Pré-visualização indisponível para este formato.<br>Use o botão Baixar.</div>';
    }
  } catch (e) {
    if (e.message === '401') return;
    el.corpo.innerHTML = '<div class="modal-msg"><i class="fa-solid fa-triangle-exclamation"></i>Arquivo indisponível para este documento.</div>';
    console.error('Erro ao abrir documento:', e);
  }
}

function fecharModal() {
  el.modal.hidden = true;
  el.corpo.innerHTML = '';
  document.body.style.overflow = '';
  limparBlob();
}

// ---------- upload ----------
async function enviar(arquivo) {
  if (!CONFIG.tiposOk.includes(arquivo.type)) {
    mostrarToast('Formato inválido. Envie PDF, JPG ou PNG.', 'erro');
    return;
  }
  if (arquivo.size > CONFIG.maxBytes) {
    mostrarToast('Arquivo maior que 10 MB.', 'erro');
    return;
  }
  const fd = new FormData();
  fd.append(CONFIG.campoUpload, arquivo);

  try {
    const res = await fetchAuth(CONFIG.enviar, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mostrarToast('Documento enviado com sucesso.');
    await carregar();
  } catch (e) {
    if (e.message !== '401') mostrarToast('Falha ao enviar o documento.', 'erro');
    console.error(e);
  }
}

// ---------- eventos ----------
el.docs.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-acao]');
  if (!btn) return;
  const doc = documentos[Number(btn.dataset.k)];
  if (!doc) return;
  if (btn.dataset.acao === 'ver') abrirModal(doc);
  if (btn.dataset.acao === 'baixar') baixar(doc);
});

el.busca.addEventListener('input', renderizar);
el.filtro.addEventListener('change', renderizar);

el.input.addEventListener('change', () => {
  const arquivo = el.input.files[0];
  if (arquivo) enviar(arquivo);
  el.input.value = '';
});

el.baixar.addEventListener('click', () => {
  if (blobAtual) baixarUrl(blobAtual.url, blobAtual.nome);
});
el.fechar.addEventListener('click', fecharModal);
el.modal.addEventListener('click', (ev) => { if (ev.target === el.modal) fecharModal(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !el.modal.hidden) fecharModal(); });

carregar();