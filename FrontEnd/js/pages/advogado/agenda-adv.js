import {
    listarCompromissos,
    editarCompromisso,
    excluirCompromisso
} from "../../services/agendaService.js";


// ==========================================
// ELEMENTOS
// ==========================================

const listaProximos = document.getElementById("listaProximos");
const totalCompromissos = document.getElementById("totalCompromissos");
const compromissosHoje = document.getElementById("compromissosHoje");
const prazos = document.getElementById("prazos");


// ==========================================
// CARREGAR COMPROMISSOS
// ==========================================

async function carregarCompromissos() {

    try {

        const compromissos = await listarCompromissos();

        atualizarCards(compromissos);
        mostrarProximos(compromissos);

    } catch (error) {

        console.error("Erro:", error);

        listaProximos.innerHTML = `
            <div class="semCompromissos">
                <i class="fas fa-circle-exclamation"></i>
                <p>Não foi possível carregar os compromissos.</p>
            </div>
        `;
    }
}


// ==========================================
// CARDS
// ==========================================

function atualizarCards(compromissos) {

    totalCompromissos.textContent = compromissos.length;

    const hoje = new Date().toISOString().split("T")[0];

    const quantidadeHoje = compromissos.filter(compromisso =>
        compromisso.data === hoje &&
        compromisso.status !== "Concluído"
    ).length;

    compromissosHoje.textContent = quantidadeHoje;

    const quantidadePrazos = compromissos.filter(compromisso =>
        compromisso.tipo?.toLowerCase() === "prazo" &&
        compromisso.status !== "Concluído"
    ).length;

    prazos.textContent = quantidadePrazos;
}


// ==========================================
// MOSTRAR COMPROMISSOS
// ==========================================

function mostrarProximos(compromissos) {

    listaProximos.innerHTML = "";

    if (!compromissos || compromissos.length === 0) {

        listaProximos.innerHTML = `
            <div class="semCompromissos">
                <i class="fas fa-calendar-xmark"></i>
                <p>Nenhum compromisso cadastrado.</p>
            </div>
        `;

        return;
    }


    // Ordenar por data e horário
    const ordenados = [...compromissos].sort((a, b) => {

        const dataA = new Date(
            `${a.data}T${a.horario || "00:00"}`
        );

        const dataB = new Date(
            `${b.data}T${b.horario || "00:00"}`
        );

        return dataA - dataB;
    });


    ordenados.forEach(compromisso => {

        const item = document.createElement("div");

        item.className = "itemCompromisso";


        if (
            compromisso.status === "Concluído" ||
            compromisso.concluido
        ) {
            item.classList.add("concluido");
        }


        // Tipo
        const tipo = compromisso.tipo
            ? compromisso.tipo
            : "";


        // HTML do compromisso
        item.innerHTML = `

            <div class="horaCompromisso">
                ${compromisso.horario || "--:--"}
            </div>


            <div class="infoCompromisso">

                <h3>
                    ${compromisso.titulo || "Sem título"}
                </h3>


                ${
                    compromisso.descricao
                    ? `
                        <p>
                            <strong>Descrição:</strong>
                            ${compromisso.descricao}
                        </p>
                    `
                    : ""
                }


                ${
                    tipo
                    ? `
                        <p>
                            <strong>Tipo:</strong>
                            ${tipo}
                        </p>
                    `
                    : ""
                }


                <p>
                    <strong>Cliente:</strong>
                    ${compromisso.cliente || "Não informado"}
                </p>


                <p>
                    <strong>Processo:</strong>
                    ${compromisso.processo || "Não informado"}
                </p>


                <p>
                    <strong>Local:</strong>
                    ${compromisso.local || "Não informado"}
                </p>


                <p>
                    <strong>Data:</strong>
                    ${formatarData(compromisso.data)}
                </p>


                ${
                    compromisso.dataPrazo
                    ? `
                        <p>
                            <strong>Data do prazo:</strong>
                            ${formatarData(compromisso.dataPrazo)}
                        </p>
                    `
                    : ""
                }


                ${
                    compromisso.horaPrazo
                    ? `
                        <p>
                            <strong>Horário limite:</strong>
                            ${compromisso.horaPrazo}
                        </p>
                    `
                    : ""
                }


                <p>
                    <strong>Status:</strong>
                    ${compromisso.status || "Agendado"}
                </p>

            </div>


            <div class="acoesCompromisso">

                <button
                    class="btnEditar"
                    data-id="${compromisso.id}"
                >
                    <i class="fas fa-pen"></i>
                    Editar
                </button>


                <button
                    class="btnExcluir"
                    data-id="${compromisso.id}"
                >
                    <i class="fas fa-trash"></i>
                    Excluir
                </button>

            </div>

        `;


        listaProximos.appendChild(item);

    });


    adicionarEventos();

}


// ==========================================
// BOTÕES EDITAR E EXCLUIR
// ==========================================

function adicionarEventos() {

    document
        .querySelectorAll(".btnEditar")
        .forEach(botao => {

            botao.addEventListener("click", () => {

                const id = botao.dataset.id;

                window.location.href =
                    `cadastro-agenda-adv.html?id=${id}`;

            });

        });


    document
        .querySelectorAll(".btnExcluir")
        .forEach(botao => {

            botao.addEventListener("click", async () => {

                const id = botao.dataset.id;


                const confirmar = confirm(
                    "Deseja realmente excluir este compromisso?"
                );


                if (!confirmar) {
                    return;
                }


                try {

                    await excluirCompromisso(id);

                    alert(
                        "Compromisso excluído com sucesso!"
                    );

                    carregarCompromissos();

                } catch (error) {

                    console.error(error);

                    alert(
                        error.message ||
                        "Erro ao excluir compromisso."
                    );

                }

            });

        });

}


// ==========================================
// FORMATAR DATA
// ==========================================

function formatarData(data) {

    if (!data) {
        return "-";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    carregarCompromissos
);