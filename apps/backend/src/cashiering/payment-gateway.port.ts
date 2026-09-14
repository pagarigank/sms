/**
 * PaymentGatewayPort — abstract interface for payment gateway adapters.
 * Phase 7.2: Xendit adapter stub; swap in PayMongo/HitPay/DragonPay later.
 */
export interface PaymentGatewayPort {
  /** Create a payment intent/link */
  createPayment(data: {
    amount: number;
    currency: string;
    reference: string;
    description: string;
    redirectUrl?: string;
    metadata?: Record<string, string>;
  }): Promise<GatewayPaymentResult>;

  /** Verify a payment by external reference */
  verifyPayment(externalRef: string): Promise<GatewayPaymentStatus>;

  /** Process a refund */
  createRefund(data: {
    paymentRef: string;
    amount: number;
    reason: string;
  }): Promise<GatewayRefundResult>;

  /** Verify webhook signature */
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

export interface GatewayPaymentResult {
  externalRef: string;
  status: 'pending' | 'completed' | 'failed';
  redirectUrl?: string;
  paymentMethod?: string;
}

export interface GatewayPaymentStatus {
  externalRef: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  amount: number;
  paidAt?: Date;
}

export interface GatewayRefundResult {
  refundRef: string;
  status: 'pending' | 'completed' | 'failed';
}
