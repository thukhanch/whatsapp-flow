import {
  Controller, Post, Get, Put, Body, Param, Headers, HttpCode, Logger
} from '@nestjs/common';
import { SalgaderiaService } from './salgaderia.service';
import { EvolutionApiService } from './evolution-api.service';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('salgaderia')
export class SalgaderiaController {
  private readonly logger = new Logger(SalgaderiaController.name);

  constructor(
    private readonly salgaderiaService: SalgaderiaService,
    private readonly evolutionApi: EvolutionApiService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  // ─── Webhook da Evolution API ─────────────────────────────────────
  // Este é o endpoint que a Evolution API chama quando chega mensagem
  @Post('webhook')
  @HttpCode(200)
  async receberMensagem(@Body() payload: any, @Headers() headers: any) {
    try {
      // Extrai dados da mensagem
      const extracted = this.evolutionApi.extractMessage(payload);

      if (!extracted) {
        this.logger.debug('Mensagem ignorada (não é texto ou payload inválido)');
        return { ok: true };
      }

      const { phone, text } = extracted;
      this.logger.log(`📱 Mensagem de ${phone}: "${text}"`);

      // Processa na máquina de estados
      const { resposta, handoff, pedidoConfirmado } = await this.salgaderiaService.processarMensagem(phone, text);

      // Envia resposta via Evolution API
      await this.evolutionApi.sendText(phone, resposta);

      // Se pedido confirmado: cria evento no Google Agenda
      if (pedidoConfirmado) {
        const eventId = await this.googleCalendar.criarEvento(pedidoConfirmado);
        if (eventId) {
          // Salva o ID do evento no pedido
          await this.salgaderiaService['pedidoRepo'].update(pedidoConfirmado.id, {
            google_event_id: eventId,
          });
        }

        // Envia resumo de produção para o dono
        const donoWhatsapp = await this.salgaderiaService.getConfig('dono_whatsapp');
        if (donoWhatsapp) {
          const resumo = this.salgaderiaService.gerarResumoProd(pedidoConfirmado);
          await this.evolutionApi.sendText('+' + donoWhatsapp, `🔔 *NOVO PEDIDO CONFIRMADO!*\n\n${resumo}`);
        }
      }

      // Handoff: avisa o dono
      if (handoff) {
        const donoWhatsapp = await this.salgaderiaService.getConfig('dono_whatsapp');
        if (donoWhatsapp) {
          await this.evolutionApi.sendText(
            '+' + donoWhatsapp,
            `🚨 *HANDOFF NECESSÁRIO!*\n\nCliente ${phone} precisa de atendimento humano.\n\nÚltima mensagem: "${text}"`
          );
        }
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(`Erro no webhook: ${error.message}`, error.stack);
      return { ok: false, error: error.message };
    }
  }

  // ─── API REST para o dashboard ────────────────────────────────────
  @Get('pedidos')
  listarPedidos() {
    return this.salgaderiaService.listarPedidos();
  }

  @Get('pedidos/:status')
  listarPedidosPorStatus(@Param('status') status: string) {
    return this.salgaderiaService.listarPedidos(status);
  }

  @Get('clientes')
  listarClientes() {
    return this.salgaderiaService.listarClientes();
  }

  @Get('configuracoes')
  getConfigs() {
    return this.salgaderiaService.getConfigs();
  }

  @Put('configuracoes/:chave')
  updateConfig(@Param('chave') chave: string, @Body() body: { valor: string }) {
    return this.salgaderiaService.updateConfig(chave, body.valor);
  }

  // ─── Lembretes (chamado via cron ou manualmente) ──────────────────
  @Post('lembretes/executar')
  async executarLembretes() {
    const pedidos = await this.salgaderiaService.buscarPedidosParaLembrete();
    const resultados = [];

    for (const pedido of pedidos) {
      try {
        const msg =
          `⏰ *Lembrete do seu pedido!*\n\n` +
          `🥟 ${pedido.item_escolhido} - ${pedido.quantidade} unidades\n` +
          `📅 Amanhã às ${pedido.horario_agendamento}\n` +
          `${pedido.tipo_entrega === 'entrega' ? `🚗 Entrega em: ${pedido.endereco}` : '🏪 Retirada no local'}\n\n` +
          `Qualquer dúvida, é só chamar! 😊`;

        await this.evolutionApi.sendText(pedido.phone, msg);
        await this.salgaderiaService.marcarLembreteClienteEnviado(pedido.id);
        resultados.push({ pedidoId: pedido.id, ok: true });
      } catch (e) {
        resultados.push({ pedidoId: pedido.id, ok: false, erro: e.message });
      }
    }

    return { enviados: resultados.length, resultados };
  }

  // ─── Teste: simula mensagem sem precisar do WhatsApp ─────────────
  @Post('simular')
  async simularMensagem(@Body() body: { phone: string; text: string }) {
    const { resposta, handoff, pedidoConfirmado } = await this.salgaderiaService.processarMensagem(
      body.phone,
      body.text,
    );
    return { resposta, handoff, pedidoConfirmado: pedidoConfirmado?.id };
  }
}
