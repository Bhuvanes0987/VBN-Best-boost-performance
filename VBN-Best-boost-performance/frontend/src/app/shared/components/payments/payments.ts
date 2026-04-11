// src/app/payments/payments.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payments.service';
import { environment } from '../../../Environment/Environment';

declare var Razorpay: any;

export type PaymentMethodType = 'upi' | 'wallet' | 'debit' | 'credit';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.scss'],
  providers: [PaymentService],
})
export class Payments implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────
  activeMethod: PaymentMethodType = 'upi';
  isProcessing = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  successPaymentId = '';
  cardFlipped = false;

  // ── Card Input variables ──────────────────────────
  inputCardNumber = '4111 1111 1111 1111';
  inputCardHolder = 'TEST USER';
  inputExpiry = '12/26';
  inputCVV = '123';

  // ── UPI State ─────────────────────────────────────
  showQrView = false;
  upiMode: 'qr' | 'id' = 'qr';
  upiId = '';
  upiTimer = 300; // 5 minutes in seconds
  upiTimerDisplay = '05:00';
  upiTimerPercent = 100;
  upiTimerExpired = false;
  private upiTimerInterval: any = null;

  // ── Wallet State ──────────────────────────────────
  selectedWallet: string | null = null;
  walletProcessing = false;

  wallets: WalletOption[] = [
    { id: 'paytm', name: 'Paytm', icon: '💰', color: '#00BAF2' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: '🛒', color: '#FF9900' },
    { id: 'mobikwik', name: 'Mobikwik', icon: '📲', color: '#E1173F' },
    { id: 'freecharge', name: 'Freecharge', icon: '⚡', color: '#7B2D8E' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', color: '#5F259F' },
    { id: 'jiomoney', name: 'Jio Money', icon: '🔵', color: '#0A3B87' },
  ];

  // ── Order config ──────────────────────────────────
  readonly AMOUNT = 100;      // ₹1 in paise (for testing)
  readonly AMOUNT_DISPLAY = '₹1.00';
  readonly DESCRIPTION = 'Premium Plan · 1 month';

  private razorpayScript: HTMLScriptElement | null = null;

  constructor(private paymentService: PaymentService) { }

  ngOnInit(): void {
    this.loadRazorpayScript();
  }

  ngOnDestroy(): void {
    if (this.razorpayScript) {
      document.head.removeChild(this.razorpayScript);
    }
    this.stopUpiTimer();
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
    this.cardFlipped = false;
    this.clearAlerts();
    this.selectedWallet = null;
    this.cancelQrView();
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

  // ── UPI Methods ───────────────────────────────────
  generateQr(): void {
    if (this.isProcessing) return;
    this.clearAlerts();
    this.isProcessing = true;

    // Simulate opening the QR code screen
    setTimeout(() => {
      this.isProcessing = false;
      this.showQrView = true;
      this.upiMode = 'qr';
      this.startUpiTimer();
    }, 600);
  }

  cancelQrView(): void {
    this.showQrView = false;
    this.stopUpiTimer();
    this.upiId = '';
  }

  setUpiMode(mode: 'qr' | 'id'): void {
    this.upiMode = mode;
    if (mode === 'qr' && !this.upiTimerExpired) {
      this.startUpiTimer();
    } else {
      this.stopUpiTimer();
    }
  }

  startUpiTimer(): void {
    this.stopUpiTimer();
    this.upiTimer = 300;
    this.upiTimerExpired = false;
    this.updateTimerDisplay();

    this.upiTimerInterval = setInterval(() => {
      this.upiTimer--;
      this.updateTimerDisplay();

      if (this.upiTimer <= 0) {
        this.stopUpiTimer();
        this.upiTimerExpired = true;
      }
    }, 1000);
  }

  stopUpiTimer(): void {
    if (this.upiTimerInterval) {
      clearInterval(this.upiTimerInterval);
      this.upiTimerInterval = null;
    }
  }

  updateTimerDisplay(): void {
    const mins = Math.floor(this.upiTimer / 60);
    const secs = this.upiTimer % 60;
    this.upiTimerDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.upiTimerPercent = (this.upiTimer / 300) * 100;
  }

  refreshQr(): void {
    this.upiTimerExpired = false;
    this.startUpiTimer();
  }

  get isValidUpiId(): boolean {
    return /^[\w.\-]+@[\w]+$/.test(this.upiId.trim());
  }

  // ── Wallet Methods ────────────────────────────────
  selectWallet(walletId: string): void {
    this.selectedWallet = walletId;
  }

  getSelectedWalletName(): string {
    const w = this.wallets.find(x => x.id === this.selectedWallet);
    return w ? w.name : '';
  }

  // ── Payment flow ──────────────────────────────────
  async pay(): Promise<void> {
    this.clearAlerts();
    this.isProcessing = true;

    // Validation for wallet
    if (this.activeMethod === 'wallet' && !this.selectedWallet) {
      this.showErr('Please select a wallet to continue.');
      return;
    }

    try {
      await this.loadRazorpayScript();
    } catch {
      this.showErr('Unable to load payment gateway. Check your internet connection.');
      return;
    }

    // Step 1 – create order on backend
    this.paymentService.createOrder({
      amount: this.AMOUNT,
      description: this.DESCRIPTION,
      payment_method: this.activeMethod,
    }).subscribe({
      next: (orderRes) => this.openRazorpay(orderRes),
      error: (err) => {
        this.showErr('Could not create order. Please try again.');
        console.error('Order creation error', err);
      },
    });
  }

  payWithUpiId(): void {
    if (!this.isValidUpiId) {
      this.showErr('Please enter a valid UPI ID (e.g., name@upi).');
      return;
    }
    this.pay();
  }

  payWithWallet(): void {
    if (!this.selectedWallet) {
      this.showErr('Please select a wallet first.');
      return;
    }
    this.pay();
  }

  private openRazorpay(orderRes: { order_id: string; amount: number; currency: string }): void {
    this.stopUpiTimer();

    const options: any = {
      key: environment.razorpayKeyId,
      amount: orderRes.amount,
      currency: orderRes.currency,
      name: 'VBN Boost Performance',
      description: this.DESCRIPTION,
      order_id: orderRes.order_id,
      prefill: {
        name: '',
        email: '',
        contact: '',
        ...(this.activeMethod === 'upi' && this.upiMode === 'id' ? { vpa: this.upiId.trim() } : {}),
      },
      theme: { color: '#F97316' },
      config: this.buildDisplayConfig(),
      modal: {
        ondismiss: () => {
          this.isProcessing = false;
        },
      },
      handler: (response: any) => {
        // Step 2 – verify on backend
        this.paymentService.verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }).subscribe({
          next: (verifyRes) => {
            this.isProcessing = false;
            this.showSuccess = true;
            this.successPaymentId = verifyRes.payment_id;
            this.showQrView = false;
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
        razorpay_order_id: orderRes.order_id,
        error_code: err.code,
        error_description: err.description,
        payment_method: this.activeMethod,
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
                  { method: 'wallet', wallets: [this.selectedWallet || 'paytm'] },
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
    this.showError = false;
    this.errorMessage = '';
  }

  showErr(msg: string): void {
    this.isProcessing = false;
    this.showError = true;
    this.errorMessage = msg;
  }

  reset(): void {
    this.clearAlerts();
    this.activeMethod = 'upi';
    this.cardFlipped = false;
    this.successPaymentId = '';
    this.showQrView = false;
    this.stopUpiTimer();
    this.upiTimerExpired = false;
    this.upiId = '';
    this.selectedWallet = null;
    this.upiMode = 'qr';
  }
}