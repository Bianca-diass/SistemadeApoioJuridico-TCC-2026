// js/pages/advogado/clientes.js

import { clienteController } from "../../controllers/clienteController.js";

// ======================================================
// ELEMENTOS DA PÁGINA
// ======================================================

const inputPesquisa = document.getElementById("buscarCliente");
const filtroStatus = document.getElementById("filtroStatus");
const listaClientes = document.getElementById("listaClientes");

const totalClientes = document.getElementById("totalClientes");
const totalCidades = document.getElementById("totalCidades");
const clientesAtivos = document.getElementById("clientesAtivos");

let pesquisa = "";
let statusSelecionado = "todos";

// ======================================================
// ATUALIZAR CARDS
// ======================================================

function atualizarCards(clientes = []) {
    if (!Array.isArray(clientes)) clientes = [];

    if (totalClientes) {
        totalClientes.textContent = clientes.length;
    }

    const cidades = new Set();

    clientes.forEach(cliente => {
        if (cliente.cidade) {
            cidades.add(
                String(cliente.cidade).trim().toLowerCase()
            );
        }
    });

    if (totalCidades) {
        totalCidades.textContent = cidades.size;
    }

    const ativos = clientes.filter(cliente =>
        String(cliente.status || "").toLowerCase() === "ativo"
    );

    if (clientesAtivos) {
        clientesAtivos.textContent = ativos.length;
    }
}

// ======================================================
// RENDERIZAR TABELA
// ======================================================

function renderizarLista(clientes = []) {
    if (!listaClientes) return;

    listaClientes.innerHTML = "";

    if (!Array.isArray(clientes)) clientes = [];

    atualizarCards(clientes);

    const textoPesquisa = pesquisa.trim().toLowerCase();

    const listaFiltrada = clientes.filter(cliente => {
        const nome = String(cliente.nome || "").toLowerCase();
        const telefone = String(cliente.telefone || "").toLowerCase();
        const email = String(cliente.email || "").toLowerCase();
        const endereco = String(cliente.endereco || "").toLowerCase();
        const cidade = String(cliente.cidade || "").toLowerCase();
        const estado = String(cliente.estado || "").toLowerCase();

        const correspondePesquisa =
            nome.includes(textoPesquisa) ||
            telefone.includes(textoPesquisa) ||
            email.includes(textoPesquisa) ||
            endereco.includes(textoPesquisa) ||
            cidade.includes(textoPesquisa) ||
            estado.includes(textoPesquisa);

        const status = String(cliente.status || "").toLowerCase();

        const correspondeStatus =
            statusSelecionado === "todos" ||
            status === statusSelecionado;

        return correspondePesquisa && correspondeStatus;
    });

    // ==================================================
    // NENHUM CLIENTE
    // ==================================================

    if (listaFiltrada.length === 0) {
        listaClientes.innerHTML = `
            <tr>
                <td colspan="7" class="semClientes">
                    Nenhum cliente encontrado.
                </td>
            </tr>
        `;
        return;
    }

    // ==================================================
    // CRIAR LINHAS
    // ==================================================

    listaFiltrada.forEach(cliente => {
        const nome = cliente.nome || "-";
        const iniciais = nome.substring(0, 2).toUpperCase();

        const cidadeUf = [
            cliente.cidade,
            cliente.estado
        ].filter(Boolean).join(" / ") || "-";

        const status = String(cliente.status || "ativo").toLowerCase();
        const statusTexto =
            status.charAt(0).toUpperCase() + status.slice(1);

        const linha = document.createElement("tr");

        // Cria as células usando textContent para evitar
        // interpretar os dados dos clientes como HTML.
        const celulaNome = document.createElement("td");
        const clienteInfo = document.createElement("div");
        clienteInfo.className = "clienteInfo";

        const avatar = document.createElement("div");
        avatar.className = "avatarCliente";
        avatar.textContent = iniciais;

        const nomeSpan = document.createElement("span");
        nomeSpan.textContent = nome;

        clienteInfo.append(avatar, nomeSpan);
        celulaNome.appendChild(clienteInfo);

        const celulaTelefone = document.createElement("td");
        celulaTelefone.textContent = cliente.telefone || "-";

        const celulaEmail = document.createElement("td");
        celulaEmail.textContent = cliente.email || "-";

        const celulaEndereco = document.createElement("td");
        celulaEndereco.textContent = cliente.endereco || "-";

        const celulaCidade = document.createElement("td");
        celulaCidade.textContent = cidadeUf;

        const celulaStatus = document.createElement("td");
        const badgeStatus = document.createElement("span");
        badgeStatus.className = `statusCliente status-${status}`;
        badgeStatus.textContent = statusTexto;
        celulaStatus.appendChild(badgeStatus);

        const celulaAcoes = document.createElement("td");
        celulaAcoes.className = "acoes";

        const botaoVisualizar = document.createElement("button");
        botaoVisualizar.className = "documentos";
        botaoVisualizar.dataset.id = cliente.id;
        botaoVisualizar.title = "Visualizar informações do cliente";
        botaoVisualizar.innerHTML = '<i class="fas fa-folder"></i>';

        const botaoExcluir = document.createElement("button");
        botaoExcluir.className = "excluir";
        botaoExcluir.dataset.id = cliente.id;
        botaoExcluir.title = "Excluir cliente";
        botaoExcluir.innerHTML = '<i class="fas fa-trash"></i>';

        celulaAcoes.append(botaoVisualizar, botaoExcluir);

        linha.append(
            celulaNome,
            celulaTelefone,
            celulaEmail,
            celulaEndereco,
            celulaCidade,
            celulaStatus,
            celulaAcoes
        );

        listaClientes.appendChild(linha);
    });

    adicionarEventosBotoes();
}

// ======================================================
// EVENTOS DOS BOTÕES
// ======================================================

function adicionarEventosBotoes() {
    document.querySelectorAll(".documentos").forEach(botao => {
        botao.addEventListener("click", () => {
            const id = botao.dataset.id;

            window.location.href =
                `cliente-detalhes-adv.html?id=${encodeURIComponent(id)}`;
        });
    });

    document.querySelectorAll(".excluir").forEach(botao => {
        botao.addEventListener("click", async () => {
            const id = botao.dataset.id;

            const confirmar = confirm(
                "Deseja realmente excluir este cliente?"
            );

            if (!confirmar) return;

            try {
                await clienteController.removerCliente(id);
            } catch (erro) {
                console.error("Erro ao excluir cliente:", erro);
                alert("Não foi possível excluir o cliente.");
            }
        });
    });
}

// ======================================================
// PESQUISA
// ======================================================

if (inputPesquisa) {
    inputPesquisa.addEventListener("input", evento => {
        pesquisa = evento.target.value;
        renderizarLista(clienteController.clientes || []);
    });
}

// ======================================================
// FILTRO DE STATUS
// ======================================================

if (filtroStatus) {
    filtroStatus.addEventListener("change", evento => {
        statusSelecionado = evento.target.value.toLowerCase();
        renderizarLista(clienteController.clientes || []);
    });
}

// ======================================================
// ALTERAÇÃO DOS CLIENTES
// ======================================================

clienteController.onChange(clientes => {
    renderizarLista(clientes);
});

// ======================================================
// INICIAR ESCUTA
// ======================================================

clienteController.iniciarEscuta();
