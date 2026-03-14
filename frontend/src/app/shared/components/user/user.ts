import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-users',
  standalone: true,
  imports:[
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    TableModule
  ],
  templateUrl:'./user.html'
})
export class User implements OnInit {

  fullName=""
  email=""
  schoolName=""
  schoolCode=""
  selectedClass=""
  selectedRole:any

  users:any[]=[]
  roles:any[]=[]

  classes=[
    {label:"Class 6",value:"6"},
    {label:"Class 7",value:"7"},
    {label:"Class 8",value:"8"},
    {label:"Class 9",value:"9"},
    {label:"Class 10",value:"10"}
  ]

  constructor(private http:HttpClient){}

  ngOnInit(){
    this.loadUsers()
    this.loadRoles()
  }

  loadUsers(){
    this.http.get("http://localhost:8900/users")
    .subscribe((res:any)=>{
      this.users=res.users
    })
  }

  loadRoles(){
    this.http.get("http://localhost:8900/roles")
    .subscribe((res:any)=>{
      this.roles=res.roles
    })
  }

  createUser(){

    const payload={
      fullName:this.fullName,
      email:this.email,
      schoolName:this.schoolName,
      schoolCode:this.schoolCode,
      selectedClass:this.selectedClass
    }

    this.http.post("http://localhost:8900/users",payload)
    .subscribe((res:any)=>{

      const userId=res.user_id

      const rolePayload={
        role_id:this.selectedRole.id
      }

      this.http.post(`http://localhost:8900/users/${userId}/role`,rolePayload)
      .subscribe(()=>{
        alert("User created successfully")
        this.loadUsers()
      })

    })

  }

}