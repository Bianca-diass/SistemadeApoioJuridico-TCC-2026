console.log("========================================");
console.log("🚨 VISUALIZAR-PROCESSO.JS FOI CARREGADO 🚨");
console.log("========================================");


import { listarProcessos } from "../../services/processoService.js";


// ======================================================
// ELEMENTOS
// ======================================================

const carregando =
    document.getElementById("carregando");

const dadosProcesso =
    document.getElementById("dadosProcesso");

const mensagemErro =
    document.getElementById("mensagemErro");

const btnVoltar =
    document.getElementById("btnVoltar");


// ======================================================
// VERIFICAR ELEMENTOS
// ======================================================

console.log(
    "Elemento carregando:",
    carregando
);

console.log(
    "Elemento dadosProcesso:",
    dadosProcesso
);

console.log(
    "Elemento mensagemErro:",
    mensagemErro
);

console.log(
    "Elemento btnVoltar:",
    btnVoltar
);


// ======================================================
// PEGAR ID DA URL
// ======================================================

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idProcesso =
    parametros.get("id");


console.log(
    "URL:",
    window.location.href
);

console.log(
    "ID DO PROCESSO:",
    idProcesso
);


// ======================================================
// BOTÃO VOLTAR
// ======================================================

if (btnVoltar) {

    btnVoltar.addEventListener(
        "click",
        function () {

            window.location.href =
                "processos-adv.html";

        }
    );

}


// ======================================================
// FORMATAR DATA
// ======================================================

function formatarData(data) {

    if (!data) {

        return "-";

    }


    const valor =
        String(data);


    const partes =
        valor.split("-");


    if (partes.length === 3) {

        return `${partes[2]}/${partes[1]}/${partes[0]}`;

    }


    return valor;

}


// ======================================================
// MOSTRAR ERRO
// ======================================================

function mostrarErro(mensagem) {

    console.error(
        "========================================"
    );

    console.error(
        "ERRO:",
        mensagem
    );

    console.error(
        "========================================"
    );


    if (carregando) {

        carregando.style.display =
            "none";

    }


    if (dadosProcesso) {

        dadosProcesso.style.display =
            "none";

    }


    if (mensagemErro) {

        mensagemErro.style.display =
            "flex";


        const texto =
            mensagemErro.querySelector("p");


        if (texto) {

            texto.textContent =
                mensagem;

        }

    }

}


// ======================================================
// MOSTRAR PROCESSO
// ======================================================

function mostrarProcesso(processo) {

    console.log(
        "========================================"
    );

    console.log(
        "PROCESSO ENCONTRADO:"
    );

    console.log(
        processo
    );

    console.log(
        "========================================"
    );


    // ==================================================
    // NÚMERO
    // ==================================================

    const numeroProcesso =
        document.getElementById(
            "numeroProcesso"
        );


    if (numeroProcesso) {

        numeroProcesso.textContent =
            processo.numeroProcesso || "-";

    }


    // ==================================================
    // CLIENTE
    // ==================================================

    const cliente =
        document.getElementById(
            "cliente"
        );


    if (cliente) {

        cliente.textContent =
            processo.cliente || "-";

    }


    // ==================================================
    // VARA
    // ==================================================

    const vara =
        document.getElementById(
            "vara"
        );


    if (vara) {

        vara.textContent =
            processo.vara || "-";

    }


    // ==================================================
    // TRIBUNAL
    // ==================================================

    const tribunal =
        document.getElementById(
            "tribunal"
        );


    if (tribunal) {

        tribunal.textContent =
            processo.tribunal || processo.comarca || "-";

    }


    // ==================================================
    // STATUS
    // ==================================================

    const status =
        document.getElementById(
            "status"
        );


    if (status) {

        status.textContent =
            processo.status || "-";

    }


    // ==================================================
    // MANIFESTAÇÃO
    // ==================================================

    const manifestacao =
        document.getElementById(
            "manifestacao"
        );


    if (manifestacao) {

        manifestacao.textContent =
            processo.tipoManifestacao ||
            "Nenhuma";

    }


    // ==================================================
    // ÚLTIMA MOVIMENTAÇÃO
    // ==================================================

    const ultimaMovimentacao =
        document.getElementById(
            "ultimaMovimentacao"
        );


    if (ultimaMovimentacao) {

        ultimaMovimentacao.textContent =
            processo.ultimaMovimentacao ||
            "-";

    }


    // ==================================================
    // INTIMAÇÃO
    // ==================================================

    const intimacao =
        document.getElementById(
            "intimacao"
        );


    if (intimacao) {

        intimacao.textContent =
            processo.intimacao === true
                ? "Nova intimação"
                : "Sem pendências";

    }


    // ==================================================
    // PRAZO
    // ==================================================

    const prazo =
        document.getElementById(
            "prazo"
        );


    if (prazo) {

        prazo.textContent =
            processo.prazo
                ? formatarData(
                    processo.prazo
                )
                : "-";

    }


    // ==================================================
    // MOSTRAR CONTEÚDO
    // ==================================================

    if (carregando) {

        carregando.style.display =
            "none";

    }


    if (mensagemErro) {

        mensagemErro.style.display =
            "none";

    }


    if (dadosProcesso) {

        dadosProcesso.style.display =
            "block";

    }


    console.log(
        "Dados do processo exibidos na tela."
    );

}


// ======================================================
// CARREGAR PROCESSO
// ======================================================

async function carregarProcesso() {

    console.log(
        "========================================"
    );

    console.log(
        "INICIANDO CARREGAMENTO DO PROCESSO"
    );

    console.log(
        "========================================"
    );


    try {

        // ==================================================
        // VERIFICAR ID
        // ==================================================

        if (!idProcesso) {

            mostrarErro(
                "Processo não informado."
            );

            return;

        }


        console.log(
            "ID recebido pela URL:",
            idProcesso
        );


        // ==================================================
        // BUSCAR PROCESSOS
        // ==================================================

        console.log(
            "Chamando listarProcessos()..."
        );


        const processos =
            await listarProcessos();


        console.log(
            "listarProcessos() terminou."
        );


        console.log(
            "Processos recebidos:",
            processos
        );


        // ==================================================
        // VERIFICAR ARRAY
        // ==================================================

        if (!Array.isArray(processos)) {

            mostrarErro(
                "Não foi possível obter a lista de processos."
            );

            return;

        }


        console.log(
            "Quantidade de processos:",
            processos.length
        );


        // ==================================================
        // PROCURAR PROCESSO
        // ==================================================

        let processoEncontrado = null;


        for (
            const processo of processos
        ) {

            console.log(
                "Comparando ID:",
                processo.id,
                "com:",
                idProcesso
            );


            if (
                String(processo.id) ===
                String(idProcesso)
            ) {

                processoEncontrado =
                    processo;

                break;

            }

        }


        // ==================================================
        // VERIFICAR PROCESSO
        // ==================================================

        if (!processoEncontrado) {

            mostrarErro(
                "Processo não encontrado."
            );

            return;

        }


        // ==================================================
        // MOSTRAR
        // ==================================================

        mostrarProcesso(
            processoEncontrado
        );


    } catch (erro) {

        console.error(
            "========================================"
        );

        console.error(
            "ERRO AO CARREGAR PROCESSO"
        );

        console.error(
            erro
        );

        console.error(
            "========================================"
        );


        mostrarErro(
            erro.message ||
            "Não foi possível carregar o processo."
        );

    }

}


// ======================================================
// INICIAR
// ======================================================

console.log(
    "Chamando carregarProcesso()..."
);


carregarProcesso();