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

// Se a URL tiver ?id=..., a tela funciona como EDIÇÃO.
const idEdicao = new URLSearchParams(window.location.search).get("id");

let clientes = [];
let erroClientes = false;

// ==========================================
// UTILIDADES
// ==========================================

function normalizar(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[c]);
}

function horaValida(valor) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

// Digita só números e o ":" entra sozinho.
function aplicarMascaraHora(input) {
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
// CLIENTES - LISTA DE SELEÇÃO
// ==========================================

let listaEl = null;
let indiceAtivo = -1;

function criarListaClientes() {

    const input = campo("cliente");

    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off");

    const estilos = document.createElement("style");

    estilos.textContent = `

        .lista-clientes-agenda {
            display: none;
            position: absolute;
            z-index: 50;
            max-height: 240px;
            overflow-y: auto;
            background: #ffffff;
            border: 1px solid #d4a95a;
            border-radius: 10px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
        }

        .lista-clientes-agenda.aberta {
            display: block;
        }

        .lista-clientes-agenda .item-cliente {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 10px 14px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: #17324f;
            cursor: pointer;
            border-bottom: 1px solid #eef1f6;
        }

        .lista-clientes-agenda .item-cliente:last-child {
            border-bottom: none;
        }

        .lista-clientes-agenda .item-cliente small {
            font-size: 11px;
            color: #718096;
        }

        .lista-clientes-agenda .item-cliente:hover,
        .lista-clientes-agenda .item-cliente.ativo {
            background: #f4f6fa;
        }

        .lista-clientes-agenda .item-vazio {
            padding: 12px 14px;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            color: #718096;
        }
    `;

    document.head.appendChild(estilos);

    listaEl = document.createElement("div");
    listaEl.className = "lista-clientes-agenda";

    const pai = input.parentElement;

    if (getComputedStyle(pai).position === "static") {
        pai.style.position = "relative";
    }

    pai.appendChild(listaEl);

    input.addEventListener("focus", mostrarLista);
    input.addEventListener("click", mostrarLista);
    input.addEventListener("input", mostrarLista);
    input.addEventListener("keydown", teclasLista);

    document.addEventListener("click", evento => {
        if (
            evento.target !== input &&
            !listaEl.contains(evento.target)
        ) {
            fecharLista();
        }
    });
}

// ==========================================
// NÚMERO DO PROCESSO DO CLIENTE
// ==========================================

// Procura o número do processo no registro do cliente, aceitando
// vários nomes de campo e também lista de processos.
function numeroProcessoDoCliente(c) {

    if (!c) return "";

    const texto = v => (v === null || v === undefined)
        ? ""
        : String(v).trim();

    const doItem = item => {

        if (item === null || item === undefined) return "";

        if (typeof item !== "object") return texto(item);

        return texto(
            item.numero ??
            item.numero_processo ??
            item.numeroProcesso ??
            item.processo ??
            item.num_processo ??
            item.number
        );
    };

    const diretos = [
        c.numero_processo,
        c.numeroProcesso,
        c.num_processo,
        c.numProcesso,
        c.processo_numero,
        c.numero_do_processo,
        c.processo
    ];

    for (const valor of diretos) {

        if (Array.isArray(valor)) {

            for (const item of valor) {
                const n = doItem(item);
                if (n) return n;
            }

            continue;
        }

        const n = doItem(valor);
        if (n) return n;
    }

    const listas = [c.processos, c.Processos, c.processos_cliente];

    for (const lista of listas) {

        if (!Array.isArray(lista)) continue;

        for (const item of lista) {
            const n = doItem(item);
            if (n) return n;
        }
    }

    return "";
}

// ==========================================
// MOSTRAR CLIENTES
// ==========================================

function mostrarLista() {

    const input = campo("cliente");

    listaEl.style.top =
        `${input.offsetTop + input.offsetHeight + 4}px`;

    listaEl.style.left = `${input.offsetLeft}px`;
    listaEl.style.width = `${input.offsetWidth}px`;

    const termo = normalizar(input.value);

    const nomeExato = clientes.some(
        c => normalizar(c.nome) === termo
    );

    const filtrados = (!termo || nomeExato)
        ? clientes
        : clientes.filter(c =>
            normalizar(c.nome).includes(termo)
        );

    indiceAtivo = -1;

    if (erroClientes) {

        listaEl.innerHTML = `
            <div class="item-vazio">
                Não foi possível carregar os clientes.
                ${escaparHTML(detalheErroClientes)}
            </div>
        `;

    } else if (!clientes.length) {

        listaEl.innerHTML = `
            <div class="item-vazio">
                Nenhum cliente cadastrado ainda.
            </div>
        `;

    } else if (!filtrados.length) {

        listaEl.innerHTML = `
            <div class="item-vazio">
                Nenhum cliente encontrado com esse nome.
            </div>
        `;

    } else {

        listaEl.innerHTML = filtrados.map(c => `
            <div class="item-cliente" data-id="${escaparHTML(c.id)}">

                ${escaparHTML(c.nome || "-")}

                ${(c.cpf || c.cnpj)
                    ? `<small>${escaparHTML(c.cpf || c.cnpj)}</small>`
                    : ""
                }

                ${numeroProcessoDoCliente(c)
                    ? `<small>Processo: ${escaparHTML(numeroProcessoDoCliente(c))}</small>`
                    : ""
                }

            </div>
        `).join("");
    }

    listaEl.classList.add("aberta");
}

// ==========================================
// FECHAR LISTA
// ==========================================

function fecharLista() {

    if (listaEl) {
        listaEl.classList.remove("aberta");
    }

    indiceAtivo = -1;
}

// ==========================================
// ESCOLHER CLIENTE
// ==========================================

function escolherCliente(id) {

    const cliente = clientes.find(
        c => String(c.id) === String(id)
    );

    if (!cliente) return;

    campo("cliente").value = cliente.nome || "";

    // Preenche o campo Processo automaticamente.
    const numeroProcesso = numeroProcessoDoCliente(cliente);

    if (numeroProcesso) {
        campo("processo").value = numeroProcesso;
    }

    fecharLista();
}

document.addEventListener("mousedown", evento => {

    const item = evento.target.closest(
        ".lista-clientes-agenda .item-cliente"
    );

    if (!item) return;

    evento.preventDefault();

    escolherCliente(item.dataset.id);
});

// ==========================================
// NAVEGAÇÃO PELO TECLADO
// ==========================================

function teclasLista(evento) {

    if (!listaEl.classList.contains("aberta")) return;

    const itens = [
        ...listaEl.querySelectorAll(".item-cliente")
    ];

    if (evento.key === "Escape") {
        fecharLista();
        return;
    }

    if (!itens.length) return;

    if (
        evento.key === "ArrowDown" ||
        evento.key === "ArrowUp"
    ) {

        evento.preventDefault();

        indiceAtivo = evento.key === "ArrowDown"
            ? (indiceAtivo + 1) % itens.length
            : (indiceAtivo - 1 + itens.length) % itens.length;

        itens.forEach((item, i) => {
            item.classList.toggle(
                "ativo",
                i === indiceAtivo
            );
        });

        itens[indiceAtivo].scrollIntoView({
            block: "nearest"
        });
    }

    if (evento.key === "Enter" && indiceAtivo >= 0) {

        evento.preventDefault();

        escolherCliente(
            itens[indiceAtivo].dataset.id
        );
    }
}

// ==========================================
// CARREGAR CLIENTES DA API
// ==========================================

// Aceita: array direto, { clientes: [...] } ou { data: [...] }.
function extrairListaClientes(resposta) {

    if (Array.isArray(resposta)) return resposta;
    if (Array.isArray(resposta?.clientes)) return resposta.clientes;
    if (Array.isArray(resposta?.data)) return resposta.data;

    return [];
}

function aplicarClientes(resposta) {

    clientes = extrairListaClientes(resposta)
        .filter(Boolean)
        .map(c => ({
            ...c,
            // Garante o campo "nome" mesmo que a coluna tenha outro nome.
            nome: c.nome ?? c.nome_completo ?? c.razao_social ?? c.name ?? ""
        }))
        .filter(c => c.nome);

    console.log("Clientes carregados:", clientes.length, clientes);
}

// Mensagem exibida no campo Cliente quando algo dá errado.
let detalheErroClientes = "";

// Tenta primeiro o servidor publicado (o mesmo usado pela Agenda) e depois o local.
const URLS_API_CLIENTES = [
    "https://sistema-apoio-juridico.onrender.com/clientes",
    "http://localhost:3000/clientes"
];

// Procura o token de login no navegador, em qualquer chave comum.
function obterTokenSalvo() {

    const limpar = valor => String(valor || "")
        .replace(/^"|"$/g, "")
        .replace(/^Bearer\s+/i, "")
        .trim();

    const pareceJWT = valor => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(valor);

    const chavesComuns = [
        "token", "accessToken", "access_token",
        "authToken", "jwt", "tokenAdvogado"
    ];

    for (const storage of [localStorage, sessionStorage]) {

        try {

            for (const chave of chavesComuns) {
                const valor = limpar(storage.getItem(chave));
                if (valor && pareceJWT(valor)) return valor;
            }

            for (let i = 0; i < storage.length; i++) {

                const bruto = storage.getItem(storage.key(i));
                const valor = limpar(bruto);

                if (pareceJWT(valor)) return valor;

                try {
                    const obj = JSON.parse(bruto);
                    const interno = limpar(
                        obj?.token ?? obj?.access_token ??
                        obj?.accessToken ?? obj?.session?.access_token
                    );
                    if (pareceJWT(interno)) return interno;
                } catch {
                    // Não era JSON.
                }
            }

        } catch {
            // Storage indisponível.
        }
    }

    return "";
}

// Busca direta na API, sem depender do clienteService.
async function buscarClientesDireto() {

    const token = obterTokenSalvo();

    if (!token) {
        throw new Error(
            "Você não está logado (token não encontrado). Faça login novamente."
        );
    }

    let ultimoErro = null;

    for (const url of URLS_API_CLIENTES) {

        let resposta;

        try {

            resposta = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

        } catch (erro) {

            ultimoErro = new Error(
                `Não consegui falar com ${url}: ${erro.message}`
            );

            continue;
        }

        let corpo = null;

        try {
            corpo = await resposta.json();
        } catch {
            // Resposta sem JSON.
        }

        console.log(`GET ${url} ->`, resposta.status, corpo);

        if (resposta.ok) return corpo;

        ultimoErro = new Error(
            `${url} respondeu ${resposta.status}: ` +
            (corpo?.erro || corpo?.error || corpo?.message || "sem detalhes")
        );
    }

    throw ultimoErro || new Error("Falha ao buscar clientes.");
}

async function carregarClientes() {

    criarListaClientes();

    detalheErroClientes = "";
    erroClientes = false;

    // 1) Tenta pelo service do projeto (retorno direto ou callback).
    try {

        const retorno = await listarClientes(aplicarClientes);

        if (retorno !== undefined) {
            aplicarClientes(retorno);
        }

    } catch (erro) {

        console.warn("clienteService falhou:", erro);

        detalheErroClientes = erro?.message || "";
    }

    if (clientes.length) return;

    // 2) Se veio vazio, consulta a API direto para descobrir o motivo real.
    try {

        const corpo = await buscarClientesDireto();

        aplicarClientes(corpo);

        if (!clientes.length) {

            detalheErroClientes = "";

            console.warn(
                "A API respondeu OK, mas sem nenhum cliente. " +
                "Verifique o vínculo do advogado logado na tabela advogado_clientes."
            );
        }

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

        clientes = [];
        erroClientes = true;
        detalheErroClientes = erro.message;
    }
}

// ==========================================
// LOCALIZAR CLIENTE PELO NOME
// ==========================================

function acharCliente(nome) {

    const alvo = normalizar(nome);

    if (!alvo) return null;

    const exatos = clientes.filter(
        c => normalizar(c.nome) === alvo
    );

    return exatos.length === 1
        ? exatos[0]
        : null;
}

// ==========================================
// EDIÇÃO: PREENCHER FORMULÁRIO
// ==========================================

function preencherFormulario(c) {

    const valor = (v, tamanho) =>
        String(v ?? "").substring(0, tamanho);

    campo("titulo").value = c.titulo || "";
    campo("descricao").value = c.descricao || "";

    campo("data").value = valor(c.data, 10);

    campo("hora").value = valor(
        c.horario ?? c.hora,
        5
    );

    campo("dataPrazo").value = valor(
        c.data_prazo ?? c.dataPrazo,
        10
    );

    campo("horaPrazo").value = valor(
        c.hora_prazo ?? c.horaPrazo,
        5
    );

    campo("cliente").value = c.cliente || "";

    campo("processo").value = c.processo || "";
    campo("local").value = c.local || "";

    const tipo = campo("tipo");

    if ([...tipo.options].some(o => o.value === c.tipo)) {
        tipo.value = c.tipo;
    }

    const status = campo("status");

    if ([...status.options].some(o => o.value === c.status)) {
        status.value = c.status;
    }
}

// ==========================================
// PREPARAR EDIÇÃO
// ==========================================

async function prepararEdicao() {

    const titulo = document.querySelector("h1");

    if (titulo) {
        titulo.textContent = "Editar Compromisso";
    }

    document.title = "Editar Compromisso";

    try {

        const lista = await listarCompromissos();

        const compromisso = (
            Array.isArray(lista) ? lista : []
        ).find(c =>
            String(c.id) === String(idEdicao)
        );

        if (!compromisso) {

            alert("Compromisso não encontrado.");

            window.location.href = "agenda-adv.html";

            return;
        }

        preencherFormulario(compromisso);

    } catch (erro) {

        console.error("Erro ao carregar compromisso:", erro);

        alert(
            erro.message || "Erro ao carregar compromisso."
        );
    }
}

// ==========================================
// SALVAR COMPROMISSO
// ==========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const horario = campo("hora").value.trim();

    const horaPrazo = campo("horaPrazo").value.trim();

    if (!horaValida(horario)) {

        alert(
            "Informe o horário no formato HH:mm (ex.: 14:30)."
        );

        return;
    }

    if (horaPrazo && !horaValida(horaPrazo)) {

        alert(
            "Informe o horário limite no formato HH:mm (ex.: 18:00)."
        );

        return;
    }

    const nomeCliente = campo("cliente").value.trim();

    const clienteEncontrado = acharCliente(nomeCliente);

    if (nomeCliente && !clienteEncontrado) {

        const continuar = confirm(
            "Esse cliente não está na sua lista de clientes cadastrados.\n\n" +
            "O compromisso será salvo, mas NÃO aparecerá na área de nenhum " +
            "cliente. Para aparecer, escolha um cliente da lista.\n\n" +
            "Deseja salvar assim mesmo?"
        );

        if (!continuar) return;
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

        cliente: clienteEncontrado
            ? clienteEncontrado.nome
            : nomeCliente,

        clienteId: clienteEncontrado
            ? clienteEncontrado.id
            : null,

        processo: campo("processo").value.trim(),

        local: campo("local").value.trim(),

        status,

        concluido: status === "Concluído"
    };

    const botaoSalvar = form.querySelector(
        "button[type='submit']"
    );

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
    }

    try {

        if (idEdicao) {

            await editarCompromisso(
                idEdicao,
                compromisso
            );

            alert("Compromisso atualizado com sucesso!");

        } else {

            await adicionarCompromisso(compromisso);

            alert("Compromisso cadastrado com sucesso!");
        }

        try {

            localStorage.setItem(
                "agendaAtualizadaEm",
                String(Date.now())
            );

        } catch {
            // Navegador sem localStorage.
        }

        window.location.href = "agenda-adv.html";

    } catch (erro) {

        console.error("Erro completo:", erro);

        alert(
            erro.message || "Erro ao salvar compromisso."
        );

        if (botaoSalvar) {
            botaoSalvar.disabled = false;
        }
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