
import {
    cadastrarProcesso,
    listarProcessos,
    editarProcesso
} from "./processoService.js";

import { listarClientes } from "./clienteService.js";

const form = document.getElementById("formProcesso");

// ========================================
// VERIFICA SE É EDIÇÃO
// ========================================

const parametros =
    new URLSearchParams(window.location.search);

const idProcesso =
    parametros.get("id");

// ========================================
// ELEMENTOS
// ========================================

const numero = document.getElementById("numero");
const cliente = document.getElementById("cliente");
const vara = document.getElementById("vara");
const tribunal = document.getElementById("tribunal");
const tipoManifestacao = document.getElementById("tipoManifestacao");
const ultimaMovimentacao = document.getElementById("ultimaMovimentacao");
const intimacao = document.getElementById("intimacao");
const status = document.getElementById("status");
const prazo = document.getElementById("prazo");
const descricao = document.getElementById("descricao");

const tituloPagina =
    document.getElementById("tituloPagina");

const subtituloPagina =
    document.getElementById("subtituloPagina");

const textoBotao =
    document.getElementById("textoBotao");

// ========================================
// CLIENTES (lista do advogado)
// ========================================

let clientesDoAdvogado = [];

function normalizarNome(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

async function carregarClientes() {

    const clientes = await new Promise((resolve, reject) => {
        listarClientes(resolve).catch(reject);
    });

    clientesDoAdvogado = Array.isArray(clientes) ? clientes : [];

    cliente.innerHTML = "";

    if (clientesDoAdvogado.length === 0) {

        cliente.innerHTML =
            '<option value="">Nenhum cliente cadastrado</option>';

        cliente.disabled = true;

        return;
    }

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione o cliente";

    cliente.appendChild(opcaoInicial);

    const contagem = {};

    clientesDoAdvogado.forEach((c) => {
        const chave = normalizarNome(c.nome);
        contagem[chave] = (contagem[chave] || 0) + 1;
    });

    clientesDoAdvogado.forEach((c) => {

        const opcao = document.createElement("option");

        opcao.value = c.id;

        const homonimo = contagem[normalizarNome(c.nome)] > 1;

        opcao.textContent =
            homonimo && c.email
                ? `${c.nome} (${c.email})`
                : (c.nome || "Cliente sem nome");

        cliente.appendChild(opcao);
    });

    cliente.disabled = false;
}

// ========================================
// CARREGAR PROCESSO PARA EDIÇÃO
// ========================================

async function carregarProcesso() {

    if (!idProcesso) {
        return;
    }

    try {

        const processos = await listarProcessos();

        const processo =
            processos.find(
                p => String(p.id) === String(idProcesso)
            );

        if (!processo) {

            alert("Processo não encontrado.");

            window.location.href = "processos-adv.html";

            return;
        }

        const pegar = (camel, snake) =>
            processo[camel] ?? processo[snake] ?? "";

        numero.value =
            pegar("numeroProcesso", "numero_processo");

        const clienteId =
            processo.cliente_id ?? processo.clienteId ?? "";

        if (clienteId) {

            cliente.value = clienteId;

        } else {

            const alvo = normalizarNome(processo.cliente);

            const iguais = clientesDoAdvogado.filter(
                c => normalizarNome(c.nome) === alvo
            );

            if (iguais.length === 1) {
                cliente.value = iguais[0].id;
            }
        }

        vara.value = processo.vara || "";

        tribunal.value =
            processo.tribunal || processo.comarca || "";

        tipoManifestacao.value =
            pegar("tipoManifestacao", "tipo_manifestacao") || "Nenhuma";

        ultimaMovimentacao.value =
            pegar("ultimaMovimentacao", "ultima_movimentacao");

        intimacao.value =
            processo.intimacao === true ? "true" : "false";

        status.value = processo.status || "Em andamento";

        prazo.value = processo.prazo || "";

        descricao.value = processo.observacoes || "";

        tituloPagina.textContent = "Editar Processo";

        subtituloPagina.textContent =
            "Atualize as informações do processo.";

        textoBotao.textContent = "Atualizar Processo";

    } catch (erro) {

        console.error("Erro ao carregar processo:", erro);

        alert("Erro ao carregar os dados do processo.");
    }
}

// ========================================
// SALVAR / ATUALIZAR
// ========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (!cliente.value) {

        alert("Selecione o cliente do processo.");

        cliente.focus();

        return;
    }

    const processo = {

        numeroProcesso: numero.value.trim(),

        clienteId: cliente.value,

        cliente:
            cliente.selectedOptions[0]?.textContent.trim() || "",

        vara: vara.value.trim(),

        tribunal: tribunal.value.trim(),

        status: status.value,

        tipoManifestacao: tipoManifestacao.value,

        ultimaMovimentacao:
            ultimaMovimentacao.value.trim(),

        intimacao: intimacao.value === "true",

        prazo: prazo.value,

        observacoes: descricao.value.trim()
    };

    try {

        if (idProcesso) {

            await editarProcesso(idProcesso, processo);

            alert("Processo atualizado com sucesso!");

        } else {

            await cadastrarProcesso(processo);

            alert("Processo cadastrado com sucesso!");
        }

        window.location.href = "processos-adv.html";

    } catch (erro) {

        console.error("Erro ao salvar processo:", erro);

        alert(
            erro.message ||
            "Erro ao salvar processo."
        );
    }
});

// ========================================
// INICIAR
// ========================================

async function iniciar() {

    try {

        await carregarClientes();

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

        cliente.innerHTML =
            '<option value="">Erro ao carregar clientes</option>';

        cliente.disabled = true;

        return;
    }

    await carregarProcesso();
}

iniciar();
