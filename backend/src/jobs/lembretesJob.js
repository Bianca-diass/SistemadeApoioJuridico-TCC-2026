
const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");

// ==========================================================
// CONFIGURAÇÕES
// ==========================================================

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000;

const HORAS_ANTECEDENCIA_COMPROMISSO = 24;
const HORAS_ANTECEDENCIA_PRAZO_PROCESSO = 48;


// ==========================================================
// COMBINAR DATA E HORÁRIO
// ==========================================================

function combinarDataHorario(data, horario) {
    if (!data) return null;

    const dataCompleta = new Date(
        `${data}T${horario || "00:00"}`
    );

    return isNaN(dataCompleta.getTime())
        ? null
        : dataCompleta;
}


// ==========================================================
// VERIFICAR COMPROMISSOS DA AGENDA
// ==========================================================

async function verificarCompromissosProximos() {
    try {
        const agora = new Date();

        const limite = new Date(
            agora.getTime() +
            HORAS_ANTECEDENCIA_COMPROMISSO * 60 * 60 * 1000
        );

        const { data: compromissos, error } = await supabaseAdmin
            .from("agenda")
            .select("*");

        if (error) throw error;

        for (const compromisso of compromissos || []) {
            if (compromisso.concluido === true) continue;

            if (compromisso.status === "Concluído") continue;

            if (compromisso.lembrete_enviado === true) continue;

            const dataCompromisso = combinarDataHorario(
                compromisso.data,
                compromisso.horario
            );

            if (!dataCompromisso) continue;

            if (
                dataCompromisso >= agora &&
                dataCompromisso <= limite
            ) {
                const tipoNormalizado =
                    String(compromisso.tipo || "").toLowerCase();

                const ehAudiencia =
                    tipoNormalizado === "audiência" ||
                    tipoNormalizado === "audiencia";

                const ehPrazo =
                    tipoNormalizado === "prazo";

                await criarNotificacao({
                    tipo: ehAudiencia
                        ? "audiencia"
                        : (ehPrazo ? "prazo" : "sistema"),

                    titulo: ehAudiencia
                        ? "Audiência se aproximando"
                        : (ehPrazo
                            ? "Prazo se aproximando"
                            : "Compromisso se aproximando"),

                    mensagem:
                        `${compromisso.titulo || "Compromisso"} em ` +
                        `${compromisso.data} às ${compromisso.horario || "--:--"}` +
                        (compromisso.cliente
                            ? ` (Cliente: ${compromisso.cliente})`
                            : ""),

                    clienteId: compromisso.cliente_id || null,
                    compromissoId: compromisso.id
                });

                const { error: erroAtualizacao } = await supabaseAdmin
                    .from("agenda")
                    .update({ lembrete_enviado: true })
                    .eq("id", compromisso.id);

                if (erroAtualizacao) throw erroAtualizacao;
            }
        }

    } catch (error) {
        console.error(
            "Erro ao verificar compromissos próximos:",
            error
        );
    }
}


// ==========================================================
// VERIFICAR PRAZOS DOS PROCESSOS
// ==========================================================

async function verificarPrazosDeProcessos() {
    try {
        const agora = new Date();

        const limite = new Date(
            agora.getTime() +
            HORAS_ANTECEDENCIA_PRAZO_PROCESSO * 60 * 60 * 1000
        );

        const { data: processos, error } = await supabaseAdmin
            .from("processos")
            .select("*");

        if (error) throw error;

        for (const processo of processos || []) {
            if (!processo.prazo) continue;

            if (processo.lembrete_prazo_enviado === true) continue;

            const dataPrazo = new Date(processo.prazo);

            if (isNaN(dataPrazo.getTime())) continue;

            if (dataPrazo >= agora && dataPrazo <= limite) {
                await criarNotificacao({
                    tipo: "prazo",

                    titulo: "Prazo processual próximo do vencimento",

                    mensagem:
                        `O processo ${processo.numero_processo || "sem número"} ` +
                        `(cliente: ${processo.cliente || "não informado"}) ` +
                        `tem prazo em ${processo.prazo}.`,

                    clienteId: processo.cliente_id || null,
                    processoId: processo.id
                });

                const { error: erroAtualizacao } = await supabaseAdmin
                    .from("processos")
                    .update({ lembrete_prazo_enviado: true })
                    .eq("id", processo.id);

                if (erroAtualizacao) throw erroAtualizacao;
            }
        }

    } catch (error) {
        console.error(
            "Erro ao verificar prazos de processos:",
            error
        );
    }
}


// ==========================================================
// EXECUTAR VERIFICAÇÕES
// ==========================================================

async function executarVerificacoes() {
    await verificarCompromissosProximos();
    await verificarPrazosDeProcessos();
}


// ==========================================================
// INICIAR JOB
// ==========================================================

function iniciarJobDeLembretes() {
    executarVerificacoes();

    setInterval(
        executarVerificacoes,
        INTERVALO_VERIFICACAO_MS
    );

    console.log(
        "Job de lembretes automáticos iniciado. " +
        "Verificação a cada 5 minutos."
    );
}


module.exports = {
    iniciarJobDeLembretes
};
