import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';

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
    CardModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email: string = "";
  password: string = "";

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    if (!this.email || !this.password) {
      alert("Please enter both email and password");
      return;
    }

    const credentials = { email: this.email, password: this.password };
    
    this.http.post('http://127.0.0.1:8000/api/login', credentials)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            if (res.token) localStorage.setItem("token", res.token);
            this.router.navigate(['/home']);
          } else {
            alert(res.message || "Invalid email or password");
          }
        },
        error: (error) => {
          alert(error.error?.message || "Server error. Please try again.");
        }
      });
  }
}