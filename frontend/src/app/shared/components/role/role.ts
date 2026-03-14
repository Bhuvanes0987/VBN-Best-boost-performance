import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
    TableModule
  ],
  templateUrl: './role.html'
})
export class Role implements OnInit {

  roleName = "";
  description = "";

  roles: any[] = [];

  permissions = [
    { name: "Users", id: 1 },
    { name: "Classes", id: 2 },
    { name: "Subjects", id: 3 },
    { name: "Questions", id: 4 },
    { name: "Quiz", id: 5 },
    { name: "Results", id: 6 },
    { name: "Payments", id: 7 }
  ];

  selectedPermissions: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(){
    this.loadRoles();
  }

  loadRoles(){
    this.http.get("http://localhost:8900/roles")
    .subscribe((res:any)=>{
      this.roles = res.roles;
    })
  }

  createRole(){

    const payload = {
      name: this.roleName,
      description: this.description
    }

    this.http.post("http://localhost:8900/roles",payload)
    .subscribe((res:any)=>{

      const roleId = res.role_id;

      const permPayload = {
        permissions:this.selectedPermissions.map(p=>p.id)
      }

      this.http.post(`http://localhost:8900/roles/${roleId}/permissions`,permPayload)
      .subscribe(()=>{
        alert("Role created successfully")
        this.loadRoles();
      })

    })
  }

}