
const { supabaseAdmin } = require("../config/supabase");

// ==========================================================
// CRIAR UMA NOTIFICAÇÃO NO SUPABASE
// ==========================================================

async function criarNotificacao({
    tipo = "sistema",
    titulo = "",
    mensagem = "",
    clienteId = null,
    processoId = null,
    compromissoId = null
}) {
    try {
        const agora = new Date().toISOString();

        const { error } = await supabaseAdmin
            .from("notificacoes")
            .insert({
                tipo,
                titulo,
                mensagem,

                cliente_id: clienteId,
                processo_id: processoId,
                compromisso_id: compromissoId,

                lida: false,
                status: "Não Lida",

                data_envio: agora,
                criado_em: agora
            });

        if (error) {
            throw error;
        }

    } catch (error) {
        // Uma falha na notificação não deve interromper
        // o cadastro ou a atualização principal.

        console.error(
            "Erro ao criar notificação automática:",
            error.message
        );
    }
}

module.exports = {
    criarNotificacao
};
