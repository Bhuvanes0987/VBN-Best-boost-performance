import { Component } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { LoginBackground } from '../login-background/login-background';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    LoginBackground,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  providers: [MessageService]
})
export class Login {
  email: string = "";
  password: string = "";

  constructor(private http: HttpClient, private router: Router, private messageService: MessageService) { }

  login() {
    if (!this.email || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please enter both email and password', life: 3000 });
      return;
    }

    if (!this.email || !this.password) {
      alert("Please enter both email and password");
      return;

    }
    const credentials = { email: this.email, password: this.password };
    this.http.post(`${environment.apiUrl}/login`, credentials)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            sessionStorage.setItem("token", res.token);
            sessionStorage.setItem("position", res.user.position);
            sessionStorage.setItem("user", JSON.stringify(res.user));
            this.router.navigate(['/home']);
          }
        },

        error: (error) => {
          alert(error.error?.message || "Server error. Please try again.");
        }
      });
  }
}