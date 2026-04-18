# 🥟 WhatsApp Flow — Salgaderia Bot

Sistema completo de atendimento automatizado para salgaderia via WhatsApp.

## O que este sistema faz

- Recebe mensagens do WhatsApp via **Evolution API**
- Conduz o cliente por um menu guiado (sem IA, sem erro)
- Coleta: produto, quantidade, data, horário, retirada/entrega, endereço
- Calcula o valor automaticamente
- Confirma o pedido com o cliente
- Salva no **PostgreSQL**
- Cria evento no **Google Agenda**
- Envia resumo de produção para o dono via WhatsApp

---

## Como rodar (passo a passo)

### 1. Pré-requisitos
- Node.js 18+
- PostgreSQL rodando (local ou VPS)
- Docker (opcional, para subir o banco)

### 2. Clonar e instalar
```bash
git clone https://github.com/thukhanch/whatsapp-flow.git
cd whatsapp-flow
npm install --prefix apps/api
npm install --prefix apps/web
```

### 3. Banco de dados
```bash
# Se quiser usar Docker (mais fácil):
docker compose up -d

# Depois, executar o schema:
psql -U postgres -d whatsapp_flow -f database/schema.sql
psql -U postgres -d whatsapp_flow -f database/seed.sql
```

### 4. Variáveis de ambiente
```bash
cp .env.example apps/api/.env
# Edite apps/api/.env com seus dados
```

### 5. Rodar o sistema
```bash
# Terminal 1 — Backend
cd apps/api && npm run dev

# Terminal 2 — Frontend (dashboard)
cd apps/web && npm run dev
```

Acesse: http://localhost:5173

---

## Configurar a Evolution API (WhatsApp)

No painel da sua Evolution API, configure o webhook para apontar para:

```
POST https://sua-vps.com/api/salgaderia/webhook
```

Ou, rodando localmente com ngrok:
```bash
ngrok http 3000
# Use a URL gerada: https://xxxx.ngrok.io/api/salgaderia/webhook
```

---

## Configurar o Google Agenda

1. Acesse: https://console.cloud.google.com
2. Crie um projeto → habilite "Google Calendar API"
3. Crie uma **Service Account** → baixe o JSON
4. No Google Agenda, compartilhe o calendário com o e-mail da service account (com permissão de edição)
5. Cole o conteúdo do JSON em `GOOGLE_SERVICE_ACCOUNT_JSON` no `.env`

---

## Testar sem WhatsApp

Acesse o dashboard → aba **🥟 Salgaderia Bot** → aba **🧪 Testar**

Sequência completa:
1. `oi` → recebe menu
2. `1` → escolhe Coxinha
3. `50` → 50 unidades
4. `25/04` → data
5. `14:00` → horário
6. `1` → retirada
7. `sim` → pedido confirmado! ✅

---

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/salgaderia/webhook` | Recebe mensagens da Evolution API |
| POST | `/api/salgaderia/simular` | Testa sem WhatsApp |
| GET | `/api/salgaderia/pedidos` | Lista todos os pedidos |
| GET | `/api/salgaderia/clientes` | Lista todos os clientes |
| GET | `/api/salgaderia/configuracoes` | Lista preços e configs |
| PUT | `/api/salgaderia/configuracoes/:chave` | Edita preço/config |
| POST | `/api/salgaderia/lembretes/executar` | Dispara lembretes do dia |

---

## Estrutura do projeto

```
whatsapp-flow/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   └── src/modules/
│   │       ├── salgaderia/           # ← Módulo principal
│   │       │   ├── salgaderia.service.ts    # Máquina de estados
│   │       │   ├── salgaderia.controller.ts # Webhook + API REST
│   │       │   ├── evolution-api.service.ts # Envio de mensagens
│   │       │   ├── google-calendar.service.ts # Criação de eventos
│   │       │   └── entities/         # Tabelas do banco
│   │       ├── whatsapp/             # Conexão Baileys (sessões)
│   │       └── workflows/            # Editor visual (workflows)
│   └── web/                          # Frontend React
│       └── src/pages/
│           └── SalgaderiaPage.tsx    # Dashboard da salgaderia
├── database/
│   ├── schema.sql                    # Estrutura das tabelas
│   └── seed.sql                      # Dados iniciais
└── prompts/
    └── system_prompt.txt             # Prompt para IA (versão futura)
```

---

## Próximos passos (pós-MVP)

- [ ] Lembretes automáticos via cron
- [ ] Pagamento via Mercado Pago
- [ ] Impressão de ticket para cozinha
- [ ] Dashboard NocoDB
- [ ] Integração com motoboys
