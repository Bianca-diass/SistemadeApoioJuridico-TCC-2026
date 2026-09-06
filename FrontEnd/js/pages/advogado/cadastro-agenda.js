import { adicionarCompromisso } from "../../services/agendaService.js";

const form = document.getElementById("formCompromisso");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const compromisso = {

        titulo: document.getElementById("titulo").value.trim(),

        descricao: document.getElementById("descricao").value.trim(),

        tipo: document.getElementById("tipo").value,

        data: document.getElementById("data").value,

        horario: document.getElementById("hora").value,

        dataPrazo: document.getElementById("dataPrazo").value,

        horaPrazo: document.getElementById("horaPrazo").value,

        cliente: document.getElementById("cliente").value.trim(),

        processo: document.getElementById("processo").value.trim(),

        local: document.getElementById("local").value.trim(),

        status: document.getElementById("status").value,

        concluido:
            document.getElementById("status").value === "Concluído"

    };

    console.log("Compromisso enviado:", compromisso);

    try {

        await adicionarCompromisso(compromisso);

        alert("Compromisso cadastrado com sucesso!");

        window.location.href = "agenda-adv.html";

    } catch (erro) {

        console.error("Erro completo:", erro);

        alert(
            erro.message || "Erro ao cadastrar compromisso."
        );

    }

});