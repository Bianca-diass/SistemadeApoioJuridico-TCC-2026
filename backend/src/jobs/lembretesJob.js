// ==========================================================
// backend/src/jobs/lembretesJob.js
//
// Job periódico (roda sozinho enquanto o servidor está no ar)
// que verifica prazos e audiências se aproximando e cria
// notificações automáticas — completa o requisito:
//
// RF007 - O sistema deve enviar notificações automáticas
// sobre prazos, audiências e atualizações de processos.
//
// Não depende de nenhuma biblioteca externa de "cron":
// usa apenas setInterval, o que é suficiente enquanto o
// processo Node do backend continuar rodando.
// ==========================================================

const { db } = require("../config/firebase");
const { criarNotificacao } = require("../services/notificacaoService");


// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

// De quanto em quanto tempo o job roda
const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000; // 5 minutos

// Com quantas horas de antecedência avisar sobre um
// compromisso (audiência/reunião/prazo na agenda)
const HORAS_ANTECEDENCIA_COMPROMISSO = 24;

// Com quantas horas de antecedência avisar sobre o campo
// "prazo" cadastrado direto no processo
const HORAS_ANTECEDENCIA_PRAZO_PROCESSO = 48;


// ==========================================================
// AUXILIAR: TRANSFORMA "data" + "horario" EM UM Date
// ==========================================================

function combinarDataHorario(data, horario) {

    if (!data) return null;

    const dataCompleta = new Date(`${data}T${horario || "00:00"}`);

    return isNaN(dataCompleta.getTime()) ? null : dataCompleta;

}


// ==========================================================
// VERIFICA COMPROMISSOS PRÓXIMOS (AUDIÊNCIAS / PRAZOS / etc.)
// ==========================================================

async function verificarCompromissosProximos() {

    try {

        const agora = new Date();

        const limite = new Date(
            agora.getTime() +
            HORAS_ANTECEDENCIA_COMPROMISSO * 60 * 60 * 1000
        );

        const snapshot = await db.collection("agenda").get();

        for (const doc of snapshot.docs) {

            const compromisso = doc.data();

            // Já concluído ou já avisado? Pula.
            if (compromisso.concluido === true) continue;
            if (compromisso.status === "Concluído") continue;
            if (compromisso.lembreteEnviado === true) continue;

            const dataCompromisso = combinarDataHorario(
                compromisso.data,
                compromisso.horario
            );

            if (!dataCompromisso) continue;

            // Está dentro da janela de antecedência e ainda não passou?
            if (dataCompromisso >= agora && dataCompromisso <= limite) {

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

                    compromissoId: doc.id

                });

                // Marca para não notificar de novo a cada execução do job
                await doc.ref.update({ lembreteEnviado: true });

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
// VERIFICA PRAZOS CADASTRADOS DIRETO NO PROCESSO
// ==========================================================

async function verificarPrazosDeProcessos() {

    try {

        const agora = new Date();

        const limite = new Date(
            agora.getTime() +
            HORAS_ANTECEDENCIA_PRAZO_PROCESSO * 60 * 60 * 1000
        );

        const snapshot = await db.collection("processos").get();

        for (const doc of snapshot.docs) {

            const processo = doc.data();

            if (!processo.prazo) continue;
            if (processo.lembretePrazoEnviado === true) continue;

            const dataPrazo = new Date(processo.prazo);

            if (isNaN(dataPrazo.getTime())) continue;

            if (dataPrazo >= agora && dataPrazo <= limite) {

                await criarNotificacao({

                    tipo: "prazo",

                    titulo: "Prazo processual próximo do vencimento",

                    mensagem:
                        `O processo ${processo.numeroProcesso || "sem número"} ` +
                        `(cliente: ${processo.cliente || "não informado"}) ` +
                        `tem prazo em ${processo.prazo}.`,

                    processoId: doc.id

                });

                await doc.ref.update({ lembretePrazoEnviado: true });

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
// EXECUTA UMA RODADA COMPLETA
// ==========================================================

async function executarVerificacoes() {

    await verificarCompromissosProximos();
    await verificarPrazosDeProcessos();

}


// ==========================================================
// INICIA O JOB (chamado uma vez no server.js)
// ==========================================================

function iniciarJobDeLembretes() {

    // Primeira verificação logo após o servidor subir
    executarVerificacoes();

    // E depois repete no intervalo configurado
    setInterval(executarVerificacoes, INTERVALO_VERIFICACAO_MS);

    console.log(
        `🔔 Job de lembretes automáticos iniciado ` +
        `(verifica a cada ${INTERVALO_VERIFICACAO_MS / 60000} minutos).`
    );

}


module.exports = {
    iniciarJobDeLembretes
};