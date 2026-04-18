import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type EtapaConversa =
  | 'inicio'
  | 'aguardando_item'
  | 'aguardando_quantidade'
  | 'aguardando_data'
  | 'aguardando_horario'
  | 'aguardando_tipo_entrega'
  | 'aguardando_endereco'
  | 'aguardando_confirmacao'
  | 'finalizado';

@Entity('conversas')
export class Conversa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column({ default: 'inicio' })
  etapa_atual: EtapaConversa;

  @Column({ type: 'jsonb', default: '{}' })
  dados_parciais: Record<string, any>;

  @Column({ default: false })
  pedido_em_aberto: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
