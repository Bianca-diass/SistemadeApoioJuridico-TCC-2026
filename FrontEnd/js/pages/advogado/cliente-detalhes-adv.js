import { listarClientes } from "../../services/clienteService.js";


// ======================================================
// ELEMENTOS
// ======================================================

const areaCliente = document.getElementById("areaCliente");
const tituloCliente = document.getElementById("tituloCliente");
const botaoEditar = document.getElementById("botaoEditar");


// ======================================================
// PEGAR ID DA URL
// ======================================================

const parametros = new URLSearchParams(
    window.location.search
);

const idCliente = parametros.get("id");


// ======================================================
// VERIFICAR ID
// ======================================================

if (!idCliente) {

    mostrarErro("Cliente não informado.");

} else {

    carregarCliente();

}


// ======================================================
// CARREGAR CLIENTE
// ======================================================

async function carregarCliente() {

    try {

        // Busca os clientes diretamente da API
        await listarClientes((clientes) => {

            console.log("Clientes recebidos:", clientes);
            console.log("ID da URL:", idCliente);


            // Procurar o cliente pelo ID
            const cliente = clientes.find(
                item => String(item.id) === String(idCliente)
            );


            // Cliente não encontrado
            if (!cliente) {

                mostrarErro("Cliente não encontrado.");

                return;

            }


            // Cliente encontrado
            mostrarCliente(cliente);

        });

    } catch (erro) {

        console.error(
            "Erro ao carregar cliente:",
            erro
        );


        mostrarErro(
            "Não foi possível carregar os dados do cliente."
        );

    }

}


// ======================================================
// MOSTRAR CLIENTE
// ======================================================

function mostrarCliente(cliente) {

    const nome =
        cliente.nome || "-";

    const email =
        cliente.email || "-";

    const telefone =
        cliente.telefone || "-";

    const cpf =
        cliente.cpf || "-";

    const cnpj =
        cliente.cnpj || "-";

    const ehPessoaJuridica =
        cliente.tipoPessoa === "juridica";

    const rg =
        cliente.rg || "-";

    const endereco =
        cliente.endereco || "-";

    const estado =
        cliente.estado || "-";

    const cidade =
        cliente.cidade || "-";


    // ==================================================
    // TÍTULO
    // ==================================================

    tituloCliente.textContent = nome;

    document.title = `Cliente - ${nome}`;


    // ==================================================
    // BOTÃO EDITAR
    // ==================================================

    botaoEditar.href =
        `editar-cliente.html?id=${encodeURIComponent(cliente.id)}`;


    // ==================================================
    // INFORMAÇÕES
    // ==================================================

    areaCliente.innerHTML = `

        <div class="tituloCard">

            <i class="fas fa-user"></i>

            <h2>
                Dados do cliente
            </h2>

        </div>


        <div class="informacoesGrid">


            <!-- NOME -->

            <div class="informacao nome">

                <label>
                    Nome Completo
                </label>

                <span>
                    ${escaparHTML(nome)}
                </span>

            </div>


            <!-- EMAIL -->

            <div class="informacao">

                <label>
                    Email
                </label>

                <span>
                    ${escaparHTML(email)}
                </span>

            </div>


            <!-- TELEFONE -->

            <div class="informacao">

                <label>
                    Telefone
                </label>

                <span>
                    ${escaparHTML(telefone)}
                </span>

            </div>


            <!-- CPF / CNPJ -->

            <div class="informacao">

                <label>
                    ${ehPessoaJuridica ? "CNPJ" : "CPF"}
                </label>

                <span>
                    ${escaparHTML(ehPessoaJuridica ? cnpj : cpf)}
                </span>

            </div>


            <!-- RG -->

            <div class="informacao">

                <label>
                    RG
                </label>

                <span>
                    ${escaparHTML(rg)}
                </span>

            </div>


            <!-- ENDEREÇO -->

            <div class="informacao">

                <label>
                    Endereço
                </label>

                <span>
                    ${escaparHTML(endereco)}
                </span>

            </div>


            <!-- ESTADO -->

            <div class="informacao">

                <label>
                    Estado
                </label>

                <span>
                    ${escaparHTML(estado)}
                </span>

            </div>


            <!-- CIDADE -->

            <div class="informacao">

                <label>
                    Cidade
                </label>

                <span>
                    ${escaparHTML(cidade)}
                </span>

            </div>


        </div>

    `;

}


// ======================================================
// MOSTRAR ERRO
// ======================================================

function mostrarErro(mensagem) {

    areaCliente.innerHTML = `

        <div class="erro">

            <i class="fas fa-circle-exclamation"></i>

            <p>
                ${escaparHTML(mensagem)}
            </p>

        </div>

    `;

}


// ======================================================
// PROTEGER TEXTO HTML
// ======================================================

function escaparHTML(valor) {

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}