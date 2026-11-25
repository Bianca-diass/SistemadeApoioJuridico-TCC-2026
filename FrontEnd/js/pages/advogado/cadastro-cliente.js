import { cadastrarCliente } from "../../services/clienteService.js";
import { clienteController } from "../../controllers/clienteController.js";

const form = document.getElementById("formCliente");
const selectEstado = document.getElementById("estado");
const selectCidade = document.getElementById("cidade");
const inputCpf = document.getElementById("cpf");
const inputCnpj = document.getElementById("cnpj");
const selectTipoPessoa = document.getElementById("tipoPessoa");
const grupoCpf = document.getElementById("grupoCpf");
const grupoCnpj = document.getElementById("grupoCnpj");

const tituloPagina = document.querySelector(".topoPagina h1");
const subtituloPagina = document.querySelector(".topoPagina p");
const botaoSalvar = document.querySelector(".salvar");
const botaoLimpar = document.querySelector(".cancelar");

// ==========================================================
// MODO: NOVO OU EDIÇÃO (?id=123)
// ==========================================================

const idEdicao = new URLSearchParams(window.location.search).get("id");
const modoEdicao = Boolean(idEdicao);

// ==========================================================
// CPF / CNPJ
// ==========================================================

function mostrarCampoDocumento() {
    if (selectTipoPessoa.value === "juridica") {
        grupoCpf.style.display = "none";
        grupoCnpj.style.display = "";
    } else {
        grupoCnpj.style.display = "none";
        grupoCpf.style.display = "";
    }
}

selectTipoPessoa.addEventListener("change", () => {
    mostrarCampoDocumento();

    if (selectTipoPessoa.value === "juridica") {
        inputCpf.value = "";
    } else {
        inputCnpj.value = "";
    }
});

// Máscara automática do CPF (000.000.000-00)
inputCpf.addEventListener("input", () => {
    let valor = inputCpf.value.replace(/\D/g, "");
    valor = valor.slice(0, 11);

    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    inputCpf.value = valor;
});

