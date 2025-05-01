import { AppDataSource } from '../../config/database';
import { Invoice } from '../../entity/Invoice';
import { User } from '../../entity/User';
import { MoreThan } from 'typeorm';

/**
 * Repository for Invoice entity operations
 */
export class InvoiceRepository {
  private repository = AppDataSource.getRepository(Invoice);

  /**
   * Create a new invoice
   */
  async create(invoiceData: {
    user: User;
    subscriptionPlan: 'free' | 'basic' | 'premium';
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentId?: string;
    expiresAt?: Date;
    paymentMethod?: string;
    metadata?: object;
  }): Promise<Invoice> {
    const invoice = this.repository.create({
      telegramId: invoiceData.user.telegramId,
      user: invoiceData.user,
      subscriptionPlan: invoiceData.subscriptionPlan,
      amount: invoiceData.amount,
      status: invoiceData.status,
      paymentId: invoiceData.paymentId || null,
      expiresAt: invoiceData.expiresAt || null,
      paymentMethod: invoiceData.paymentMethod || null,
      metadata: invoiceData.metadata || null
    });

    return this.repository.save(invoice);
  }

  /**
   * Get all invoices for a user
   */
  async getUserInvoices(telegramId: number): Promise<Invoice[]> {
    return this.repository.find({
      where: { telegramId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get invoices by telegramId
   */
  async getInvoicesByTelegramId(telegramId: number): Promise<Invoice[]> {
    return this.getUserInvoices(telegramId);
  }

  /**
   * Get active subscription for a user
   */
  async getActiveSubscription(telegramId: number): Promise<Invoice | null> {
    return this.repository.findOne({
      where: {
        telegramId,
        status: 'completed',
        expiresAt: MoreThan(new Date())
      },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    invoiceId: number,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<Invoice | null> {
    const invoice = await this.repository.findOne({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return null;
    }

    invoice.status = status;
    return this.repository.save(invoice);
  }
}
