
const { supabaseAdmin } = require("../config/supabase");
const { criarNotificacao } = require("../services/notificacaoService");

const {
    buscarClienteVinculado,
    normalizarTexto
} = require("../utils/vinculoCliente");

// ==========================================================
// CAMPOS PERMITIDOS PARA ATUALIZAÇÃO
// ==========================================================

const camposPermitidos = {
    numeroProcesso: "numero_processo",
    numero_processo: "numero_processo",

    cliente: "cliente",
    clienteId: "cliente_id",
    cliente_id: "cliente_id",

    advogado: "advogado",
    vara: "vara",
    tribunal: "tribunal",
    comarca: "comarca",
    status: "status",

    tipoManifestacao: "tipo_manifestacao",
    tipo_manifestacao: "tipo_manifestacao",

    ultimaMovimentacao: "ultima_movimentacao",
    ultima_movimentacao: "ultima_movimentacao",

    intimacao: "intimacao",
    prazo: "prazo",

    dataAbertura: "data_abertura",
    data_abertura: "data_abertura",

    observacoes: "observacoes"
};

function converterCampos(dados) {
    const resultado = {};

    for (const [campo, valor] of Object.entries(dados)) {
        const campoBanco = camposPermitidos[campo];

        if (campoBanco) {
            resultado[campoBanco] = valor;
        }
    }

    return resultado;
}

// ==========================================================
// CADASTRAR PROCESSO
// ==========================================================

const cadastrarProcesso = async (req, res) => {
    try {
        const {
            numeroProcesso,
            numero_processo,

            cliente,
            clienteId,
            cliente_id,

            vara,
            tribunal,
            comarca,
            status,

            tipoManifestacao,
            ultimaMovimentacao,

            intimacao,
            prazo,

            dataAbertura,
            observacoes
        } = req.body;

        const advogadoId = req.advogado.id;

        // O processo precisa estar vinculado a um cliente
        // cadastrado pelo advogado autenticado.

        const clienteVinculado = await buscarClienteVinculado(
            advogadoId,
            {
                clienteId: clienteId || cliente_id,
                nome: cliente
            }
        );

        if (!clienteVinculado) {
            return res.status(400).json({
                erro:
                    "Cliente não encontrado na sua lista. " +
                    "Selecione um cliente cadastrado para " +
                    "que o processo apareça no painel dele."
            });
        }

        // Permite cadastrar vários processos para o mesmo cliente.
        // Não bloqueia o cadastro por repetição do número do processo.

        const numeroFinal =
            numeroProcesso || numero_processo || "";

        const processo = {
            numero_processo: numeroFinal,

            cliente: clienteVinculado.nome || cliente || "",
            cliente_id: clienteVinculado.id,

            advogado:
                req.advogado.nome ||
                req.usuario.email ||
                "",

            advogado_id: advogadoId,

            vara: vara || "",
            tribunal: tribunal || "",
            comarca: comarca || "",

            status: status || "",

            tipo_manifestacao:
                tipoManifestacao || "Nenhuma",

            ultima_movimentacao:
                ultimaMovimentacao || "",

            intimacao: intimacao === true,

            prazo: prazo || "",

            data_abertura: dataAbertura || "",

            observacoes: observacoes || ""
        };

        const { data, error } = await supabaseAdmin
            .from("processos")
            .insert(processo)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        // Notificação do novo processo cadastrado.

        try {
            await criarNotificacao({
                tipo: "processo",

                titulo: "Novo processo cadastrado",

                mensagem:
                    `O processo ${data.numero_processo || "sem número"} ` +
                    `(cliente: ${data.cliente || "não informado"}) ` +
                    "foi cadastrado no sistema.",

                clienteId: data.cliente_id,
                processoId: data.id
            });
        } catch (erroNotificacao) {
            console.error(
                "Erro ao criar notificação do processo:",
                erroNotificacao
            );
        }

        return res.status(201).json({
            mensagem: "Processo cadastrado com sucesso",
            id: data.id,
            processo: data
        });

    } catch (error) {
        console.error("Erro ao cadastrar processo:", error);

        return res.status(500).json({
            erro: error.message || "Erro ao cadastrar processo."
        });
    }
};

// ==========================================================
// LISTAR PROCESSOS DO ADVOGADO
// ==========================================================

const listarProcessos = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("processos")
            .select("*")
            .eq("advogado_id", req.advogado.id)
            .order("criado_em", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        return res.status(200).json(data || []);

    } catch (error) {
        console.error("Erro ao listar processos:", error);

        return res.status(500).json({
            erro: error.message || "Erro ao listar processos."
        });
    }
};

// ==========================================================
// BUSCAR PROCESSO
// ==========================================================

