import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Cliente } from './entities/cliente.entity';
import { Conversa, EtapaConversa } from './entities/conversa.entity';
import { Pedido } from './entities/pedido.entity';
import { Configuracao } from './entities/configuracao.entity';

// Cardápio fixo do MVP
const CARDAPIO: Record<string, string> = {
  '1': 'Coxinha',
  '2': 'Bolinha de Queijo',
  '3': 'Croquete',
  '4': 'Presunto e Queijo',
};

// Preço-chave por item no banco
const PRECO_CHAVE: Record<string, string> = {
  'Coxinha':           'preco_coxinha',
  'Bolinha de Queijo': 'preco_bolinha_queijo',
  'Croquete':          'preco_croquete',
  'Presunto e Queijo': 'preco_presunto_queijo',
};

@Injectable()
export class SalgaderiaService {
  private readonly logger = new Logger(SalgaderiaService.name);
  private config: Record<string, string> = {};

  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
    @InjectRepository(Conversa)
    private conversaRepo: Repository<Conversa>,
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Configuracao)
    private configRepo: Repository<Configuracao>,
  ) {}

  // ─── Configurações ───────────────────────────────────────────────
  async loadConfig() {
    const rows = await this.configRepo.find();
    for (const row of rows) {
      this.config[row.chave] = row.valor;
    }
    return this.config;
  }

  async getConfig(chave: string, fallback = '') {
    if (!this.config[chave]) await this.loadConfig();
    return this.config[chave] || fallback;
  }

  // ─── Cliente ─────────────────────────────────────────────────────
  async findOrCreateCliente(phone: string): Promise<Cliente> {
    let cliente = await this.clienteRepo.findOneBy({ phone });
    if (!cliente) {
      cliente = this.clienteRepo.create({ phone });
      await this.clienteRepo.save(cliente);
    }
    return cliente;
  }

  // ─── Conversa ─────────────────────────────────────────────────────
  async findOrCreateConversa(phone: string): Promise<Conversa> {
    let conversa = await this.conversaRepo.findOne({
      where: { phone, pedido_em_aberto: true },
      order: { created_at: 'DESC' },
    });

    if (!conversa) {
      conversa = this.conversaRepo.create({
        phone,
        etapa_atual: 'inicio',
        dados_parciais: {},
        pedido_em_aberto: true,
      });
      await this.conversaRepo.save(conversa);
    }

    return conversa;
  }

  async updateConversa(id: number, updates: Partial<Conversa>) {
    await this.conversaRepo.update(id, updates);
  }

  // ─── Cálculo de valor ────────────────────────────────────────────
  async calcularValor(item: string, quantidade: number): Promise<number> {
    const chave = PRECO_CHAVE[item];
    const precoCento = parseFloat(await this.getConfig(chave, '80.00'));
    return parseFloat(((quantidade / 100) * precoCento).toFixed(2));
  }

  // ─── Validações ───────────────────────────────────────────────────
  validarItem(texto: string): { valido: boolean; item?: string } {
    const normalized = texto.trim();
    if (CARDAPIO[normalized]) {
      return { valido: true, item: CARDAPIO[normalized] };
    }
    // Aceita nome por extenso também
    const porNome = Object.values(CARDAPIO).find(
      (v) => v.toLowerCase() === normalized.toLowerCase(),
    );
    if (porNome) return { valido: true, item: porNome };
    return { valido: false };
  }

  validarQuantidade(texto: string): { valido: boolean; quantidade?: number; erro?: string } {
    const n = parseInt(texto.trim());
    if (isNaN(n) || n <= 0) return { valido: false, erro: 'número inválido' };
    if (n < 25) return { valido: false, erro: `mínimo é 25 unidades` };
    if (n % 25 !== 0) return { valido: false, erro: `precisa ser múltiplo de 25 (ex: 25, 50, 75, 100...)` };
    return { valido: true, quantidade: n };
  }

  validarData(texto: string): { valido: boolean; dataFormatada?: string; dataExibicao?: string; erro?: string } {
    const raw = texto.trim();
    const parts = raw.includes('/') ? raw.split('/') : raw.split('-');
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();

    if (isNaN(d) || isNaN(m) || isNaN(y)) return { valido: false, erro: 'formato inválido' };

    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d || date.getMonth() !== m - 1) {
      return { valido: false, erro: 'data não existe' };
    }

    // Verifica antecedência mínima
    const agora = new Date();
    const antecedenciaHoras = parseInt(this.config['antecedencia_horas'] || '24');
    const diffHoras = (date.getTime() - agora.getTime()) / 3600000;
    if (diffHoras < antecedenciaHoras) {
      return { valido: false, erro: `pedido precisa ter no mínimo ${antecedenciaHoras}h de antecedência` };
    }

    const dataFormatada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dataExibicao = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    return { valido: true, dataFormatada, dataExibicao };
  }

  validarHorario(texto: string): { valido: boolean; horario?: string; erro?: string } {
    const raw = texto.trim();
    if (!/^([0-1]\d|2[0-3]):[0-5]\d$/.test(raw)) {
      return { valido: false, erro: 'formato inválido (use HH:MM, ex: 14:30)' };
    }
    const hora = parseInt(raw.split(':')[0]);
    const abertura = parseInt(this.config['horario_abertura'] || '10');
    const fechamento = parseInt(this.config['horario_fechamento'] || '23');
    if (hora < abertura || hora >= fechamento) {
      return { valido: false, erro: `horário fora do funcionamento (${abertura}h às ${fechamento}h)` };
    }
    return { valido: true, horario: raw };
  }

  validarTipoEntrega(texto: string): { valido: boolean; tipo?: 'retirada' | 'entrega'; erro?: string } {
    const raw = texto.trim().toLowerCase();
    if (['1', 'retirada', 'retirar', 'buscar'].includes(raw)) return { valido: true, tipo: 'retirada' };
    if (['2', 'entrega', 'entregar', 'delivery'].includes(raw)) return { valido: true, tipo: 'entrega' };
    return { valido: false, erro: 'responda 1 (Retirada) ou 2 (Entrega)' };
  }

  // ─── Mensagens padronizadas ───────────────────────────────────────
  async mensagemMenu(nome?: string): Promise<string> {
    const salgaderia = await this.getConfig('nome_salgaderia', 'Salgaderia');
    const cumprimento = nome ? `Olá, ${nome}! 😊` : 'Olá! 😊';
    return `${cumprimento} Bem-vindo(a) à *${salgaderia}*!\n\n` +
      `Nosso cardápio de salgados fritos:\n\n` +
      `1️⃣ Coxinha\n` +
      `2️⃣ Bolinha de Queijo\n` +
      `3️⃣ Croquete\n` +
      `4️⃣ Presunto e Queijo\n\n` +
      `Digite o *número* do salgado que deseja pedir 👆`;
  }

  async mensagemResumo(dados: any): Promise<string> {
    const valor = await this.calcularValor(dados.item_escolhido, dados.quantidade);
    const entregaInfo = dados.tipo_entrega === 'entrega'
      ? `🚗 *Entrega* em: ${dados.endereco}`
      : `🏪 *Retirada* no local`;

    return `📋 *RESUMO DO SEU PEDIDO*\n\n` +
      `🥟 Produto: *${dados.item_escolhido}*\n` +
      `📦 Quantidade: *${dados.quantidade} unidades*\n` +
      `📅 Data: *${dados.data_exibicao || dados.data_agendamento}*\n` +
      `🕐 Horário: *${dados.horario_agendamento}*\n` +
      `${entregaInfo}\n` +
      `💰 Valor total: *R$ ${valor.toFixed(2)}*\n\n` +
      `Está tudo certo?\n` +
      `Responda *SIM* para confirmar ou *NÃO* para alterar ✅`;
  }

  gerarResumoProd(pedido: Pedido): string {
    return `🧾 PEDIDO #${pedido.id}\n` +
      `📱 ${pedido.phone}\n` +
      `🥟 ${pedido.item_escolhido} - ${pedido.quantidade} unidades\n` +
      `📅 ${pedido.data_agendamento} às ${pedido.horario_agendamento}\n` +
      `🚚 ${pedido.tipo_entrega === 'entrega' ? `Entrega: ${pedido.endereco}` : 'Retirada'}\n` +
      `💰 R$ ${Number(pedido.valor_final).toFixed(2)}\n` +
      `✅ Status: ${pedido.status}`;
  }

  // ─── Máquina de estados ───────────────────────────────────────────
  async processarMensagem(phone: string, texto: string): Promise<{
    resposta: string;
    handoff?: boolean;
    pedidoConfirmado?: Pedido;
  }> {
    await this.loadConfig();

    // Normaliza phone: remove tudo exceto dígitos e adiciona +
    const phoneNorm = '+' + phone.replace(/\D/g, '');

    const cliente = await this.findOrCreateCliente(phoneNorm);
    const conversa = await this.findOrCreateConversa(phoneNorm);
    const dados = conversa.dados_parciais || {};

    this.logger.log(`[${phoneNorm}] Etapa: ${conversa.etapa_atual} | Msg: "${texto}"`);

    // Detecta handoff em qualquer etapa
    const textoLower = texto.trim().toLowerCase();
    const handoffTriggers = ['falar com humano', 'falar com atendente', 'cancelar pedido', 'quero cancelar'];
    if (handoffTriggers.some(t => textoLower.includes(t))) {
      await this.updateConversa(conversa.id, {
        etapa_atual: 'finalizado',
        pedido_em_aberto: false,
      });
      return { resposta: 'Vou te transferir para nossa equipe agora mesmo! ⏩', handoff: true };
    }

    switch (conversa.etapa_atual) {
      // ─── INICIO ────────────────────────────────────────────────
      case 'inicio': {
        await this.updateConversa(conversa.id, { etapa_atual: 'aguardando_item' });
        const menu = await this.mensagemMenu(cliente.name);
        return { resposta: menu };
      }

      // ─── AGUARDANDO ITEM ───────────────────────────────────────
      case 'aguardando_item': {
        const { valido, item } = this.validarItem(texto);
        if (!valido) {
          return {
            resposta: `Opção não encontrada 🤔\n\nDigite o *número* do salgado:\n\n1️⃣ Coxinha\n2️⃣ Bolinha de Queijo\n3️⃣ Croquete\n4️⃣ Presunto e Queijo`,
          };
        }
        dados.item_escolhido = item;
        const minimo = await this.getConfig('minimo_unidades', '25');
        await this.updateConversa(conversa.id, {
          etapa_atual: 'aguardando_quantidade',
          dados_parciais: dados,
        });
        return {
          resposta: `Ótima escolha! *${item}* 🥟\n\nQuantas unidades você quer?\n(Mínimo: ${minimo} | Múltiplos de 25: 25, 50, 75, 100...)`,
        };
      }

      // ─── AGUARDANDO QUANTIDADE ─────────────────────────────────
      case 'aguardando_quantidade': {
        const { valido, quantidade, erro } = this.validarQuantidade(texto);
        if (!valido) {
          return { resposta: `Quantidade inválida: ${erro} 🔢\n\nDigite um número válido (ex: 25, 50, 100):` };
        }
        dados.quantidade = quantidade;
        await this.updateConversa(conversa.id, {
          etapa_atual: 'aguardando_data',
          dados_parciais: dados,
        });
        const valor = await this.calcularValor(dados.item_escolhido, quantidade);
        const antecedencia = await this.getConfig('antecedencia_horas', '24');
        return {
          resposta: `Perfeito! *${quantidade} ${dados.item_escolhido}* → R$ ${valor.toFixed(2)} 💰\n\nPara qual data é o pedido?\n(Mínimo ${antecedencia}h de antecedência)\n\nFormato: DD/MM ou DD/MM/AAAA`,
        };
      }

      // ─── AGUARDANDO DATA ───────────────────────────────────────
      case 'aguardando_data': {
        const { valido, dataFormatada, dataExibicao, erro } = this.validarData(texto);
        if (!valido) {
          return { resposta: `Data inválida: ${erro} 📅\n\nUse o formato DD/MM ou DD/MM/AAAA\n(Ex: 25/04 ou 25/04/2026)` };
        }
        dados.data_agendamento = dataFormatada;
        dados.data_exibicao = dataExibicao;
        await this.updateConversa(conversa.id, {
          etapa_atual: 'aguardando_horario',
          dados_parciais: dados,
        });
        const abertura = await this.getConfig('horario_abertura', '10');
        const fechamento = await this.getConfig('horario_fechamento', '23');
        return {
          resposta: `Data confirmada: *${dataExibicao}* 📅\n\nQual horário para receber/retirar?\n(${abertura}h às ${fechamento}h)\n\nFormato: HH:MM (ex: 14:30)`,
        };
      }

      // ─── AGUARDANDO HORARIO ────────────────────────────────────
      case 'aguardando_horario': {
        const { valido, horario, erro } = this.validarHorario(texto);
        if (!valido) {
          return { resposta: `Horário inválido: ${erro} 🕐\n\nTente novamente (ex: 14:30, 18:00):` };
        }
        dados.horario_agendamento = horario;
        await this.updateConversa(conversa.id, {
          etapa_atual: 'aguardando_tipo_entrega',
          dados_parciais: dados,
        });
        return {
          resposta: `Horário: *${horario}* ✅\n\nÉ retirada ou entrega?\n\n1️⃣ Retirada (você busca aqui)\n2️⃣ Entrega (levamos até você)`,
        };
      }

      // ─── AGUARDANDO TIPO ENTREGA ───────────────────────────────
      case 'aguardando_tipo_entrega': {
        const { valido, tipo, erro } = this.validarTipoEntrega(texto);
        if (!valido) {
          return { resposta: `Não entendi 🤔\n\nDigite:\n*1* para Retirada\n*2* para Entrega` };
        }
        dados.tipo_entrega = tipo;
        if (tipo === 'retirada') {
          await this.updateConversa(conversa.id, {
            etapa_atual: 'aguardando_confirmacao',
            dados_parciais: dados,
          });
          const resumo = await this.mensagemResumo(dados);
          return { resposta: `🏪 Você vai retirar no local!\n\n${resumo}` };
        } else {
          await this.updateConversa(conversa.id, {
            etapa_atual: 'aguardando_endereco',
            dados_parciais: dados,
          });
          return {
            resposta: `🚗 Ótimo! Vamos entregar!\n\nDigite o *endereço completo*:\n(Rua, número, complemento, bairro, cidade)`,
          };
        }
      }

      // ─── AGUARDANDO ENDERECO ───────────────────────────────────
      case 'aguardando_endereco': {
        if (texto.trim().length < 10) {
          return { resposta: `Endereço muito curto 📍\n\nPreciso do endereço completo:\nEx: Rua das Flores, 123, Apto 4, Jardim Primavera, Campinas` };
        }
        dados.endereco = texto.trim();
        await this.updateConversa(conversa.id, {
          etapa_atual: 'aguardando_confirmacao',
          dados_parciais: dados,
        });
        const resumo = await this.mensagemResumo(dados);
        return { resposta: resumo };
      }

      // ─── AGUARDANDO CONFIRMACAO ────────────────────────────────
      case 'aguardando_confirmacao': {
        const sim = ['sim', 's', 'yes', 'confirma', 'confirmar', 'ok', '✅'].includes(textoLower);
        const nao = ['não', 'nao', 'n', 'alterar', 'mudar', 'errado', 'errei'].includes(textoLower);

        if (!sim && !nao) {
          const resumo = await this.mensagemResumo(dados);
          return { resposta: `Não entendi 🤔\n\nResponda *SIM* para confirmar ou *NÃO* para alterar.\n\n${resumo}` };
        }

        if (nao) {
          await this.updateConversa(conversa.id, {
            etapa_atual: 'aguardando_item',
            dados_parciais: {},
          });
          const menu = await this.mensagemMenu(cliente.name);
          return { resposta: `Sem problema! Vamos recomeçar 😊\n\n${menu}` };
        }

        // SIM — confirma o pedido!
        const valor = await this.calcularValor(dados.item_escolhido, dados.quantidade);

        const pedido = this.pedidoRepo.create({
          phone: phoneNorm,
          conversa_id: conversa.id,
          item_escolhido: dados.item_escolhido,
          quantidade: dados.quantidade,
          data_agendamento: dados.data_agendamento,
          horario_agendamento: dados.horario_agendamento,
          tipo_entrega: dados.tipo_entrega,
          endereco: dados.endereco || null,
          valor_final: valor,
          status: 'confirmado',
        });

        const pedidoSalvo = await this.pedidoRepo.save(pedido);

        // Gera resumo de produção
        const resumoProd = this.gerarResumoProd(pedidoSalvo);
        await this.pedidoRepo.update(pedidoSalvo.id, { resumo_producao: resumoProd });

        // Fecha a conversa
        await this.updateConversa(conversa.id, {
          etapa_atual: 'finalizado',
          pedido_em_aberto: false,
        });

        const resposta = `✅ *Pedido confirmado!*\n\n` +
          `Número do pedido: *#${pedidoSalvo.id}*\n\n` +
          `${dados.item_escolhido} — ${dados.quantidade} unidades\n` +
          `📅 ${dados.data_exibicao} às ${dados.horario_agendamento}\n` +
          `💰 R$ ${valor.toFixed(2)}\n\n` +
          `Você receberá a confirmação assim que prepararmos tudo. Obrigada! 😊🥟`;

        return { resposta, pedidoConfirmado: { ...pedidoSalvo, resumo_producao: resumoProd } };
      }

      // ─── FINALIZADO ────────────────────────────────────────────
      case 'finalizado': {
        // Novo pedido - reabre conversa
        await this.updateConversa(conversa.id, {
          etapa_atual: 'inicio',
          dados_parciais: {},
          pedido_em_aberto: true,
        });
        const menu = await this.mensagemMenu(cliente.name);
        return { resposta: `Olá de novo! 😊 Para fazer um novo pedido:\n\n${menu}` };
      }

      default:
        return { resposta: `Olá! Como posso ajudar? Digite *oi* para começar.` };
    }
  }

  // ─── Lembretes ────────────────────────────────────────────────────
  async buscarPedidosParaLembrete(): Promise<Pedido[]> {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];

    return this.pedidoRepo.find({
      where: {
        data_agendamento: dataAmanha,
        lembrete_cliente_enviado: false,
        status: 'confirmado',
      },
    });
  }

  async marcarLembreteClienteEnviado(pedidoId: number) {
    await this.pedidoRepo.update(pedidoId, { lembrete_cliente_enviado: true });
  }

  async marcarLembreteInternoEnviado(pedidoId: number) {
    await this.pedidoRepo.update(pedidoId, { lembrete_interno_enviado: true });
  }

  // ─── CRUD ─────────────────────────────────────────────────────────
  async listarPedidos(status?: string) {
    const where = status ? { status } : {};
    return this.pedidoRepo.find({ where, order: { created_at: 'DESC' } });
  }

  async listarClientes() {
    return this.clienteRepo.find({ order: { created_at: 'DESC' } });
  }

  async getConfigs() {
    return this.configRepo.find();
  }

  async updateConfig(chave: string, valor: string) {
    await this.configRepo.update(chave, { valor });
    this.config[chave] = valor; // atualiza cache
    return { chave, valor };
  }
}
