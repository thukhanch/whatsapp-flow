import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  conversa_id: number;

  @Column()
  item_escolhido: string;

  @Column()
  quantidade: number;

  @Column({ type: 'date' })
  data_agendamento: string;

  @Column({ type: 'time' })
  horario_agendamento: string;

  @Column()
  tipo_entrega: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_final: number;

  @Column({ default: 'confirmado' })
  status: string;

  @Column({ nullable: true })
  google_event_id: string;

  @Column({ nullable: true, type: 'text' })
  resumo_producao: string;

  @Column({ default: false })
  lembrete_cliente_enviado: boolean;

  @Column({ default: false })
  lembrete_interno_enviado: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
