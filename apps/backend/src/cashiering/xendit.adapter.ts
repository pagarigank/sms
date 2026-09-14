import { Injectable } from '@nestjs/common';
import {
  PaymentGatewayPort,
  GatewayPaymentResult,
  GatewayPaymentStatus,
  GatewayRefundResult,
} from './payment-gateway.port';

/**
 * Xendit adapter — Phase 7.2 stub.
 * In production, this would use the Xendit Node SDK.
 */
@Injectable()
export class XenditAdapter implements PaymentGatewayPort {
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.XENDIT_API_KEY || '';
    this.webhookSecret = process.env.XENDIT_WEBHOOK_SECRET || '';
  }

  async createPayment(data: {
    amount: number;
    currency: string;
    reference: string;
    description: string;
    redirectUrl?: string;
    metadata?: Record<string, string>;
  }): Promise<GatewayPaymentResult> {
    // TODO: Replace with actual Xendit API call
    // const xendit = new Xendit({ secretKey: this.apiKey });
    // const { Invoice } = xendit;
    // const invoice = await Invoice.createInvoice({ ... });

    console.log('[Xendit stub] createPayment:', data.reference, data.amount);

    return {
      externalRef: `xendit_${data.reference}`,
      status: 'pending',
      redirectUrl: data.redirectUrl || '',
    };
  }

  async verifyPayment(externalRef: string): Promise<GatewayPaymentStatus> {
    // TODO: Replace with actual Xendit API call
    console.log('[Xendit stub] verifyPayment:', externalRef);

    return {
      externalRef,
      status: 'completed',
      amount: 0,
      paidAt: new Date(),
    };
  }

  async createRefund(data: {
    paymentRef: string;
    amount: number;
    reason: string;
  }): Promise<GatewayRefundResult> {
    // TODO: Replace with actual Xendit API call
    console.log('[Xendit stub] refund:', data.paymentRef, data.amount);

    return {
      refundRef: `xendit_refund_${data.paymentRef}`,
      status: 'pending',
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // TODO: Replace with actual HMAC-SHA256 verification
    // const hmac = crypto.createHmac('sha256', this.webhookSecret);
    // hmac.update(payload);
    // return hmac.digest('hex') === signature;
    console.log('[Xendit stub] verifyWebhookSignature');
    return true;
  }
}
