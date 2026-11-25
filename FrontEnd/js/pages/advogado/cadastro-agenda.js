
import {
    adicionarCompromisso,
    editarCompromisso,
    listarCompromissos
} from "../../services/agendaService.js";

import {
    listarClientes
} from "../../services/clienteService.js";

const form = document.getElementById("formCompromisso");
const campo = id => document.getElementById(id);

const idEdicao = new URLSearchParams(location.search).get("id");

let clientes = [];
let listaClientes = null;
let indiceAtivo = -1;

// ==========================================
// UTILITÁRIOS
// ==========================================

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[c]);
}

function normalizar(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function horaValida(valor) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function aplicarMascaraHora(input) {
    if (!input) return;

    input.addEventListener("input", () => {
        const numeros = input.value.replace(/\D/g, "").slice(0, 4);

        input.value = numeros.length > 2
            ? `${numeros.slice(0, 2)}:${numeros.slice(2)}`
            : numeros;
    });
}

aplicarMascaraHora(campo("hora"));
aplicarMascaraHora(campo("horaPrazo"));

// ==========================================
// IDENTIFICAR PROCESSO DO CLIENTE
// ==========================================

function numeroProcessoDoCliente(cliente) {
    if (!cliente) return "";

    const campos = [
        cliente.numero_processo,
        cliente.numeroProcesso,
        cliente.num_processo,
        cliente.processo_numero,
        cliente.numero_do_processo
    ];

    for (const valor of campos) {
        if (valor && typeof valor !== "object") {
            return String(valor);
        }

        if (valor && typeof valor === "object") {
            const numero = valor.numero ||
                valor.numero_processo ||
                valor.numeroProcesso;

            if (numero) return String(numero);
        }
    }

    const processos = cliente.processos || [];

    if (Array.isArray(processos) && processos.length) {
        const processo = processos[0];

        if (typeof processo === "string") {
            return processo;
        }

        return processo.numero ||
            processo.numero_processo ||
            processo.numeroProcesso ||
            "";
    }

    return "";
}

// ==========================================
// LISTA DE CLIENTES
// ==========================================

function criarListaClientes() {
    const input = campo("cliente");

    if (!input) return;

    input.setAttribute("autocomplete", "off");

    const grupo = input.parentElement;

    grupo.style.position = "relative";

    listaClientes = document.createElement("div");

    listaClientes.className = "lista-clientes-agenda";

    Object.assign(listaClientes.style, {
        display: "none",
        position: "absolute",
        top: `${input.offsetHeight + 5}px`,
        left: "0",
        width: "100%",
        maxHeight: "240px",
        overflowY: "auto",
        background: "#fff",
        border: "1px solid #d4a95a",
        borderRadius: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,.15)",
        zIndex: "9999"
    });

    grupo.appendChild(listaClientes);

    input.addEventListener("focus", mostrarClientes);
    input.addEventListener("click", mostrarClientes);
    input.addEventListener("input", mostrarClientes);
    input.addEventListener("keydown", navegarLista);

    document.addEventListener("click", evento => {
        if (
            evento.target !== input &&
            !listaClientes.contains(evento.target)
        ) {
            fecharClientes();
        }
    });

    listaClientes.addEventListener("mousedown", evento => {
        const item = evento.target.closest("[data-cliente-id]");

        if (!item) return;

        evento.preventDefault();

        selecionarCliente(item.dataset.clienteId);
    });
}

// ==========================================
// MOSTRAR CLIENTES
// ==========================================

