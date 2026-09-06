// ==========================================================
// backend/src/services/notificacaoService.js
//
// Serviço responsável por criar notificações automáticas
// no Firestore (coleção "notificacoes"), usadas para
// cumprir o requisito:
//
// RF007 - O sistema deve enviar notificações automáticas
// sobre prazos, audiências e atualizações de processos.
//
// O front-end já escuta essa coleção em tempo real através
// de js/services/notificacaoService.js (onSnapshot), então
// qualquer notificação criada aqui aparece na hora no
// Dashboard, sem precisar recarregar a página.
// ==========================================================

const { db } = require("../config/firebase");


// ==========================================================
// CRIAR UMA NOTIFICAÇÃO
// ==========================================================
//
// tipo:     "processo" | "prazo" | "audiencia" | "sistema"
// titulo:   texto curto (aparece em destaque)
// mensagem: texto complementar
// clienteId / processoId / compromissoId: referências opcionais

async function criarNotificacao({
    tipo = "sistema",
    titulo = "",
    mensagem = "",
    clienteId = null,
    processoId = null,
    compromissoId = null
}) {

    try {

        await db.collection("notificacoes").add({

            tipo,
            titulo,
            mensagem,

            clienteId,
            processoId,
            compromissoId,

            lida: false,
            status: "Não Lida",

            dataEnvio: new Date(),
            criadoEm: new Date()

        });

    } catch (error) {

        // Uma falha ao notificar não pode derrubar a operação
        // principal (cadastro/edição de processo ou compromisso),
        // então só registramos o erro no console.

        console.error(
            "Erro ao criar notificação automática:",
            error
        );

    }

}


module.exports = {
    criarNotificacao
};