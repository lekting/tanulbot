import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from './User';

/**
 * Invoice entity for storing payment information
 */
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ name: 'payment_id', type: 'varchar', length: 255, nullable: true })
  paymentId: string | null;

  @Column({
    name: 'subscription_plan',
    type: 'enum',
    enum: ['free', 'basic', 'premium']
  })
  subscriptionPlan: 'free' | 'basic' | 'premium';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'refunded']
  })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  paymentMethod: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: object | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.invoices)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
