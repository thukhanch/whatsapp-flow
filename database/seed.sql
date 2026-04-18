-- ============================================================
-- SEED - Dados de exemplo para teste
-- Execute APÓS o schema.sql
-- ============================================================

-- Cliente de teste
INSERT INTO clientes (phone, name) VALUES
  ('+5519999999999', 'Cliente Teste')
ON CONFLICT (phone) DO NOTHING;

-- Atualiza preços se quiser personalizar (edite aqui)
UPDATE configuracoes SET valor = '80.00' WHERE chave = 'preco_coxinha';
UPDATE configuracoes SET valor = '80.00' WHERE chave = 'preco_bolinha_queijo';
UPDATE configuracoes SET valor = '80.00' WHERE chave = 'preco_croquete';
UPDATE configuracoes SET valor = '90.00' WHERE chave = 'preco_presunto_queijo';
UPDATE configuracoes SET valor = 'Salgaderia da Família' WHERE chave = 'nome_salgaderia';
