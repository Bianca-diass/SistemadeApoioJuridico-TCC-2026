import { cadastrarCliente } from "../../services/clienteService.js";

const form = document.getElementById("formCliente");
const selectEstado = document.getElementById("estado");
const selectCidade = document.getElementById("cidade");
const inputCpf = document.getElementById("cpf");
const inputCnpj = document.getElementById("cnpj");
const selectTipoPessoa = document.getElementById("tipoPessoa");
const grupoCpf = document.getElementById("grupoCpf");
const grupoCnpj = document.getElementById("grupoCnpj");

// Alterna entre campo de CPF e CNPJ conforme o tipo de cliente
selectTipoPessoa.addEventListener("change", () => {
    if (selectTipoPessoa.value === "juridica") {
        grupoCpf.style.display = "none";
        grupoCnpj.style.display = "";
        inputCpf.value = "";
    } else {
        grupoCnpj.style.display = "none";
        grupoCpf.style.display = "";
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
// SALVAR
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
        await cadastrarCliente(cliente);

        alert("Cliente cadastrado com sucesso!");

        window.location.href = "clientes-adv.html";

    } catch (erro) {
        alert("Erro: " + erro.message);
    }
});