// Máscara automática do CNPJ (00.000.000/0000-00)
inputCnpj.addEventListener("input", () => {
    let valor = inputCnpj.value.replace(/\D/g, "");
    valor = valor.slice(0, 14);

    valor = valor.replace(/(\d{2})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1/$2");
    valor = valor.replace(/(\d{4})(\d{1,2})$/, "$1-$2");

    inputCnpj.value = valor;
});

// ==========================================================
// CIDADES DO ESTADO SELECIONADO
// ==========================================================

let ufCarregada = "";

async function carregarCidades() {

    const uf = selectEstado.value;

    if (!uf) {
        ufCarregada = "";
        selectCidade.innerHTML = '<option value="">Selecione o estado primeiro</option>';
        selectCidade.disabled = true;
        return;
    }

    // Evita recarregar a mesma lista sem necessidade
    if (uf === ufCarregada && !selectCidade.disabled) {
        return;
    }

    selectCidade.disabled = true;
    selectCidade.innerHTML = '<option value="">Carregando cidades...</option>';

    try {

        const res = await fetch(
            `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
        );

        if (!res.ok) {
            throw new Error("IBGE respondeu com status " + res.status);
        }

        const cidades = await res.json();

        cidades.sort((a, b) => a.nome.localeCompare(b.nome));

        // Se o usuário trocou de estado enquanto carregava, descarta
        if (selectEstado.value !== uf) {
            return;
        }

        selectCidade.innerHTML = '<option value="">Selecione a cidade</option>';

        cidades.forEach(cidade => {
            const option = document.createElement("option");
            option.value = cidade.nome;
            option.textContent = cidade.nome;
            selectCidade.appendChild(option);
        });

        ufCarregada = uf;
        selectCidade.disabled = false;

    } catch (err) {

        ufCarregada = "";
        selectCidade.innerHTML = '<option value="">Erro ao carregar cidades - troque o estado para tentar de novo</option>';
        console.error("Erro ao buscar cidades:", err);
    }
}

// "change" é o normal; "input" cobre autopreenchimento do navegador
selectEstado.addEventListener("change", carregarCidades);
selectEstado.addEventListener("input", carregarCidades);

// Se o estado já vier preenchido (voltar da página, autopreenchimento)
carregarCidades();

// ==========================================================
// MODO EDIÇÃO: PREENCHER FORMULÁRIO COM OS DADOS CADASTRADOS
// ==========================================================

function configurarTelaEdicao() {
    document.title = "Editar Cliente";
    tituloPagina.textContent = "Editar Cliente";
    subtituloPagina.textContent = "Altere os dados necessários e salve.";

    botaoSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';

    // "Limpar" apagaria os dados carregados: vira "Cancelar"
    botaoLimpar.type = "button";
    botaoLimpar.textContent = "Cancelar";
    botaoLimpar.addEventListener("click", () => {
        window.location.href = "clientes-adv.html";
    });
}

async function preencherFormulario(cliente) {

    // Tipo de pessoa (decide se aparece CPF ou CNPJ)
    const tipo = cliente.tipoPessoa || cliente.tipo_pessoa ||
        (cliente.cnpj ? "juridica" : "fisica");

    selectTipoPessoa.value = tipo;
    mostrarCampoDocumento();

    document.getElementById("nome").value = cliente.nome || "";
    document.getElementById("email").value = cliente.email || "";
    document.getElementById("telefone").value = cliente.telefone || "";
    document.getElementById("rg").value = cliente.rg || "";
    document.getElementById("endereco").value = cliente.endereco || "";
    inputCpf.value = cliente.cpf || "";
    inputCnpj.value = cliente.cnpj || "";

    // Estado -> carregar cidades -> só então selecionar a cidade
    selectEstado.value = cliente.estado || "";
    await carregarCidades();

    if (cliente.cidade) {
        const existe = [...selectCidade.options].some(
            opcao => opcao.value === cliente.cidade
        );

        // Garante que a cidade salva apareça mesmo se o nome divergir do IBGE
        if (!existe) {
            const option = document.createElement("option");
            option.value = cliente.cidade;
            option.textContent = cliente.cidade;
            selectCidade.appendChild(option);
        }

        selectCidade.disabled = false;
        selectCidade.value = cliente.cidade;
    }
}

function iniciarModoEdicao() {

    configurarTelaEdicao();

    // Bloqueia o salvar até os dados chegarem
    botaoSalvar.disabled = true;

    let preenchido = false;

    async function tentarPreencher(lista) {

        if (preenchido || !Array.isArray(lista)) return;

        const cliente = lista.find(
            item => String(item.id) === String(idEdicao)
        );

        if (!cliente) return;

        preenchido = true;

        await preencherFormulario(cliente);

        botaoSalvar.disabled = false;

        clienteController.pararEscuta();
    }

    // Se a lista já estiver em memória
    tentarPreencher(clienteController.clientes);

    // Aguarda a primeira resposta do banco
    clienteController.onChange(async lista => {

        await tentarPreencher(lista);

        if (!preenchido && Array.isArray(lista) && lista.length >= 0) {
            alert("Cliente não encontrado.");
            window.location.href = "clientes-adv.html";
        }
    });

    clienteController.onError(erro => {
        console.error("Erro ao carregar cliente:", erro);
        alert("Não foi possível carregar os dados do cliente.");
    });

    clienteController.iniciarEscuta();
}

if (modoEdicao) {
    iniciarModoEdicao();
}

// ==========================================================
// SALVAR (NOVO OU ATUALIZAÇÃO)
// ==========================================================

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cliente = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        tipoPessoa: selectTipoPessoa.value,
        cpf: inputCpf.value.trim(),
        cnpj: inputCnpj.value.trim(),
        rg: document.getElementById("rg").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
        estado: selectEstado.value,
        cidade: selectCidade.value
    };

    try {

        if (modoEdicao) {
            await clienteController.editarCliente(idEdicao, cliente);
            alert("Cliente atualizado com sucesso!");
        } else {
            await cadastrarCliente(cliente);
            alert("Cliente cadastrado com sucesso!");
        }

        window.location.href = "clientes-adv.html";

    } catch (erro) {
        alert("Erro: " + erro.message);
    }
});