import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalgaderiaController } from './salgaderia.controller';
import { SalgaderiaService } from './salgaderia.service';
import { EvolutionApiService } from './evolution-api.service';
import { GoogleCalendarService } from './google-calendar.service';
import { Cliente } from './entities/cliente.entity';
import { Conversa } from './entities/conversa.entity';
import { Pedido } from './entities/pedido.entity';
import { Configuracao } from './entities/configuracao.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente, Conversa, Pedido, Configuracao]),
  ],
  controllers: [SalgaderiaController],
  providers: [SalgaderiaService, EvolutionApiService, GoogleCalendarService],
  exports: [SalgaderiaService, EvolutionApiService],
})
export class SalgaderiaModule {}
