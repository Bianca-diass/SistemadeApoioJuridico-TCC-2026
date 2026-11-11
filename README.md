# Sistema de Apoio Jurídico (TCC 2026)

Sistema web de apoio jurídico que conecta advogados e clientes, reunindo em um só lugar a gestão de clientes, processos, documentos e agenda, com notificações automáticas de prazos e audiências. Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC).

## Funcionalidades

**Área do advogado**
- Login e cadastro
- Dashboard com visão geral
- Cadastro, listagem, detalhes e edição de clientes
- Cadastro, acompanhamento e visualização de processos
- Agenda de compromissos, prazos e audiências
- Upload e gestão de documentos
- Relatórios
- Configurações de perfil e alteração de senha

**Área do cliente**
- Login e cadastro
- Dashboard com o andamento dos seus processos
- Consulta de agenda e documentos
- Configurações do perfil

**Automações**
- Notificações automáticas ao cadastrar compromissos (RF007)
- Job de lembretes que verifica prazos e audiências próximos e cria notificações no Firestore

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Front-end | HTML, CSS e JavaScript (ES Modules), Font Awesome |
| Back-end | Node.js, Express 5, CORS, dotenv |
| Banco de dados e autenticação | Firebase (Authentication, Firestore e Storage) via `firebase-admin` |

## Estrutura do projeto

```
TCC 2 - Sistema Juridico/
├── FrontEnd/
│   ├── index.html
│   ├── assets/            # imagens
│   ├── css/               # estilos (style-advogado/ e style-cliente/)
│   ├── pages/             # páginas (advogado/ e cliente/)
│   └── js/
│       ├── config/        # configuração do Firebase (web)
│       ├── controllers/
│       ├── services/      # chamadas à API
│       ├── pages/         # scripts de cada página
│       └── utils/
├── backend/
│   ├── .env               # variáveis de ambiente (não versionado)
│   ├── firebase-key.json  # chave da conta de serviço (não versionado)
│   └── src/
│       ├── server.js
│       ├── config/        # inicialização do Firebase Admin
│       ├── routes/
│       ├── controllers/
│       ├── middlewares/   # validação do token
│       ├── services/
│       ├── jobs/          # job de lembretes
│       └── models/
└── README.md
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Um projeto no [Firebase](https://console.firebase.google.com/) com **Authentication** (e-mail/senha), **Firestore** e **Storage** ativados
- Git

## Como executar

### 1. Clonar o repositório

```bash
git clone https://github.com/Bianca-diass/SistemadeApoioJuridico-TCC-2026.git
cd SistemadeApoioJuridico-TCC-2026
```

### 2. Instalar as dependências do back-end

```bash
cd backend
npm install
```

### 3. Configurar o Firebase

**Chave da conta de serviço**

1. No Console do Firebase, abra **Configurações do projeto → Contas de serviço**.
2. Clique em **Gerar nova chave privada**.
3. Salve o arquivo baixado como `backend/firebase-key.json`.

**Variáveis de ambiente**

Crie o arquivo `backend/.env`:

```env
FIREBASE_WEB_API_KEY=sua_chave_de_api_web_do_firebase
# Opcionais:
# FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
# PORT=3000
```

A chave de API web fica em **Configurações do projeto → Geral → Seus aplicativos**.

**Configuração do front-end**

Confira se o arquivo `FrontEnd/js/config/firebaseConfig.js` está com os dados do seu projeto Firebase.

> **Segurança:** `firebase-key.json` e `.env` já estão no `.gitignore`. Nunca envie esses arquivos para o GitHub nem os compartilhe. Se algum deles vazar, gere uma nova chave no Firebase.

### 4. Iniciar o servidor

Ainda dentro da pasta `backend`:

```bash
npm start
```

O servidor sobe na porta **3000** e também serve o front-end. Você deve ver a mensagem:

```
🚀 Servidor rodando na porta 3000
```

### 5. Acessar o sistema

Abra no navegador:

```
http://localhost:3000
```

Para testar a API diretamente, faça o login em `POST /auth/login` e use o token retornado no cabeçalho `Authorization: Bearer <token>` das demais rotas.

## Rotas da API

Todas as rotas, exceto `/auth/login` e `/auth/register`, exigem token do Firebase no cabeçalho `Authorization: Bearer <token>`.

| Recurso | Rotas |
|---|---|
| Autenticação | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/password` |
| Clientes (gestão pelo advogado) | `POST /clientes`, `GET /clientes`, `PUT /clientes/:id`, `DELETE /clientes/:id` |
| Perfil do cliente logado | `GET /cliente/perfil`, `PUT /cliente/configuracoes` |
| Processos | `POST /processos`, `GET /processos`, `PUT /processos/:id`, `DELETE /processos/:id` |
| Agenda | `POST /agenda`, `GET /agenda`, `PUT /agenda/:id`, `DELETE /agenda/:id` |
| Documentos | `POST /documentos`, `GET /documentos`, `GET /documentos/:id`, `PUT /documentos/:id`, `DELETE /documentos/:id` |
| Notificações | `GET /notificacoes`, `POST /notificacoes`, `PUT /notificacoes/:id`, `DELETE /notificacoes/:id` |

## Coleções do Firestore

- `advogados`: perfil dos advogados (ID do documento = UID do login)
- `clientes`: cadastro dos clientes
- `processos`: processos jurídicos
- `agenda`: compromissos, prazos e audiências
- `documentos`: documentos enviados
- `notificacoes`: notificações geradas pelo sistema

## Observações

- O front-end chama a API em `http://localhost:3000`. Para publicar o sistema, altere essa URL nos arquivos de `FrontEnd/js/services/`.
- Não há testes automatizados configurados (`npm test` apenas exibe um aviso).

## Autora

**Bianca Dias Gonzaga**
Repositório: [github.com/Bianca-diass/SistemadeApoioJuridico-TCC-2026](https://github.com/Bianca-diass/SistemadeApoioJuridico-TCC-2026)