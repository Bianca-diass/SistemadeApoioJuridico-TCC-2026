import { documentoController } from "../../controllers/documentosController.js";
import { listarClientes } from "../../services/clienteService.js";
import { anexarArquivoDocumento } from "../../services/documentoService.js";

// ==========================================
// ELEMENTOS
// ==========================================

const form = document.getElementById("formDocumento");
const selectCliente = document.getElementById("cliente");
const botaoSalvar = form.querySelector(".botao-salvar");

// ==========================================
// CAMPO DE ARQUIVO (criado aqui, não precisa mexer no HTML)
// ==========================================

const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const EXTENSOES = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];

const MIME_POR_EXT = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

const campoArquivo = document.createElement("div");
campoArquivo.className = "campo";
campoArquivo.innerHTML = `
    <label for="arquivo">Arquivo para download (opcional)</label>
    <input type="file" id="arquivo" name="arquivo"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
    <small>PDF, JPG, PNG, DOC ou DOCX, até 10 MB. O cliente poderá baixar este arquivo.</small>
`;

const campoDescricao = document.getElementById("descricao").closest(".campo");
campoDescricao.parentNode.insertBefore(campoArquivo, campoDescricao);

const inputArquivo = document.getElementById("arquivo");

function mimeDoArquivo(arquivo) {
    const ext = (arquivo.name.split(".").pop() || "").toLowerCase();
    return MIME_POR_EXT[ext] || "";
}

// Status permitidos
const statusPermitidos = [
    "Pendente",
    "Aprovado",
    "Rejeitado",
    "Enviado"
];

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

    const status = document.getElementById("status").value;

    if (!statusPermitidos.includes(status)) {
        alert("Selecione um status válido para o documento.");
        return;
    }

    const arquivo = inputArquivo.files[0];

    if (arquivo) {

        const ext = (arquivo.name.split(".").pop() || "").toLowerCase();

        if (!EXTENSOES.includes(ext)) {
            alert("Formato não permitido. Envie PDF, JPG, PNG, DOC ou DOCX.");
            return;
        }

        if (arquivo.size > TAMANHO_MAXIMO) {
            alert("O arquivo deve ter no máximo 10 MB.");
            return;
        }
    }

    const dados = {
        titulo: document.getElementById("titulo").value.trim(),
        tipo: document.getElementById("tipo").value,
        cliente: clienteSelecionado.dataset.nome,
        clienteId: clienteSelecionado.value,
        processo: document.getElementById("processo").value.trim(),
        dataEnvio: document.getElementById("dataEnvio").value,
        status: status,
        descricao: document.getElementById("descricao").value.trim()
    };

    botaoSalvar.disabled = true;

    try {

        const resultado = await documentoController.cadastrarDocumento(dados);

        if (arquivo) {

            // O navegador pode deixar o tipo vazio; usa a extensão nesse caso.
            const arquivoComTipo = arquivo.type
                ? arquivo
                : new File([arquivo], arquivo.name, { type: mimeDoArquivo(arquivo) });

            try {
                await anexarArquivoDocumento(resultado.id, arquivoComTipo);
            } catch (erroArquivo) {
                console.error("Erro ao anexar arquivo:", erroArquivo);

                alert(
                    "O documento foi cadastrado, mas o arquivo não foi enviado: " +
                    erroArquivo.message +
                    "\nVocê pode anexá-lo depois, na lista de documentos."
                );

                window.location.href = "documentos-adv.html";
                return;
            }
        }

        alert("Documento cadastrado com sucesso!");

        window.location.href = "documentos-adv.html";

    } catch (erro) {

        console.error("Erro ao cadastrar documento:", erro);

        alert("Erro ao cadastrar documento: " + erro.message);

        botaoSalvar.disabled = false;

    }

});

// ==========================================
// DATA ATUAL
// ==========================================

function colocarDataAtual() {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    document.getElementById("dataEnvio").value =
        `${ano}-${mes}-${dia}`;

}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

colocarDataAtual();
carregarClientes();