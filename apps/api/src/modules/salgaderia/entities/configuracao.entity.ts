import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('configuracoes')
export class Configuracao {
  @PrimaryColumn()
  chave: string;

  @Column()
  valor: string;

  @Column({ nullable: true })
  descricao: string;
}
