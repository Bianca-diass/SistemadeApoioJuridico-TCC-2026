function renderCompromissosDashboard() {
  const el = document.getElementById('lista-compromissos');
  const lista = getProximos(4);

  if (!lista.length) {
    el.innerHTML = '<p>Nenhum compromisso futuro.</p>';
    return;
  }

  el.innerHTML = lista.map(c => {
    const { dia, mes } = getDiaMes(c);
    return `
      <div class="compromisso-item">           <!-- use as classes que você já tem -->
        <div class="data-box"><strong>${dia}</strong><span>${mes}</span></div>
        <div>
          <h4>${c.titulo}</h4>
          <p>${c.local} · <span class="hora">${c.hora.replace(':', 'h')}</span></p>
        </div>
      </div>`;
  }).join('');
}

renderCompromissosDashboard();
setInterval(renderCompromissosDashboard, 60000); // atualiza a cada minuto