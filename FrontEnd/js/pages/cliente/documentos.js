(function () {
  var API = 'https://sistema-apoio-juridico.onrender.com/documentos';
  var MAX_BYTES = 10 * 1024 * 1024;

  var token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  var docsEl = document.getElementById('docs');
  var busca = document.getElementById('busca');
  var filtro = document.getElementById('filtro');
  var filtroStatus = document.getElementById('filtroStatus');
  var resumo = document.getElementById('resumoDocumentos');
  var vazio = document.getElementById('vazio');
  var modal = document.getElementById('modal');
  var modalTitulo = document.getElementById('modalTitulo');
  var modalMeta = document.getElementById('modalMeta');
  var modalCorpo = document.getElementById('modalCorpo');
  var btnBaixar = document.getElementById('modalBaixar');
  var btnBaixarTodos = document.getElementById('btnBaixarTodos');

  var modalEnvio = document.getElementById('modalEnvio');
  var formEnvio = document.getElementById('formEnvio');
  var msgEnvio = document.getElementById('msgEnvio');
  var btnEnviarForm = document.getElementById('envioEnviar');
  var inputArquivo = document.getElementById('envioArquivo');
  var inputTitulo = document.getElementById('envioTituloDoc');

  var documentos = [];
  var aberto = null;
  var ultimoFoco = null;

  var STATUS = {
    Aprovado: { rotulo: 'Aprovado', classe: 'b-ok' },
    Pendente: { rotulo: 'Pendente', classe: 'b-warn' },
    Rejeitado: { rotulo: 'Rejeitado', classe: 'b-err' },
    Enviado: { rotulo: 'Enviado', classe: '' }
  };

  var MIME_POR_EXT = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  /* ----- utilidades ----- */
  function dataBR(str) {
    if (!str) return '—';
    var p = String(str).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : str;
  }

  function tamanho(valor) {
    var n = Number(valor);
    if (!n) return valor ? String(valor) : '';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function icone(classe) {
    var i = document.createElement('i');
    i.className = classe;
    return i;
  }

  function metaItem(iconeClasse, texto) {
    var s = document.createElement('span');
    s.appendChild(icone(iconeClasse));
    s.appendChild(document.createTextNode(texto));
    return s;
  }

  function mimeDoArquivo(arquivo) {
    if (arquivo.type) return arquivo.type;
    var ext = (arquivo.name.split('.').pop() || '').toLowerCase();
    return MIME_POR_EXT[ext] || '';
  }

  function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* ----- chamadas ao servidor ----- */
  function chamar(url, opcoes) {
    opcoes = opcoes || {};
    opcoes.headers = Object.assign(
      { Authorization: 'Bearer ' + token },
      opcoes.headers || {}
    );

    return fetch(url, opcoes).then(function (resp) {
      if (resp.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        throw new Error('Sua sessão expirou. Faça login novamente.');
      }

      return resp.json().catch(function () { return {}; }).then(function (dados) {
        if (!resp.ok) throw new Error(dados.erro || 'Erro ao processar a solicitação.');
        return dados;
      });
    });
  }

  function iconeDoArquivo(mime) {
  mime = String(mime || '');
  if (mime === 'application/pdf') return 'fa-regular fa-file-pdf';
  if (mime.indexOf('image/') === 0) return 'fa-regular fa-file-image';
  if (mime.indexOf('word') !== -1 || mime === 'application/msword') return 'fa-regular fa-file-word';
  return 'fa-regular fa-file-lines';
}

/* ----- lista ----- */
  function criarItem(d) {
    var st = STATUS[d.status] || { rotulo: d.status || '—', classe: '' };

    var item = el('button', 'doc-item');
    item.type = 'button';
    item.dataset.id = d.id;
    item.dataset.busca = ((d.titulo || '') + ' ' + (d.processo || '') + ' ' + (d.tipo || '')).toLowerCase();
    item.dataset.tipo = d.tipo || '';
    item.dataset.status = d.status || '';

    var ic = el('div', 'doc-icone');
    ic.appendChild(icone(iconeDoArquivo(d.arquivo_tipo)));

    var info = el('div', 'doc-info');
    info.appendChild(el('div', 'doc-nome', d.titulo || 'Documento'));

    var meta = el('div', 'doc-meta');
    if (d.processo) meta.appendChild(metaItem('fa-solid fa-scale-balanced', 'Proc. ' + d.processo));
    meta.appendChild(metaItem('fa-regular fa-calendar', dataBR(d.data_envio)));
    if (tamanho(d.arquivo_tamanho)) meta.appendChild(metaItem('fa-solid fa-weight-hanging', tamanho(d.arquivo_tamanho)));
    info.appendChild(meta);

    var badge = el('span', 'badge ' + st.classe, st.rotulo);
    var seta = icone('fa-solid fa-chevron-right doc-seta');

    item.append(ic, info, badge, seta);
    item.addEventListener('click', function () { abrir(d, item); });

    return item;
  }

  function renderizar() {
    docsEl.replaceChildren();
    documentos.forEach(function (d) { docsEl.appendChild(criarItem(d)); });
    aplicar();
  }

  function aplicar() {
    var termo = busca.value.trim().toLowerCase();
    var tipo = filtro.value;
    var status = filtroStatus.value;
    var visiveis = 0;

    Array.prototype.forEach.call(docsEl.children, function (item) {
      var ok = (!termo || item.dataset.busca.indexOf(termo) !== -1) &&
               (tipo === 'todos' || item.dataset.tipo === tipo) &&
               (status === 'todos' || item.dataset.status === status);
      item.style.display = ok ? '' : 'none';
      if (ok) visiveis++;
    });

    if (visiveis === 0) vazio.lastChild.textContent = ' Nenhum documento encontrado.';
    vazio.hidden = visiveis !== 0;
    resumo.textContent = visiveis === 1
      ? '1 documento encontrado'
      : visiveis + ' documentos encontrados';
  }

  function carregar() {
    return chamar(API).then(function (dados) {
      documentos = Array.isArray(dados) ? dados : [];
      renderizar();
    }).catch(function (erro) {
      console.error(erro);
      docsEl.replaceChildren();
      vazio.hidden = false;
      vazio.lastChild.textContent = ' ' + erro.message;
      resumo.textContent = '';
    });
  }

  busca.addEventListener('input', aplicar);
  filtro.addEventListener('change', aplicar);
  filtroStatus.addEventListener('change', aplicar);

  /* ----- modal de detalhes ----- */
  function detalhe(rotulo, valor) {
    var box = el('div', 'detalhe-doc');
    box.appendChild(el('small', '', rotulo));
    box.appendChild(el('strong', '', valor || '—'));
    return box;
  }

  function abrir(d, origem) {
    aberto = d;
    ultimoFoco = origem;

    var st = STATUS[d.status] || { rotulo: d.status || '—' };
    var partes = [d.tipo, dataBR(d.data_envio), tamanho(d.arquivo_tamanho)].filter(Boolean);

    modalTitulo.textContent = d.titulo || 'Documento';
    modalMeta.textContent = partes.join(' · ');

    var grade = el('div', 'detalhes-doc');
    grade.appendChild(detalhe('Processo', d.processo));
    grade.appendChild(detalhe('Tipo', d.tipo));
    grade.appendChild(detalhe('Data', dataBR(d.data_envio)));
    grade.appendChild(detalhe('Situação', st.rotulo));
    grade.appendChild(detalhe('Enviado por', d.origem === 'cliente' ? 'Você' : 'Escritório'));

    modalCorpo.replaceChildren(grade);

    if (d.descricao) {
      var desc = el('div', 'preview-aviso', d.descricao);
      modalCorpo.appendChild(desc);
    }

    btnBaixar.disabled = false;
    btnBaixar.title = d.arquivo_path ? '' : 'Sem arquivo anexado: baixa a ficha do documento';

    modal.hidden = false;
    document.getElementById('modalFechar').focus();
  }

  function fechar() {
    modal.hidden = true;
    if (ultimoFoco) ultimoFoco.focus();
  }

  document.getElementById('modalFechar').addEventListener('click', fechar);
  modal.addEventListener('click', function (e) { if (e.target === modal) fechar(); });

  btnBaixar.addEventListener('click', function () {
    if (!aberto) return;

    baixarUm(aberto).catch(function (erro) { alert(erro.message); });
  });

  /* ----- baixar todos ----- */
  function baixarUm(d) {
    return chamar(API + '/' + encodeURIComponent(d.id) + '/arquivo')
      .then(function (dados) {
        var a = document.createElement('a');
        var urlTemporaria = null;

        if (dados.url) {
          a.href = dados.url;
        } else {
          // Documento sem arquivo anexado: baixa a ficha em texto.
          var blob = new Blob(['\uFEFF' + (dados.texto || '')], { type: 'text/plain;charset=utf-8' });
          urlTemporaria = URL.createObjectURL(blob);
          a.href = urlTemporaria;
        }

        a.download = dados.nome || 'documento';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();

        if (urlTemporaria) setTimeout(function () { URL.revokeObjectURL(urlTemporaria); }, 1000);
      });
  }

  btnBaixarTodos.addEventListener('click', function () {
    var idsVisiveis = [];

    Array.prototype.forEach.call(docsEl.children, function (item) {
      if (item.style.display !== 'none') idsVisiveis.push(item.dataset.id);
    });

    var lista = documentos.filter(function (d) {
      return idsVisiveis.indexOf(String(d.id)) !== -1;
    });

    if (!lista.length) {
      alert('Nenhum documento para baixar.');
      return;
    }

    var rotulo = btnBaixarTodos.querySelector('span');
    var falhas = 0;
    var fila = Promise.resolve();

    btnBaixarTodos.disabled = true;

    lista.forEach(function (d, i) {
      fila = fila.then(function () {
        rotulo.textContent = 'Baixando ' + (i + 1) + '/' + lista.length;
        return baixarUm(d).catch(function (erro) {
          console.error(erro);
          falhas++;
        });
      }).then(function () { return esperar(800); });
    });

    fila.then(function () {
      rotulo.textContent = 'Baixar todos';
      btnBaixarTodos.disabled = false;

      if (falhas) {
        alert(falhas + ' arquivo(s) não puderam ser baixados.');
      }
    });
  });

  /* ----- modal de envio ----- */
  function abrirEnvio() {
    formEnvio.reset();
    msgEnvio.textContent = '';
    msgEnvio.className = 'msg-envio';
    modalEnvio.hidden = false;
    inputArquivo.focus();
  }

  function fecharEnvio() {
    modalEnvio.hidden = true;
    document.getElementById('btnEnviar').focus();
  }

  function mensagem(texto, tipo) {
    msgEnvio.textContent = texto;
    msgEnvio.className = 'msg-envio ' + (tipo || '');
  }

  document.getElementById('btnEnviar').addEventListener('click', abrirEnvio);
  document.getElementById('envioFechar').addEventListener('click', fecharEnvio);
  document.getElementById('envioCancelar').addEventListener('click', fecharEnvio);
  modalEnvio.addEventListener('click', function (e) { if (e.target === modalEnvio) fecharEnvio(); });

  // Sugere o título a partir do nome do arquivo
  inputArquivo.addEventListener('change', function () {
    var f = inputArquivo.files[0];
    if (f && !inputTitulo.value.trim()) {
      inputTitulo.value = f.name.replace(/\.[^.]+$/, '');
    }
  });

  formEnvio.addEventListener('submit', function (e) {
    e.preventDefault();

    var arquivo = inputArquivo.files[0];
    var titulo = inputTitulo.value.trim();
    var tipo = document.getElementById('envioTipo').value;
    var processo = document.getElementById('envioProcesso').value.trim();

    if (!arquivo) return mensagem('Escolha um arquivo.', 'erro');
    if (!titulo) return mensagem('Informe o título do documento.', 'erro');
    if (arquivo.size > MAX_BYTES) return mensagem('O arquivo deve ter no máximo 10 MB.', 'erro');

    var mime = mimeDoArquivo(arquivo);
    if (!mime || Object.keys(MIME_POR_EXT).every(function (k) { return MIME_POR_EXT[k] !== mime; })) {
      return mensagem('Formato não permitido. Envie PDF, JPG, PNG, DOC ou DOCX.', 'erro');
    }

    var params = new URLSearchParams({
      titulo: titulo,
      tipo: tipo,
      processo: processo,
      nome: arquivo.name
    });

    btnEnviarForm.disabled = true;
    mensagem('Enviando...', '');

    chamar(API + '/cliente?' + params.toString(), {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: arquivo
    }).then(function () {
      fecharEnvio();
      return carregar();
    }).catch(function (erro) {
      mensagem(erro.message, 'erro');
    }).then(function () {
      btnEnviarForm.disabled = false;
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modalEnvio.hidden) fecharEnvio();
    else if (!modal.hidden) fechar();
  });

  carregar();
})();