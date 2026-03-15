import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-role',
  standalone: true,
  templateUrl: './role.html',
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
    TableModule
  ]
})
export class Role implements OnInit {

  roleName: string = '';
  description: string = '';

  roles: any[] = [];
  permissions: any[] = [];

  selectedPermissions: any[] = [];

  constructor(private roleService: RoleService) {}

  ngOnInit() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.roleService.getRoles().subscribe({
      next: (res:any) => {
        this.roles = res.roles;
      },
      error: () => {
        alert("Error loading roles");
      }
    });
  }

  loadPermissions() {
    this.roleService.getPermissions().subscribe({
      next: (res:any) => {
        this.permissions = res.permissions;
      },
      error: () => {
        alert("Error loading permissions");
      }
    });
  }

  createRole() {

    if(!this.roleName){
      alert("Role name required");
      return;
    }

    const payload = {
      name: this.roleName,
      description: this.description
    };

    this.roleService.createRole(payload).subscribe({

      next: (res:any) => {

        const roleId = res.role_id;

        const permPayload = {
          permissions: this.selectedPermissions.map(p => p.id)
        };

        if(permPayload.permissions.length === 0){
          alert("Role created successfully");
          this.resetForm();
          this.loadRoles();
          return;
        }

        this.roleService.assignPermissions(roleId, permPayload)
        .subscribe({
          next: () => {
            alert("Role created successfully");

            this.resetForm();
            this.loadRoles();
          },
          error: () => {
            alert("Error assigning permissions");
          }
        });

      },

      error: (err) => {
        alert(err.error?.message || "Role already exists");
      }

    });

  }

  resetForm(){
    this.roleName = '';
    this.description = '';
    this.selectedPermissions = [];
  }

}