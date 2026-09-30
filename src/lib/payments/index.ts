export interface PaymentProvider {
  createIntent(amount: number, currency: string, metadata: Record<string, unknown>): Promise<{ clientSecret: string }>;
  confirmPayment(intentId: string): Promise<{ status: string }>;
}

/** Stub for future payment integration (Stripe, etc.) */
export class PaymentService implements PaymentProvider {
  async createIntent(
    amount: number,
    currency: string,
    metadata: Record<string, unknown>
  ): Promise<{ clientSecret: string }> {
    void amount;
    void currency;
    void metadata;
    throw new Error("Payment integration not configured");
  }

  async confirmPayment(intentId: string): Promise<{ status: string }> {
    void intentId;
    throw new Error("Payment integration not configured");
  }
}

export const paymentService = new PaymentService();
