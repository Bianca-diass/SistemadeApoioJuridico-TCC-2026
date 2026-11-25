import { cadastrarDocumento } from "../../services/documentoService.js";
import { listarClientes } from "../../services/clienteService.js";
import { observarUsuario, obterMeuPerfil } from "../../services/authService.js";

// ==========================================
// ELEMENTOS
// ==========================================

const form = document.getElementById("formDocumento");
const selectCliente = document.getElementById("cliente");
const inputAdvogado = document.getElementById("advogado");
const botaoSalvar = form.querySelector(".botao-salvar");

// Status permitidos
const statusPermitidos = [
    "Pendente",
    "Aprovado",
    "Rejeitado",
    "Enviado"
];

// ==========================================
// ADVOGADO LOGADO
// ==========================================

async function preencherAdvogado() {

    let nome = "";

    // 1) Usuário já guardado no login
    observarUsuario((usuario) => {
        nome = (usuario && usuario.nome) || "";
    });

    // 2) Se não tiver nome, busca o perfil no servidor
    if (!nome) {
        try {
            const perfil = await obterMeuPerfil();
            nome = (perfil && perfil.nome) || "";
        } catch (erro) {
            console.error("Erro ao carregar perfil do advogado:", erro);
        }
    }

    inputAdvogado.value = nome;

    if (!nome) {
        inputAdvogado.placeholder = "Advogado logado";
    }

}

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

        if (/token/i.test(erro.message)) {
            alert("Sua sessão expirou. Faça login novamente.");
            window.location.href = "login-adv.html";
            return;
        }

        alert(
            "Não foi possível carregar os clientes. " +
            "Verifique se o back-end está rodando."
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

    const status = document.getElementById("status").value;

    if (!statusPermitidos.includes(status)) {
        alert("Selecione um status válido para o documento.");
        return;
    }

    const dados = {
        titulo: document.getElementById("titulo").value.trim(),
        tipo: document.getElementById("tipo").value,
        cliente: clienteSelecionado.dataset.nome,
        clienteId: clienteSelecionado.value,
        advogado: inputAdvogado.value.trim(),
        processo: document.getElementById("processo").value.trim(),
        prazo: document.getElementById("prazo").value || null,
        status: status,
        descricao: document.getElementById("descricao").value.trim()
    };

    botaoSalvar.disabled = true;

    try {

        await cadastrarDocumento(dados);

        alert("Documento cadastrado com sucesso!");

        window.location.href = "documentos-adv.html";

    } catch (erro) {

        console.error("Erro ao cadastrar documento:", erro);

        alert("Erro ao cadastrar documento: " + erro.message);

        botaoSalvar.disabled = false;

    }

});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

preencherAdvogado();
carregarClientes();