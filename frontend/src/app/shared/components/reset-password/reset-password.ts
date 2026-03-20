import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, PasswordModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reset-password.html'
})
export class ResetPassword implements OnInit {
  token = ""
  password = ""
  confirmPassword = ""
  loading = false
  done = false

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || ''
    if (!this.token) {
      this.messageService.add({ severity: 'error', summary: 'Invalid', detail: 'Invalid reset link', life: 4000 });
    }
  }

  submit() {
    if (!this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Password is required', life: 3000 });
      return;
    }
    if (this.password.length < 6) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Minimum 6 characters', life: 3000 });
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.messageService.add({ severity: 'warn', summary: 'Mismatch', detail: 'Passwords do not match', life: 3000 });
      return;
    }

    this.loading = true
    this.http.post('http://127.0.0.1:8900/api/reset-password', {
      token: this.token,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false
        this.done = true
        setTimeout(() => this.router.navigate(['/login']), 2500)
      },
      error: (err) => {
        this.loading = false
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Reset failed', life: 4000 });
      }
    })
  }
}