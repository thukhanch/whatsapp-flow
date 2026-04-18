-- ============================================================
-- SALGADERIA BOT - Schema do Banco de Dados
-- Execute este arquivo no PostgreSQL antes de iniciar o sistema
-- ============================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELA: clientes
-- Armazena cada número de WhatsApp que entrou em contato
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  phone       TEXT PRIMARY KEY,           -- ex: +5519912345678
  name        TEXT,                       -- nome capturado da conversa
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone);

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON clientes;
CREATE TRIGGER trigger_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TABELA: conversas
-- Controla o estado atual de cada conversa em andamento
-- Uma conversa fica "aberta" (pedido_em_aberto=true) até o pedido ser confirmado
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
  id               SERIAL PRIMARY KEY,
  phone            TEXT NOT NULL REFERENCES clientes(phone) ON DELETE CASCADE,
  etapa_atual      VARCHAR(50) NOT NULL DEFAULT 'inicio',
  -- Etapas possíveis: inicio, aguardando_item, aguardando_quantidade,
  -- aguardando_data, aguardando_horario, aguardando_tipo_entrega,
  -- aguardando_endereco, aguardando_confirmacao, finalizado
  dados_parciais   JSONB DEFAULT '{}',   -- acumula os dados do pedido em construção
  pedido_em_aberto BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversas_phone  ON conversas(phone);
CREATE INDEX IF NOT EXISTS idx_conversas_etapa  ON conversas(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_conversas_aberta ON conversas(phone, pedido_em_aberto);

DROP TRIGGER IF EXISTS trigger_conversas_updated_at ON conversas;
CREATE TRIGGER trigger_conversas_updated_at
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TABELA: pedidos
-- Pedidos confirmados. Só chega aqui após o cliente dizer SIM.
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id                         SERIAL PRIMARY KEY,
  phone                      TEXT NOT NULL REFERENCES clientes(phone) ON DELETE CASCADE,
  conversa_id                INTEGER NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  item_escolhido             TEXT NOT NULL,        -- ex: "Coxinha"
  quantidade                 INTEGER NOT NULL,      -- mínimo 25
  data_agendamento           DATE NOT NULL,
  horario_agendamento        TIME NOT NULL,
  tipo_entrega               VARCHAR(20) NOT NULL,  -- "retirada" ou "entrega"
  endereco                   TEXT,                  -- obrigatório se tipo_entrega = entrega
  valor_final                DECIMAL(10, 2) NOT NULL,
  status                     VARCHAR(50) DEFAULT 'confirmado',
  -- status: confirmado, em_producao, pronto, entregue, cancelado
  google_event_id            TEXT,                  -- ID do evento criado no Google Agenda
  resumo_producao            TEXT,                  -- texto gerado para a cozinha
  lembrete_cliente_enviado   BOOLEAN DEFAULT FALSE,
  lembrete_interno_enviado   BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_phone            ON pedidos(phone);
CREATE INDEX IF NOT EXISTS idx_pedidos_status           ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_agendamento ON pedidos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_pedidos_conversa_id      ON pedidos(conversa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_lembretes        ON pedidos(data_agendamento, lembrete_cliente_enviado, lembrete_interno_enviado);

DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON pedidos;
CREATE TRIGGER trigger_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TABELA: configuracoes
-- Preços e regras do negócio. Editável sem mexer no código.
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  chave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL,
  descricao TEXT
);

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('preco_coxinha',          '80.00',  'Preço por cento de coxinha'),
  ('preco_bolinha_queijo',   '80.00',  'Preço por cento de bolinha de queijo'),
  ('preco_croquete',         '80.00',  'Preço por cento de croquete'),
  ('preco_presunto_queijo',  '90.00',  'Preço por cento de presunto e queijo'),
  ('minimo_unidades',        '25',     'Quantidade mínima por pedido'),
  ('horario_abertura',       '10',     'Hora de abertura (0-23)'),
  ('horario_fechamento',     '23',     'Hora de fechamento (0-23)'),
  ('antecedencia_horas',     '24',     'Horas mínimas de antecedência para pedido'),
  ('dono_whatsapp',          '5519XXXXXXXXX', 'Número do dono para handoff'),
  ('nome_salgaderia',        'Salgaderia da Família', 'Nome exibido nas mensagens')
ON CONFLICT (chave) DO NOTHING;