function mostrarClientes() {
    if (!listaClientes) return;

    const termo = normalizar(campo("cliente").value);

    const filtrados = clientes.filter(cliente =>
        normalizar(cliente.nome).includes(termo)
    );

    indiceAtivo = -1;

    if (!clientes.length) {
        listaClientes.innerHTML = `
            <div class="item-vazio" style="padding:12px;color:#718096">
                Nenhum cliente cadastrado ou vinculado a este advogado.
            </div>
        `;
    } else if (!filtrados.length) {
        listaClientes.innerHTML = `
            <div style="padding:12px;color:#718096">
                Nenhum cliente encontrado.
            </div>
        `;
    } else {
        listaClientes.innerHTML = filtrados.map(cliente => `
            <div
                data-cliente-id="${escapar(cliente.id)}"
                class="item-cliente"
                style="padding:12px;cursor:pointer;border-bottom:1px solid #eee;color:#17324f"
            >
                <strong>${escapar(cliente.nome)}</strong>

                ${cliente.cpf || cliente.cnpj
                    ? `<small style="display:block;color:#718096">
                        ${escapar(cliente.cpf || cliente.cnpj)}
                       </small>`
                    : ""
                }

                ${numeroProcessoDoCliente(cliente)
                    ? `<small style="display:block;color:#718096">
                        Processo: ${escapar(numeroProcessoDoCliente(cliente))}
                       </small>`
                    : ""
                }
            </div>
        `).join("");
    }

    listaClientes.style.display = "block";
}

// ==========================================
// FECHAR LISTA
// ==========================================

function fecharClientes() {
    if (listaClientes) {
        listaClientes.style.display = "none";
    }

    indiceAtivo = -1;
}

// ==========================================
// SELECIONAR CLIENTE
// ==========================================

function selecionarCliente(id) {
    const cliente = clientes.find(
        c => String(c.id) === String(id)
    );

    if (!cliente) return;

    campo("cliente").value = cliente.nome;

    campo("cliente").dataset.clienteId = cliente.id;

    const processo = numeroProcessoDoCliente(cliente);

    if (processo) {
        campo("processo").value = processo;
    }

    fecharClientes();
}

// ==========================================
// NAVEGAÇÃO PELO TECLADO
// ==========================================

function navegarLista(evento) {
    if (!listaClientes || listaClientes.style.display === "none") {
        return;
    }

    const itens = [
        ...listaClientes.querySelectorAll("[data-cliente-id]")
    ];

    if (evento.key === "Escape") {
        fecharClientes();
        return;
    }

    if (!itens.length) return;

    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
        evento.preventDefault();

        indiceAtivo = evento.key === "ArrowDown"
            ? (indiceAtivo + 1) % itens.length
            : (indiceAtivo - 1 + itens.length) % itens.length;

        itens.forEach((item, indice) => {
            item.style.background =
                indice === indiceAtivo ? "#edf2f7" : "#fff";
        });

        itens[indiceAtivo].scrollIntoView({
            block: "nearest"
        });
    }

    if (evento.key === "Enter" && indiceAtivo >= 0) {
        evento.preventDefault();

        selecionarCliente(
            itens[indiceAtivo].dataset.clienteId
        );
    }
}

// ==========================================
// CARREGAR CLIENTES DO BACKEND
// ==========================================

function extrairClientes(resposta) {
    if (Array.isArray(resposta)) return resposta;
    if (Array.isArray(resposta?.clientes)) return resposta.clientes;
    if (Array.isArray(resposta?.data)) return resposta.data;
    if (Array.isArray(resposta?.dados)) return resposta.dados;

    return [];
}

async function carregarClientes() {
    criarListaClientes();

    try {
        const resposta = await listarClientes();

        clientes = extrairClientes(resposta)
            .filter(Boolean)
            .map(cliente => ({
                ...cliente,
                nome: cliente.nome ||
                    cliente.nome_completo ||
                    cliente.razao_social ||
                    cliente.name ||
                    ""
            }))
            .filter(cliente => cliente.id && cliente.nome);

        clientes.sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR")
        );

        console.log("Clientes carregados:", clientes);

        if (!clientes.length) {
            console.warn(
                "Nenhum cliente foi retornado pela API."
            );
        }

    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);

        clientes = [];

        alert(
            "Não foi possível carregar os clientes. " +
            erro.message
        );
    }
}

// ==========================================
// LOCALIZAR CLIENTE
// ==========================================

function localizarCliente(nome) {
    const alvo = normalizar(nome);

    if (!alvo) return null;

    return clientes.find(
        cliente => normalizar(cliente.nome) === alvo
    ) || null;
}

// ==========================================
// PREENCHER FORMULÁRIO PARA EDIÇÃO
// ==========================================

