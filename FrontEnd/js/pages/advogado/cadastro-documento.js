import { documentoController } from "../../controllers/documentosController.js";
import { listarClientes } from "../../services/clienteService.js";


// ==========================================
// ELEMENTOS
// ==========================================

const form = document.getElementById("formDocumento");
const selectCliente = document.getElementById("cliente");
const botaoSalvar = form.querySelector(".botao-salvar");


// ==========================================
// CARREGAR CLIENTES
// ==========================================

async function carregarClientes() {

    selectCliente.innerHTML =
        `<option value="">Carregando clientes...</option>`;

    try {

        await listarClientes((clientes) => {

            if (!clientes || clientes.length === 0) {
                selectCliente.innerHTML =
                    `<option value="">Nenhum cliente cadastrado</option>`;
                return;
            }

            selectCliente.innerHTML =
                `<option value="">Selecione o cliente</option>`;

            clientes.forEach((cliente) => {

                const option = document.createElement("option");

                option.value = cliente.id;
                option.textContent = cliente.nome || "Cliente sem nome";
                option.dataset.nome = cliente.nome || "";

                selectCliente.appendChild(option);

            });

        });

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

        selectCliente.innerHTML =
            `<option value="">Erro ao carregar clientes</option>`;

        // Token vencido: o back-end responde "Token inválido ou expirado"
        if (/token/i.test(erro.message)) {
            alert("Sua sessão expirou. Faça login novamente.");
            window.location.href = "login-adv.html";
            return;
        }

        alert(
            "Não foi possível carregar os clientes. " +
            "Verifique se o back-end está rodando (porta 3000)."
        );

    }

}


// ==========================================
// CADASTRAR DOCUMENTO
// ==========================================

form.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const clienteSelecionado =
        selectCliente.options[selectCliente.selectedIndex];

    if (!clienteSelecionado || !clienteSelecionado.value) {
        alert("Selecione um cliente.");
        return;
    }

    const dados = {
        titulo: document.getElementById("titulo").value.trim(),
        tipo: document.getElementById("tipo").value,
        cliente: clienteSelecionado.dataset.nome,
        clienteId: clienteSelecionado.value,
        processo: document.getElementById("processo").value.trim(),
        dataEnvio: document.getElementById("dataEnvio").value,
        status: document.getElementById("status").value,
        descricao: document.getElementById("descricao").value.trim()
    };

    // Evita clicar duas vezes e cadastrar em duplicidade
    botaoSalvar.disabled = true;

    try {

        await documentoController.cadastrarDocumento(dados);

        alert("Documento cadastrado com sucesso!");

        window.location.href = "documentos-adv.html";

    } catch (erro) {

        console.error("Erro ao cadastrar documento:", erro);

        alert("Erro ao cadastrar documento: " + erro.message);

        botaoSalvar.disabled = false;

    }

});


// ==========================================
// DATA ATUAL NO CAMPO
// ==========================================

function colocarDataAtual() {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    document.getElementById("dataEnvio").value = `${ano}-${mes}-${dia}`;

}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

colocarDataAtual();

carregarClientes();