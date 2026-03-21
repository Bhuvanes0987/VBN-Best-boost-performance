// src/app/payments/payments.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { PaymentService } from '../../services/payment.service';
import { environment } from '../../../../Environment/Environment';

declare var Razorpay: any;

export type PaymentMethodType = 'upi' | 'wallet' | 'debit' | 'credit';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.scss'],
  providers: [PaymentService],
})
export class Payments implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────
  activeMethod: PaymentMethodType = 'upi';
  isProcessing = false;
  showSuccess  = false;
  showError    = false;
  errorMessage = '';
  successPaymentId = '';
  cardFlipped  = false;

  // ── Order config ──────────────────────────────────
  readonly AMOUNT      = 10200;    // ₹102 in paise
  readonly AMOUNT_DISPLAY = '₹399.00'; // Display price (can differ from actual amount for discounts, etc.)
  readonly DESCRIPTION = 'Premium Plan · 1 month';

  private razorpayScript: HTMLScriptElement | null = null;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadRazorpayScript();
  }

  ngOnDestroy(): void {
    if (this.razorpayScript) {
      document.head.removeChild(this.razorpayScript);
    }
  }

  // ── Script loader ─────────────────────────────────
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay !== 'undefined') { resolve(); return; }
      this.razorpayScript = document.createElement('script');
      this.razorpayScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
      this.razorpayScript.onload = () => resolve();
      this.razorpayScript.onerror = () => reject();
      document.head.appendChild(this.razorpayScript);
    });
  }

  // ── Method selection ──────────────────────────────
  selectMethod(m: PaymentMethodType): void {
    if (this.isProcessing) return;
    this.activeMethod = m;
    this.cardFlipped  = false;
    this.clearAlerts();
  }

  flipCard(): void {
    if (this.activeMethod === 'debit' || this.activeMethod === 'credit') {
      this.cardFlipped = !this.cardFlipped;
    }
  }

  get isCardMethod(): boolean {
    return this.activeMethod === 'debit' || this.activeMethod === 'credit';
  }

  get cardNumber(): string {
    return this.activeMethod === 'debit'
      ? '4111  1111  1111  1111'
      : '5267  3181  8797  5449';
  }

  get cardBrand(): string {
    return this.activeMethod === 'debit' ? 'VISA' : 'MASTERCARD';
  }

  // ── Payment flow ──────────────────────────────────
  async pay(): Promise<void> {
    this.clearAlerts();
    this.isProcessing = true;

    try {
      await this.loadRazorpayScript();
    } catch {
      this.showErr('Unable to load payment gateway. Check your internet connection.');
      return;
    }

    // Step 1 – create order on backend
    this.paymentService.createOrder({
      amount:          this.AMOUNT,
      description:     this.DESCRIPTION,
      payment_method:  this.activeMethod,
    }).subscribe({
      next: (orderRes) => this.openRazorpay(orderRes),
      error: (err) => {
        this.showErr('Could not create order. Please try again.');
        console.error('Order creation error', err);
      },
    });
  }

  private openRazorpay(orderRes: { order_id: string; amount: number; currency: string }): void {
    const options: any = {
      key:         environment.razorpayKeyId,
      amount:      orderRes.amount,
      currency:    orderRes.currency,
      name:        'PayFlow',
      description: this.DESCRIPTION,
      order_id:    orderRes.order_id,
      prefill:     { name: '', email: '', contact: '' },
      theme:       { color: '#F97316' },
      config:      this.buildDisplayConfig(),
      modal: {
        ondismiss: () => {
          this.isProcessing = false;
        },
      },
      handler: (response: any) => {
        // Step 2 – verify on backend
        this.paymentService.verifyPayment({
          razorpay_order_id:  response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }).subscribe({
          next: (verifyRes) => {
            this.isProcessing   = false;
            this.showSuccess    = true;
            this.successPaymentId = verifyRes.payment_id;
          },
          error: () => {
            this.isProcessing = false;
            this.showErr('Payment verification failed. Contact support with your Payment ID: '
              + response.razorpay_payment_id);
          },
        });
      },
    };

    const rzp = new Razorpay(options);

    rzp.on('payment.failed', (response: any) => {
      this.isProcessing = false;
      const err = response.error || {};
      this.showErr(err.description || 'Payment failed. Please try again.');
      this.paymentService.recordFailure({
        razorpay_order_id:  orderRes.order_id,
        error_code:         err.code,
        error_description:  err.description,
        payment_method:     this.activeMethod,
      }).subscribe();
    });

    rzp.open();
  }

  private buildDisplayConfig(): any {
    switch (this.activeMethod) {
      case 'upi':
        return {
          display: {
            blocks: {
              upi: {
                name: 'Scan & Pay via UPI',
                instruments: [{ method: 'upi', flows: ['qr', 'collect', 'intent'] }],
              },
            },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: false },
          },
        };
      case 'wallet':
        return {
          display: {
            blocks: {
              wallet: {
                name: 'Pay via Wallet',
                instruments: [
                  { method: 'wallet', wallets: ['paytm', 'amazonpay', 'mobikwik', 'freecharge'] },
                ],
              },
            },
            sequence: ['block.wallet'],
            preferences: { show_default_blocks: false },
          },
        };
      default:
        return {
          display: {
            blocks: {
              card: {
                name: 'Pay via Card',
                instruments: [{ method: 'card' }],
              },
            },
            sequence: ['block.card'],
            preferences: { show_default_blocks: false },
          },
        };
    }
  }

  // ── Helpers ───────────────────────────────────────
  clearAlerts(): void {
    this.showSuccess = false;
    this.showError   = false;
    this.errorMessage = '';
  }

  showErr(msg: string): void {
    this.isProcessing = false;
    this.showError    = true;
    this.errorMessage = msg;
  }

  reset(): void {
    this.clearAlerts();
    this.activeMethod    = 'upi';
    this.cardFlipped     = false;
    this.successPaymentId = '';
  }
}