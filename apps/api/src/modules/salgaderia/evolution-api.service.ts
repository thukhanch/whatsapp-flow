import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);

  private get baseUrl() { return process.env.EVOLUTION_API_URL || ''; }
  private get apiKey() { return process.env.EVOLUTION_API_KEY || ''; }
  private get instance() { return process.env.EVOLUTION_INSTANCE || ''; }

  async sendText(to: string, message: string): Promise<void> {
    if (!this.baseUrl) {
      this.logger.warn(`[EVOLUTION] URL não configurada. Mensagem para ${to}: ${message}`);
      return;
    }

    try {
      // Remove o + do número para a Evolution API
      const number = to.replace('+', '');

      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          number,
          options: { delay: 1200 },
          textMessage: { text: message },
        },
        {
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`[EVOLUTION] Mensagem enviada para ${to}`);
    } catch (error) {
      this.logger.error(`[EVOLUTION] Erro ao enviar para ${to}: ${error.message}`);
      throw error;
    }
  }

  // Extrai dados da mensagem recebida pela Evolution API
  extractMessage(payload: any): { phone: string; text: string; type: string } | null {
    try {
      // Formato da Evolution API v2
      const data = payload?.data || payload;
      const message = data?.message || data?.messages?.[0];

      if (!message) return null;

      const type = message?.messageType || 'text';

      // Ignora mensagens que não são texto
      if (!['conversation', 'extendedTextMessage', 'text'].includes(type)) {
        return null;
      }

      const phone = data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || data?.from || '';
      const text =
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.text ||
        '';

      if (!phone || !text) return null;

      return { phone, text, type };
    } catch (e) {
      this.logger.error(`Erro ao extrair mensagem: ${e.message}`);
      return null;
    }
  }
}
