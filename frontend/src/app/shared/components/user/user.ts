import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

import { UserService } from '../../services/user.service';

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

  editingUserId:number | null = null

  users:any[]=[]
  roles:any[]=[]

  classes=[
    {label:"Class 6",value:"6"},
    {label:"Class 7",value:"7"},
    {label:"Class 8",value:"8"},
    {label:"Class 9",value:"9"},
    {label:"Class 10",value:"10"}
  ]

  constructor(private userService:UserService){}

  ngOnInit(){
    this.loadUsers()
    this.loadRoles()
  }

  loadUsers(){
    this.userService.getUsers()
    .subscribe((res:any)=>{
      this.users=res.users
    })
  }

  loadRoles(){
    this.userService.getRoles()
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

    this.userService.createUser(payload)
    .subscribe((res:any)=>{

      const userId=res.user_id

      const rolePayload={
        role_id:this.selectedRole
      }

      this.userService.assignRole(userId,rolePayload)
      .subscribe(()=>{
        alert("User created successfully")
        this.resetForm()
        this.loadUsers()
      })

    })

  }

  editUser(user:any){

    this.editingUserId=user.id

    this.fullName=user.name
    this.email=user.email
    this.selectedClass=user.studentClass
    this.schoolName=user.schoolName
    this.schoolCode=user.schoolCode
  }

  updateUser(){

    const payload={
      fullName:this.fullName,
      email:this.email,
      schoolName:this.schoolName,
      schoolCode:this.schoolCode,
      selectedClass:this.selectedClass
    }

    this.userService.updateUser(this.editingUserId!,payload)
    .subscribe(()=>{
      alert("User updated successfully")
      this.resetForm()
      this.loadUsers()
    })

  }

  resetForm(){

    this.fullName=""
    this.email=""
    this.schoolName=""
    this.schoolCode=""
    this.selectedClass=""
    this.selectedRole=null
    this.editingUserId=null
  }

}