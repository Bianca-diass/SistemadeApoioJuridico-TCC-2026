
function criarBotaoExcluirModal() {
    const descricao = elemento("modalDescricao");

    if (!descricao) return;

    // Remove o botão anterior, se existir
    elemento("excluirDocumentoModal")?.remove();

    const botao = document.createElement("button");

    botao.type = "button";
    botao.id = "excluirDocumentoModal";
    botao.innerHTML = '<i class="fas fa-trash"></i> Excluir documento';

    botao.style.cssText = `
        display: block;
        width: 100%;
        margin-top: 15px;
        padding: 12px;
        background: #dc3545;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        position: static;
        float: none;
    `;

    botao.addEventListener("click", async () => {
        if (!documentoVisualizadoId) {
            alert("Não foi possível identificar o documento.");
            return;
        }

        const sucesso = await removerDocumento(documentoVisualizadoId);

        if (sucesso) {
            elemento("modalDocumento").hidden = true;
            documentoVisualizadoId = null;
        }
    });

    // Insere o botão logo abaixo da descrição, dentro do modal
    descricao.parentElement.insertAdjacentElement("afterend", botao);
}
