import {
  adicionarCompromisso,
  editarCompromisso,
  listarCompromissos
} from "../../services/agendaService.js";
import { listarClientes } from "../../services/clienteService.js";

const form = document.getElementById("formCompromisso");

const campo = id => document.getElementById(id);

// Se a URL tiver ?id=..., a tela funciona como EDIÇÃO.
const idEdicao = new URLSearchParams(window.location.search).get("id");

let clientes = [];

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

function horaValida(valor) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

// Digita só números e o ":" entra sozinho (14 → 14, 1430 → 14:30)
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
// CLIENTES (lista de sugestões no campo "Cliente")
// ==========================================

async function carregarClientes() {
    try {
        await listarClientes(lista => {
            clientes = Array.isArray(lista)
                ? lista
                : (Array.isArray(lista?.clientes) ? lista.clientes : []);
        });

        const datalist = document.createElement("datalist");
        datalist.id = "listaClientesAgenda";

        clientes.forEach(c => {
            const opcao = document.createElement("option");
            opcao.value = c.nome || "";
            datalist.appendChild(opcao);
        });

        document.body.appendChild(datalist);
        campo("cliente").setAttribute("list", datalist.id);
        campo("cliente").setAttribute("autocomplete", "off");

    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
    }
}

function acharCliente(nome) {
    const alvo = normalizar(nome);

    if (!alvo) return null;

    const exatos = clientes.filter(c => normalizar(c.nome) === alvo);

    return exatos.length === 1 ? exatos[0] : null;
}

// ==========================================
// EDIÇÃO: preenche o formulário
// ==========================================

function preencherFormulario(c) {
    const valor = (v, tamanho) => String(v ?? "").substring(0, tamanho);

    campo("titulo").value = c.titulo || "";
    campo("descricao").value = c.descricao || "";
    campo("data").value = valor(c.data, 10);
    campo("hora").value = valor(c.horario ?? c.hora, 5);
    campo("dataPrazo").value = valor(c.data_prazo ?? c.dataPrazo, 10);
    campo("horaPrazo").value = valor(c.hora_prazo ?? c.horaPrazo, 5);
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

async function prepararEdicao() {
    const titulo = document.querySelector("h1");

    if (titulo) titulo.textContent = "Editar Compromisso";
    document.title = "Editar Compromisso";

    try {
        const lista = await listarCompromissos();
        const compromisso = (Array.isArray(lista) ? lista : [])
            .find(c => String(c.id) === String(idEdicao));

        if (!compromisso) {
            alert("Compromisso não encontrado.");
            window.location.href = "agenda-adv.html";
            return;
        }

        preencherFormulario(compromisso);

    } catch (erro) {
        console.error("Erro ao carregar compromisso:", erro);
        alert(erro.message || "Erro ao carregar compromisso.");
    }
}

// ==========================================
// SALVAR
// ==========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const horario = campo("hora").value.trim();
    const horaPrazo = campo("horaPrazo").value.trim();

    if (!horaValida(horario)) {
        alert("Informe o horário no formato HH:mm (ex.: 14:30).");
        return;
    }

    if (horaPrazo && !horaValida(horaPrazo)) {
        alert("Informe o horário limite no formato HH:mm (ex.: 18:00).");
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

        cliente: clienteEncontrado ? clienteEncontrado.nome : nomeCliente,

        clienteId: clienteEncontrado ? clienteEncontrado.id : null,

        processo: campo("processo").value.trim(),

        local: campo("local").value.trim(),

        status,

        concluido: status === "Concluído"

    };

    const botaoSalvar = form.querySelector("button[type='submit']");
    if (botaoSalvar) botaoSalvar.disabled = true;

    try {

        if (idEdicao) {
            await editarCompromisso(idEdicao, compromisso);
            alert("Compromisso atualizado com sucesso!");
        } else {
            await adicionarCompromisso(compromisso);
            alert("Compromisso cadastrado com sucesso!");
        }

        try {
            localStorage.setItem("agendaAtualizadaEm", String(Date.now()));
        } catch {
            // navegador sem localStorage: o dashboard atualiza sozinho em 8s
        }

        window.location.href = "agenda-adv.html";

    } catch (erro) {

        console.error("Erro completo:", erro);

        alert(
            erro.message || "Erro ao salvar compromisso."
        );

        if (botaoSalvar) botaoSalvar.disabled = false;

    }

});

// ==========================================
// INÍCIO
// ==========================================

carregarClientes();

if (idEdicao) {
    prepararEdicao();
}