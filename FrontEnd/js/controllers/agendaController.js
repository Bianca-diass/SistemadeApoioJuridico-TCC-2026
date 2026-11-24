
const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");

// ==================================================
// NORMALIZAR NOME
// ==================================================

function normalizarNome(nome) {
    return String(nome || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

// ==================================================
// LOCALIZAR CLIENTE VINCULADO AO ADVOGADO
// ==================================================

async function resolverClienteId(advogadoId, dados) {
    const clienteId = dados.clienteId || null;
    const nomeCliente = String(dados.nome || "").trim();

    if (!clienteId && !nomeCliente) {
        return null;
    }

    // Buscar clientes vinculados ao advogado
    const { data: vinculos, error: erroVinculos } =
        await supabaseAdmin
            .from("advogado_clientes")
            .select("cliente_id")
            .eq("advogado_id", advogadoId);

    if (erroVinculos) throw erroVinculos;

    const ids = (vinculos || []).map(v => v.cliente_id);

    if (!ids.length) {
        throw new Error(
            "Este advogado ainda não possui clientes vinculados."
        );
    }

    // Se recebeu ID, conferir se pertence ao advogado
    if (clienteId) {
        if (!ids.some(id => String(id) === String(clienteId))) {
            throw new Error(
                "O cliente informado não pertence à sua lista."
            );
        }

        return clienteId;
    }

    // Buscar os clientes vinculados
    const { data: clientes, error: erroClientes } =
        await supabaseAdmin
            .from("clientes")
            .select("id, nome")
            .in("id", ids);

    if (erroClientes) throw erroClientes;

    const nomeNormalizado = normalizarNome(nomeCliente);

    const encontrados = (clientes || []).filter(cliente =>
        normalizarNome(cliente.nome) === nomeNormalizado
    );

    if (encontrados.length === 0) {
        throw new Error(
            "Cliente não encontrado na sua lista. Verifique o nome cadastrado."
        );
    }

    if (encontrados.length > 1) {
        throw new Error(
            "Existem clientes com o mesmo nome. É necessário identificar o cliente pelo ID."
        );
    }

    return encontrados[0].id;
}

// ==================================================
// CADASTRAR COMPROMISSO
// ==================================================

const cadastrarCompromisso = async (req, res) => {
    try {
        const {
            titulo,
            descricao,
            tipo,
            data,
            horario,
            dataPrazo,
            data_prazo,
            horaPrazo,
            hora_prazo,
            cliente,
            clienteId,
            cliente_id,
            processo,
            local,
            status,
            concluido
        } = req.body;

        const advogadoId = req.advogado.id;

        const clienteIdFinal = await resolverClienteId(
            advogadoId,
            {
                clienteId: clienteId || cliente_id,
                nome: cliente
            }
        );

        const compromisso = {
            titulo: titulo || "",
            descricao: descricao || "",
            tipo: tipo || "",
            data: data || "",
            horario: horario || "",
            data_prazo: dataPrazo || data_prazo || null,
            hora_prazo: horaPrazo || hora_prazo || null,
            cliente: cliente || "",
            cliente_id: clienteIdFinal,
            advogado_id: advogadoId,
            processo: processo || "",
            local: local || "",
            status: status || "Agendado",
            concluido: concluido === true
        };

        const { data: novoCompromisso, error } =
            await supabaseAdmin
                .from("agenda")
                .insert(compromisso)
                .select("*")
                .single();

        if (error) throw error;

        // Criar notificação para o cliente
        if (clienteIdFinal) {

            let tituloNotificacao = "Novo compromisso cadastrado";
            let tipoNotificacao = "sistema";

            const tipoNormalizado = normalizarNome(tipo);

            if (tipoNormalizado === "audiencia") {
                tituloNotificacao = "Audiência marcada";
                tipoNotificacao = "audiencia";
            } else if (tipoNormalizado === "prazo") {
                tituloNotificacao = "Novo prazo cadastrado";
                tipoNotificacao = "prazo";
            }

            await criarNotificacao({
                tipo: tipoNotificacao,
                titulo: tituloNotificacao,
                mensagem:
                    `${compromisso.titulo || "Compromisso"} - ` +
                    `${compromisso.data || "Data não informada"} ` +
                    `às ${compromisso.horario || "--:--"} ` +
                    (compromisso.local
                        ? `- Local: ${compromisso.local}`
                        : ""),
                clienteId: clienteIdFinal,
                compromissoId: novoCompromisso.id
            });
        }

        return res.status(201).json({
            mensagem: "Compromisso cadastrado com sucesso.",
            compromisso: novoCompromisso
        });

    } catch (error) {
        console.error("Erro ao cadastrar compromisso:", error);

        return res.status(400).json({
            erro: error.message || "Erro ao cadastrar compromisso."
        });
    }
};

// ==================================================
// LISTAR COMPROMISSOS DO ADVOGADO
// ==================================================

const listarCompromissos = async (req, res) => {
    try {
        const advogadoId = req.advogado.id;

        const { data, error } = await supabaseAdmin
            .from("agenda")
            .select("*")
            .eq("advogado_id", advogadoId)
            .order("data", { ascending: true });

        if (error) throw error;

        return res.status(200).json(data || []);

    } catch (error) {
        console.error("Erro ao listar compromissos:", error);

        return res.status(500).json({
            erro: "Erro ao listar compromissos."
        });
    }
};

// ==================================================
// ATUALIZAR COMPROMISSO
// ==================================================

const atualizarCompromisso = async (req, res) => {
    try {
        const { id } = req.params;
        const advogadoId = req.advogado.id;

        const camposPermitidos = {
            titulo: "titulo",
            descricao: "descricao",
            tipo: "tipo",
            data: "data",
            horario: "horario",
            dataPrazo: "data_prazo",
            data_prazo: "data_prazo",
            horaPrazo: "hora_prazo",
            hora_prazo: "hora_prazo",
            cliente: "cliente",
            clienteId: "cliente_id",
            cliente_id: "cliente_id",
            processo: "processo",
            local: "local",
            status: "status",
            concluido: "concluido"
        };

        const atualizacao = {};

        Object.entries(camposPermitidos).forEach(([campo, coluna]) => {
            if (req.body[campo] !== undefined) {
                atualizacao[coluna] = req.body[campo];
            }
        });

        if (!Object.keys(atualizacao).length) {
            return res.status(400).json({
                erro: "Nenhum campo válido informado."
            });
        }

        const { data: atual, error: erroBusca } =
            await supabaseAdmin
                .from("agenda")
                .select("*")
                .eq("id", id)
                .eq("advogado_id", advogadoId)
                .maybeSingle();

        if (erroBusca) throw erroBusca;

        if (!atual) {
            return res.status(404).json({
                erro: "Compromisso não encontrado."
            });
        }

        if (
            atualizacao.cliente !== undefined ||
            atualizacao.cliente_id !== undefined
        ) {
            atualizacao.cliente_id = await resolverClienteId(
                advogadoId,
                {
                    clienteId: atualizacao.cliente_id,
                    nome: atualizacao.cliente !== undefined
                        ? atualizacao.cliente
                        : atual.cliente
                }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("agenda")
            .update(atualizacao)
            .eq("id", id)
            .eq("advogado_id", advogadoId)
            .select("id");

        if (error) throw error;

        if (!data || !data.length) {
            return res.status(404).json({
                erro: "Compromisso não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Compromisso atualizado com sucesso."
        });

    } catch (error) {
        console.error("Erro ao atualizar compromisso:", error);

        return res.status(400).json({
            erro: error.message || "Erro ao atualizar compromisso."
        });
    }
};

// ==================================================
// EXCLUIR COMPROMISSO
// ==================================================

const excluirCompromisso = async (req, res) => {
    try {
        const { id } = req.params;
        const advogadoId = req.advogado.id;

        const { data, error } = await supabaseAdmin
            .from("agenda")
            .delete()
            .eq("id", id)
            .eq("advogado_id", advogadoId)
            .select("id");

        if (error) throw error;

        if (!data || !data.length) {
            return res.status(404).json({
                erro: "Compromisso não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Compromisso excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir compromisso:", error);

        return res.status(500).json({
            erro: "Erro ao excluir compromisso."
        });
    }
};

module.exports = {
    cadastrarCompromisso,
    listarCompromissos,
    atualizarCompromisso,
    excluirCompromisso
};
