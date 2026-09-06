const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const clientesRoutes = require("./routes/clientes");
const processosRoutes = require("./routes/processos");
const agendaRoutes = require("./routes/agenda");
const documentosRoutes = require("./routes/documentos");

const { iniciarJobDeLembretes } = require("./jobs/lembretesJob");

const app = express();


// ==========================================================
// CONFIGURAÇÕES
// ==========================================================

app.use(cors());

app.use(express.json());


// ==========================================================
// ROTAS DA API
// ==========================================================

app.use("/auth", authRoutes);

app.use("/processos", processosRoutes);

app.use("/clientes", clientesRoutes);

app.use("/agenda", agendaRoutes);

app.use("/documentos", documentosRoutes);


// ==========================================================
// FRONT-END
// ==========================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "../../FrontEnd"
        )
    )
);


// ==========================================================
// TESTE DA API
// ==========================================================

app.get("/", (req, res) => {

    res.json({

        mensagem:
            "API do Sistema Jurídico funcionando!"

    });

});


// ==========================================================
// TRATAMENTO DE ROTAS DA API NÃO ENCONTRADAS
// ==========================================================

app.use("/auth", (req, res) => {

    res.status(404).json({

        erro:
            "Rota de autenticação não encontrada."

    });

});


// ==========================================================
// ERRO GERAL
// ==========================================================

app.use((erro, req, res, next) => {

    console.error(
        "ERRO NO SERVIDOR:",
        erro
    );


    if (res.headersSent) {

        return next(erro);

    }


    res.status(500).json({

        erro:
            "Erro interno do servidor."

    });

});


// ==========================================================
// SERVIDOR
// ==========================================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Servidor rodando na porta ${PORT}`
        );


        // ==========================================================
        // RF007 - Notificações automáticas
        // ==========================================================
        // Inicia o job que verifica prazos e audiências se
        // aproximando e cria notificações automáticas no Firestore.

        iniciarJobDeLembretes();

    }
);