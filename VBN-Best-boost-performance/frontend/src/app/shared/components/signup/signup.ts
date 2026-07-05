import { Component } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, InputTextModule,
            PasswordModule, ButtonModule, SelectModule, ToastModule],
  providers: [MessageService],
  templateUrl: './signup.html'
})
export class Signup {

  fullName = ""
  email = ""
  password = ""
  confirmPassword = ""
  schoolId: any = null   
  selectedClass: any = null
  errors: any = {}
  loading = false

  schools: any[] = []     
  classes: any[] = []      

  private api = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService
  ) {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools)
  }

  onSchoolChange() {
    this.selectedClass = null
    this.classes = []
    if (!this.schoolId) return
    this.http.get(`${this.api}/classes?school_id=${this.schoolId}`)
      .subscribe((res: any) => this.classes = res.classes)
  }

  toast(severity: string, detail: string) {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Success' : 'Error', detail, life: 3000 })
  }

  validate(): boolean {
    this.errors = {}
    if (!this.fullName.trim())    this.errors.fullName = "Full name is required"
    if (!this.email.trim())       this.errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
                                  this.errors.email = "Enter a valid email"
    if (!this.schoolId)           this.errors.schoolId = "Please select a school"
    if (!this.selectedClass)      this.errors.selectedClass = "Please select a class"
    if (!this.password)           this.errors.password = "Password is required"
    else if (this.password.length < 6) this.errors.password = "Minimum 6 characters"
    if (!this.confirmPassword)    this.errors.confirmPassword = "Please confirm your password"
    else if (this.password !== this.confirmPassword)
                                  this.errors.confirmPassword = "Passwords do not match"
    return Object.keys(this.errors).length === 0
  }

  signup() {
    if (!this.validate()) return
    this.loading = true

    const payload = {
      fullName: this.fullName,
      email: this.email,
      schoolId: this.schoolId,     
      selectedClass: this.selectedClass,
      password: this.password
    }

        this.http.post(`${this.api}/api/signup`, payload)
// production
    // this.http.post(`${this.api}/signup`, payload)
      .subscribe({
        next: () => {
          this.loading = false
          this.toast('success', 'Account created! Redirecting to login...')
          setTimeout(() => this.router.navigate(['/login']), 2000)
        },
        error: (err) => {
          this.loading = false
          this.toast('error', err.error?.message || "Something went wrong.")
        }
      })
  }
}