const buscarProcesso = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                erro: "ID do processo não informado."
            });
        }

        const { data, error } = await supabaseAdmin
            .from("processos")
            .select("*")
            .eq("id", id)
            .eq("advogado_id", req.advogado.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                erro: "Processo não encontrado."
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro ao buscar processo:", error);

        return res.status(500).json({
            erro: error.message || "Erro ao buscar processo."
        });
    }
};

// ==========================================================
// ATUALIZAR PROCESSO
// ==========================================================

const atualizarProcesso = async (req, res) => {
    try {
        const { id } = req.params;
        const advogadoId = req.advogado.id;

        const { data: dadosAntes, error: erroBusca } =
            await supabaseAdmin
                .from("processos")
                .select("*")
                .eq("id", id)
                .eq("advogado_id", advogadoId)
                .maybeSingle();

        if (erroBusca) {
            throw erroBusca;
        }

        if (!dadosAntes) {
            return res.status(404).json({
                erro: "Processo não encontrado."
            });
        }

        const atualizacao = converterCampos(req.body);

        if (Object.keys(atualizacao).length === 0) {
            return res.status(400).json({
                erro: "Nenhum campo válido informado para atualização."
            });
        }

        // ======================================================
        // VÍNCULO COM O CLIENTE
        // ======================================================

        if (
            atualizacao.cliente_id === "" ||
            atualizacao.cliente_id === null
        ) {
            delete atualizacao.cliente_id;
        }

        const pediuCliente =
            atualizacao.cliente_id !== undefined;

        const pediuNome =
            atualizacao.cliente !== undefined;

        const trocouCliente =
            (
                pediuCliente &&
                String(atualizacao.cliente_id) !==
                    String(dadosAntes.cliente_id)
            ) ||
            (
                pediuNome &&
                normalizarTexto(atualizacao.cliente) !==
                    normalizarTexto(dadosAntes.cliente)
            );

        if (trocouCliente || !dadosAntes.cliente_id) {
            const vinculado = await buscarClienteVinculado(
                advogadoId,
                {
                    clienteId: atualizacao.cliente_id,

                    nome: pediuNome
                        ? atualizacao.cliente
                        : dadosAntes.cliente
                }
            );

            if (vinculado) {
                atualizacao.cliente_id = vinculado.id;
                atualizacao.cliente = vinculado.nome;

            } else if (trocouCliente) {
                return res.status(400).json({
                    erro:
                        "Cliente não encontrado na sua lista. " +
                        "Selecione um cliente cadastrado."
                });

            } else {
                delete atualizacao.cliente_id;
                delete atualizacao.cliente;
            }

        } else {
            // Mantém o vínculo com o cliente original.
            delete atualizacao.cliente_id;
            delete atualizacao.cliente;
        }

        if (Object.keys(atualizacao).length === 0) {
            return res.status(400).json({
                erro: "Nenhum campo válido informado para atualização."
            });
        }

        // ======================================================
        // SALVAR ALTERAÇÕES
        // ======================================================

        const { data, error } = await supabaseAdmin
            .from("processos")
            .update(atualizacao)
            .eq("id", id)
            .eq("advogado_id", advogadoId)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        const numeroProcesso =
            data.numero_processo || "sem número";

        const statusMudou =
            atualizacao.status !== undefined &&
            atualizacao.status !== dadosAntes.status;

        // ======================================================
        // NOTIFICAÇÃO DA ATUALIZAÇÃO
        // ======================================================

        try {
            await criarNotificacao({
                tipo: "processo",

                titulo: statusMudou
                    ? "Status do processo atualizado"
                    : "Processo atualizado",

                mensagem: statusMudou
                    ? `O processo ${numeroProcesso} mudou de status: ` +
                      `"${dadosAntes.status || "-"}" → "${data.status}".`
                    : `O processo ${numeroProcesso} foi atualizado.`,

                clienteId: data.cliente_id,
                processoId: id
            });
        } catch (erroNotificacao) {
            console.error(
                "Erro ao criar notificação da atualização:",
                erroNotificacao
            );
        }

        return res.status(200).json({
            mensagem: "Processo atualizado com sucesso",
            processo: data
        });

    } catch (error) {
        console.error("Erro ao atualizar processo:", error);

        return res.status(500).json({
            erro: error.message || "Erro ao atualizar processo."
        });
    }
};

// ==========================================================
// EXCLUIR PROCESSO
// ==========================================================

const excluirProcesso = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from("processos")
            .delete()
            .eq("id", id)
            .eq("advogado_id", req.advogado.id)
            .select("id")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                erro: "Processo não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Processo excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir processo:", error);

        return res.status(500).json({
            erro: error.message || "Erro ao excluir processo."
        });
    }
};

// ==========================================================
// EXPORTAÇÕES
// ==========================================================

module.exports = {
    cadastrarProcesso,
    listarProcessos,
    buscarProcesso,
    atualizarProcesso,
    excluirProcesso
};
