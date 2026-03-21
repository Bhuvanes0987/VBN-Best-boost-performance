import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../Environment/Environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, InputTextModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './forgot-password.html'
})
export class ForgotPassword {
  email = ""
  loading = false
  sent = false

  constructor(private http: HttpClient, private messageService: MessageService) {}

  submit() {
    if (!this.email.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter your email', life: 3000 });
      return;
    }

    this.loading = true
    this.http.post(`${environment.apiUrl}/api/forgot-password`, { email: this.email })
      .subscribe({
        next: (res: any) => {
          this.loading = false
          this.sent = true
          this.messageService.add({ severity: 'success', summary: 'Sent', detail: res.message, life: 5000 });
        },
        error: (err) => {
          this.loading = false
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Something went wrong', life: 4000 });
        }
      })
  }
}