function preencherFormulario(compromisso) {
    campo("titulo").value = compromisso.titulo || "";
    campo("descricao").value = compromisso.descricao || "";

    campo("data").value =
        String(compromisso.data || "").substring(0, 10);

    campo("hora").value =
        String(compromisso.horario || compromisso.hora || "").substring(0, 5);

    campo("dataPrazo").value =
        String(compromisso.data_prazo || compromisso.dataPrazo || "").substring(0, 10);

    campo("horaPrazo").value =
        String(compromisso.hora_prazo || compromisso.horaPrazo || "").substring(0, 5);

    campo("cliente").value = compromisso.cliente || "";
    campo("processo").value = compromisso.processo || "";
    campo("local").value = compromisso.local || "";

    campo("tipo").value = compromisso.tipo || "";
    campo("status").value = compromisso.status || "Agendado";

    const cliente = clientes.find(c =>
        String(c.id) === String(compromisso.cliente_id || compromisso.clienteId)
    ) || localizarCliente(compromisso.cliente);

    if (cliente) {
        campo("cliente").dataset.clienteId = cliente.id;
    }
}

// ==========================================
// PREPARAR EDIÇÃO
// ==========================================

async function prepararEdicao() {
    document.querySelector("h1").textContent = "Editar Compromisso";

    document.title = "Editar Compromisso";

    try {
        const resposta = await listarCompromissos();

        const compromissos = Array.isArray(resposta)
            ? resposta
            : resposta.compromissos || resposta.data || [];

        const compromisso = compromissos.find(c =>
            String(c.id) === String(idEdicao)
        );

        if (!compromisso) {
            alert("Compromisso não encontrado.");
            location.href = "agenda-adv.html";
            return;
        }

        preencherFormulario(compromisso);

    } catch (erro) {
        console.error(erro);
        alert("Erro ao carregar compromisso: " + erro.message);
    }
}

// ==========================================
// SALVAR COMPROMISSO
// ==========================================

form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const horario = campo("hora").value.trim();
    const horaPrazo = campo("horaPrazo").value.trim();

    if (!horaValida(horario)) {
        alert("Informe o horário no formato HH:mm. Exemplo: 14:30.");
        return;
    }

    if (horaPrazo && !horaValida(horaPrazo)) {
        alert("Informe o horário limite no formato HH:mm.");
        return;
    }

    const nomeCliente = campo("cliente").value.trim();

    const clienteSelecionado = localizarCliente(nomeCliente);

    if (nomeCliente && !clienteSelecionado) {
        alert(
            "Selecione um cliente cadastrado na lista. " +
            "Não digite apenas o nome."
        );

        campo("cliente").focus();
        mostrarClientes();
        return;
    }

    const status = campo("status").value;

    const compromisso = {
        titulo: campo("titulo").value.trim(),
        descricao: campo("descricao").value.trim(),
        tipo: campo("tipo").value,
        data: campo("data").value,
        horario,
        dataPrazo: campo("dataPrazo").value || null,
        horaPrazo: horaPrazo || null,

        cliente: clienteSelecionado
            ? clienteSelecionado.nome
            : null,

        clienteId: clienteSelecionado
            ? clienteSelecionado.id
            : null,

        processo: campo("processo").value.trim(),
        local: campo("local").value.trim(),
        status,
        concluido: status === "Concluído"
    };

    const botao = form.querySelector("button[type='submit']");

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        if (idEdicao) {
            await editarCompromisso(idEdicao, compromisso);
            alert("Compromisso atualizado com sucesso!");
        } else {
            await adicionarCompromisso(compromisso);
            alert("Compromisso cadastrado com sucesso!");
        }

        localStorage.setItem(
            "agendaAtualizadaEm",
            String(Date.now())
        );

        location.href = "agenda-adv.html";

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);

        alert(
            erro.message || "Não foi possível salvar o compromisso."
        );

        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar Compromisso';
    }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function iniciarPagina() {
    await carregarClientes();

    if (idEdicao) {
        await prepararEdicao();
    }
}

iniciarPagina();
