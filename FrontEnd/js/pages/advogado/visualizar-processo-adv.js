import { listarProcessos } from "../../services/processoService.js";

// ELEMENTOS
const carregando = document.getElementById("carregando");
const dadosProcesso = document.getElementById("dadosProcesso");
const mensagemErro = document.getElementById("mensagemErro");
const btnVoltar = document.getElementById("btnVoltar");

// ID DA URL
const parametros = new URLSearchParams(window.location.search);
const idProcesso = parametros.get("id");

// BOTÃO VOLTAR
btnVoltar?.addEventListener("click", () => {
    window.location.href = "processos-adv.html";
});

// PADRONIZAR NOMES DOS CAMPOS VINDOS DA API
function padronizarProcesso(p) {
    return {
        ...p,
        numeroProcesso: p.numeroProcesso ?? p.numero_processo ?? "",
        ultimaMovimentacao: p.ultimaMovimentacao ?? p.ultima_movimentacao ?? "",
        tipoManifestacao: p.tipoManifestacao ?? p.tipo_manifestacao ?? ""
    };
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

// VERIFICAR INTIMAÇÃO
function possuiIntimacao(valor) {
    return valor === true ||
        valor === 1 ||
        ["true", "1", "sim", "pendente"].includes(
            String(valor ?? "").trim().toLowerCase()
        );
}

// DEFINIR TEXTO EM UM ELEMENTO
function definirTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
}

// MOSTRAR ERRO
function mostrarErro(mensagem) {
    console.error("ERRO:", mensagem);

    if (carregando) carregando.style.display = "none";
    if (dadosProcesso) dadosProcesso.style.display = "none";

    if (mensagemErro) {
        mensagemErro.style.display = "flex";

        const texto = mensagemErro.querySelector("p");
        if (texto) texto.textContent = mensagem;
    }
}

// MOSTRAR PROCESSO
function mostrarProcesso(dados) {
    const processo = padronizarProcesso(dados);

    definirTexto("numeroProcesso", processo.numeroProcesso || "-");
    definirTexto("cliente", processo.cliente || "-");
    definirTexto("vara", processo.vara || "-");
    definirTexto("tribunal", processo.tribunal || processo.comarca || "-");
    definirTexto("status", processo.status || "-");
    definirTexto("manifestacao", processo.tipoManifestacao || "Nenhuma");
    definirTexto("ultimaMovimentacao", processo.ultimaMovimentacao || "-");
    definirTexto(
        "intimacao",
        possuiIntimacao(processo.intimacao) ? "Nova intimação" : "Sem pendências"
    );
    definirTexto("prazo", formatarData(processo.prazo));

    if (carregando) carregando.style.display = "none";
    if (mensagemErro) mensagemErro.style.display = "none";
    if (dadosProcesso) dadosProcesso.style.display = "block";
}

// CARREGAR PROCESSO
async function carregarProcesso() {
    try {
        if (!idProcesso) {
            mostrarErro("Processo não informado.");
            return;
        }

        const processos = await listarProcessos();

        if (!Array.isArray(processos)) {
            mostrarErro("Não foi possível obter a lista de processos.");
            return;
        }

        const processoEncontrado = processos.find(
            processo => String(processo.id) === String(idProcesso)
        );

        if (!processoEncontrado) {
            mostrarErro("Processo não encontrado.");
            return;
        }

        mostrarProcesso(processoEncontrado);
    } catch (erro) {
        console.error("Erro ao carregar processo:", erro);
        mostrarErro(erro.message || "Não foi possível carregar o processo.");
    }
}

carregarProcesso();