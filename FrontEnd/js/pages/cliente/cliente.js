const list = document.getElementById('list');
if (list) {
  let filtro = 'all';
  const aplicar = () => list.querySelectorAll('.nt').forEach(n => n.hidden = filtro === 'new' && n.classList.contains('read'));
  const contar = () => {
    const n = list.querySelectorAll('.nt:not(.read)').length;
    document.getElementById('qtd-notif').textContent = n;
    document.getElementById('sub').textContent = `Você tem 1 pendência e ${n} notificações novas.`;
  };
  list.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    b.parentElement.classList.add('read');
    b.remove(); contar(); aplicar();
  });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
    aplicar();
  }));
}