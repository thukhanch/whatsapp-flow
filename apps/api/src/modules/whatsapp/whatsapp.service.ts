import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import { WhatsappSession, SessionStatus } from './entities/whatsapp-session.entity';

@Injectable()
export class WhatsappService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sockets = new Map<string, WASocket>();
  private eventEmitters = new Map<string, ((event: string, data: any) => void)[]>();

  constructor(
    @InjectRepository(WhatsappSession)
    private sessionRepo: Repository<WhatsappSession>,
  ) {}

  async getSessions() {
    return this.sessionRepo.find();
  }

  async getSession(id: string) {
    return this.sessionRepo.findOneBy({ id });
  }

  async createSession(name: string) {
    const existing = await this.sessionRepo.findOneBy({ name });
    if (existing) return existing;

    const session = this.sessionRepo.create({ name, status: SessionStatus.DISCONNECTED });
    return this.sessionRepo.save(session);
  }

  async connectSession(sessionId: string, onEvent: (event: string, data: any) => void) {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const authDir = path.join(process.cwd(), '.sessions', sessionId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    await this.sessionRepo.update(sessionId, { status: SessionStatus.CONNECTING });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['WhatsApp Flow', 'Chrome', '120.0'],
    });

    this.sockets.set(sessionId, sock);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await this.sessionRepo.update(sessionId, {
          status: SessionStatus.QR_WAITING,
          qrCode: qrDataUrl,
        });
        onEvent('qr', { sessionId, qr: qrDataUrl });
      }

      if (connection === 'open') {
        await this.sessionRepo.update(sessionId, {
          status: SessionStatus.CONNECTED,
          qrCode: null,
        });
        onEvent('connected', { sessionId });
        this.logger.log(`Session ${sessionId} connected`);
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        await this.sessionRepo.update(sessionId, { status: SessionStatus.DISCONNECTED });
        onEvent('disconnected', { sessionId });

        if (shouldReconnect) {
          setTimeout(() => this.connectSession(sessionId, onEvent), 3000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.key.fromMe) {
          onEvent('message', { sessionId, message: msg });
        }
      }
    });

    return session;
  }

  async sendMessage(sessionId: string, to: string, text: string) {
    const sock = this.sockets.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return { success: true };
  }

  async disconnectSession(sessionId: string) {
    const sock = this.sockets.get(sessionId);
    if (sock) {
      await sock.logout();
      this.sockets.delete(sessionId);
    }
    await this.sessionRepo.update(sessionId, { status: SessionStatus.DISCONNECTED });
  }

  async deleteSession(sessionId: string) {
    await this.disconnectSession(sessionId);
    const authDir = path.join(process.cwd(), '.sessions', sessionId);
    fs.rmSync(authDir, { recursive: true, force: true });
    await this.sessionRepo.delete(sessionId);
  }

  onModuleDestroy() {
    for (const [id, sock] of this.sockets) {
      sock.end(undefined);
    }
  }
}
