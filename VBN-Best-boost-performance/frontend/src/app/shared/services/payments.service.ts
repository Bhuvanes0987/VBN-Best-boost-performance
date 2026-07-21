// src/app/payments/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Environment/Environment';

export interface CreateOrderResponse {
    order_id: string;
    amount: number;
    currency: string;
    key: string;
}

export interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    payment_id: string;
    order_id: string;
    message: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
    private api = environment.apiUrl;

    constructor(private http: HttpClient) { }

    createOrder(payload: {
        amount: number;
        currency?: string;
        description?: string;
        payment_method?: string;
        customer_name?: string;
        customer_email?: string;
        customer_contact?: string;
        user_id?: number | string | null;
    }): Observable<CreateOrderResponse> {
        return this.http.post<CreateOrderResponse>(`${this.api}/payment/create-order`, payload);
    }

    verifyPayment(payload: VerifyPaymentRequest): Observable<VerifyPaymentResponse> {
        return this.http.post<VerifyPaymentResponse>(`${this.api}/payment/verify`, payload);
    }

    recordFailure(payload: {
        razorpay_order_id: string;
        error_code?: string;
        error_description?: string;
        payment_method?: string;
    }): Observable<any> {
        return this.http.post(`${this.api}/payment/failed`, payload);
    }

    getOrderStatus(orderId: string): Observable<any> {
        return this.http.get(`${this.api}/payment/status/${orderId}`);
    }
}