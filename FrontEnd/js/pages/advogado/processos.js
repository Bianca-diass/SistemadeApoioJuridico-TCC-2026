
import {
    listarProcessos,
    excluirProcesso
} from "../../services/processoService.js";

// ELEMENTOS
const listaProcessos = document.getElementById("listaProcessos");
const totalProcessos = document.getElementById("totalProcessos");
const totalIntimacoes = document.getElementById("totalIntimacoes");
const totalAndamento = document.getElementById("totalAndamento");
const buscarProcesso = document.getElementById("buscarProcesso");

let processos = [];

// NORMALIZAR TEXTO
function normalizar(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

// ESCAPAR HTML PARA EVITAR INJEÇÃO
function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

// VERIFICAR INTIMAÇÃO
function possuiIntimacao(valor) {
    return valor === true ||
        valor === 1 ||
        ["true", "1", "sim", "pendente"].includes(normalizar(valor));
}

// FORMATAR DATA
function formatarData(data) {
    if (!data) return "-";

    const valor = String(data);
    const partes = valor.substring(0, 10).split("-");

    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
}

// VERIFICAR PRAZO
function verificarPrazo(data) {
    if (!data) return "sem-prazo";

    const prazo = new Date(`${String(data).substring(0, 10)}T00:00:00`);
    if (Number.isNaN(prazo.getTime())) return "sem-prazo";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diferenca = Math.ceil((prazo - hoje) / 86400000);

    if (diferenca < 0) return "vencido";
    if (diferenca <= 7) return "proximo";
    return "normal";
}

// ATUALIZAR CARDS
function atualizarCards() {
    if (totalProcessos) {
        totalProcessos.textContent = processos.length;
    }

    if (totalIntimacoes) {
        totalIntimacoes.textContent =
            processos.filter(processo => possuiIntimacao(processo.intimacao)).length;
    }

    if (totalAndamento) {
        totalAndamento.textContent =
            processos.filter(processo =>
                normalizar(processo.status) === "em andamento"
            ).length;
    }
}

// CARREGAR PROCESSOS
async function carregarProcessos() {
    if (listaProcessos) {
        listaProcessos.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:30px">
                    Carregando processos...
                </td>
            </tr>
        `;
    }

    try {
        const dados = await listarProcessos();
        processos = Array.isArray(dados) ? dados : [];
        atualizarCards();
        aplicarFiltros();
    } catch (erro) {
        console.error("Erro ao carregar processos:", erro);

        if (listaProcessos) {
            listaProcessos.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center;padding:30px">
                        Não foi possível carregar os processos. Verifique a conexão com a API.
                    </td>
                </tr>
            `;
        }
    }
}

// FILTRAR PROCESSOS
function aplicarFiltros() {
    const termo = normalizar(buscarProcesso?.value);

    const filtrados = processos.filter(processo => {
        const campos = [
            processo.numeroProcesso,
            processo.cliente,
            processo.comarca,
            processo.tribunal,
            processo.status,
            processo.tipoManifestacao
        ];

        return campos.some(campo => normalizar(campo).includes(termo));
    });

    renderizarProcessos(filtrados);
}

// RENDERIZAR TABELA
function renderizarProcessos(lista) {
    if (!listaProcessos) return;

    listaProcessos.innerHTML = "";

    if (!lista.length) {
        listaProcessos.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:30px">
                    Nenhum processo encontrado.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach(processo => {
        const linha = document.createElement("tr");
        const id = processo.id;
        const numero = escaparHTML(processo.numeroProcesso || "-");
        const cliente = escaparHTML(processo.cliente || "-");
        const tribunal = escaparHTML(processo.tribunal || processo.comarca || "-");
        const status = escaparHTML(processo.status || "Sem status");
        const manifestacao = escaparHTML(processo.tipoManifestacao || "Nenhuma");
        const movimentacao = escaparHTML(processo.ultimaMovimentacao || "-");
        const intimacao = possuiIntimacao(processo.intimacao);
        const prazoEstado = verificarPrazo(processo.prazo);
        const prazo = formatarData(processo.prazo);

        let textoPrazo = prazo;

        if (prazoEstado === "vencido") {
            textoPrazo += " (Vencido)";
        } else if (prazoEstado === "proximo") {
            textoPrazo += " (Próximo)";
        }

        linha.innerHTML = `
            <td>${numero}</td>
            <td>${cliente}</td>
            <td>${tribunal}</td>
            <td><span class="status">${status}</span></td>
            <td>${manifestacao}</td>
            <td>${movimentacao}</td>
            <td>
                <span class="${intimacao ? "badge-alerta" : "badge-ok"}">
                    ${intimacao ? "Nova intimação" : "Sem pendências"}
                </span>
            </td>
            <td class="prazo-${prazoEstado}">${escaparHTML(textoPrazo)}</td>
            <td>
                <button class="btn-visualizar" title="Visualizar" data-id="${escaparHTML(id)}">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-editar" title="Editar" data-id="${escaparHTML(id)}">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-excluir" title="Excluir" data-id="${escaparHTML(id)}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        listaProcessos.appendChild(linha);
    });
}

// EVENTOS DA TABELA
listaProcessos?.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-id]");
    if (!botao) return;

    const id = botao.dataset.id;
    if (!id) return;

    if (botao.classList.contains("btn-visualizar")) {
        window.location.href =
            `visualizar-processo-adv.html?id=${encodeURIComponent(id)}`;
        return;
    }

    if (botao.classList.contains("btn-editar")) {
        window.location.href =
            `cadastro-processo-adv.html?id=${encodeURIComponent(id)}`;
        return;
    }

    if (botao.classList.contains("btn-excluir")) {
        if (!confirm("Deseja realmente excluir este processo?")) return;

        botao.disabled = true;

        try {
            await excluirProcesso(id);

            processos = processos.filter(
                processo => String(processo.id) !== String(id)
            );

            atualizarCards();
            aplicarFiltros();
        } catch (erro) {
            console.error("Erro ao excluir processo:", erro);
            alert("Não foi possível excluir o processo.");
            botao.disabled = false;
        }
    }
});

// PESQUISA
buscarProcesso?.addEventListener("input", aplicarFiltros);

// INICIALIZAÇÃO
carregarProcessos();
