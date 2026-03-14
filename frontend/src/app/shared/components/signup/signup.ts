import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ButtonModule
  ],
  templateUrl: './signup.html'
})
export class Signup {

  fullName = ""
  schoolName = ""
  schoolCode = ""
  email = ""
  password = ""
  confirmPassword = ""

  selectedClass: any

  classes = [
    { label: "Class 6", value: "6" },
    { label: "Class 7", value: "7" },
    { label: "Class 8", value: "8" },
    { label: "Class 9", value: "9" },
    { label: "Class 10", value: "10" }
  ]

  constructor(private http: HttpClient, private router: Router) {}

  signup(){

    if(this.password !== this.confirmPassword){
      alert("Passwords do not match")
      return
    }

    const payload = {
      fullName: this.fullName,
      email: this.email,
      password: this.password,
      schoolName: this.schoolName,
      schoolCode: this.schoolCode,
      selectedClass: this.selectedClass.value
    }

    this.http.post("http://127.0.0.1:8000/api/signup", payload)
    .subscribe((res:any)=>{

      if(res.success){
        alert("Account created")
        this.router.navigate(['/login'])
      }

    })
  }

}