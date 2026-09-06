// js/services/cadastro-cliente.js

import { clienteController } from "../controllers/clienteController.js";

const formCliente = document.getElementById("formCliente");

formCliente.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const cliente = {
        nome: document.getElementById("nome").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("email").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
        cidade: document.getElementById("cidade").value.trim(),
        estado: document.getElementById("estado").value.trim(),
    };

    try {

        await clienteController.adicionarCliente(cliente);

        window.location.href = "clientes-adv.html";

    } catch (erro) {

        console.error("Erro ao cadastrar cliente:", erro);

        alert("Não foi possível cadastrar o cliente.");

    }

});