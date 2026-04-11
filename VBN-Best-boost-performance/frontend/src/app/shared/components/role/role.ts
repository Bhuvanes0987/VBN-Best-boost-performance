import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RoleService } from '../../services/role.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [
    CommonModule, FormsModule, InputTextModule, SelectModule,
    ButtonModule, TableModule, MultiSelectModule,
    ConfirmPopupModule, TooltipModule, ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './role.html'
})
export class Role implements OnInit {

  roleName = "";
  description = "";
  selectedPermissions: any[] = [];
  selectedSchool: any = null;
  editingRoleId: number | null = null;

  roles: any[] = [];
  permissions: any[] = [];
  schools: any[] = [];

  private api = 'http://127.0.0.1:8900';

  constructor(
    private roleService: RoleService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
    this.loadRoles();
    this.loadPermissions();
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  loadRoles() {
    this.roleService.getRoles().subscribe((res: any) => this.roles = res.roles);
  }

  loadPermissions() {
    this.roleService.getPermissions().subscribe((res: any) => this.permissions = res.permissions);
  }

  toast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }

  getSchoolName(schoolId: number): string {
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : 'Global';
  }

  getRoleType(): string {
    const selectedPages = this.selectedPermissions.map((p: any) => {
      const perm = this.permissions.find((x: any) => x.id === p.id);
      return perm?.page || '';
    });

    const principalPages = ['classes', 'subjects', 'questions', 'results', 'payments', 'users'];
    const teacherPages = ['quiz', 'questions', 'results'];

    const hasPrincipalAccess = principalPages.filter(p => selectedPages.includes(p)).length >= 3;
    const hasTeacherAccess = teacherPages.some(p => selectedPages.includes(p));

    if (hasPrincipalAccess) return 'principal';
    if (hasTeacherAccess) return 'teacher';
    return 'custom';
  }

  createRole() {
    if (!this.roleName.trim()) {
      this.toast('warn', 'Validation', 'Role name is required');
      return;
    }

    const payload = {
      name: this.roleName,
      description: this.description,
      school_id: this.selectedSchool,
      role_type: this.getRoleType(), 
      permissions: this.selectedPermissions.map((p: any) => p.id)
    };

    this.roleService.createRole(payload).subscribe({
      next: () => {
        this.toast('success', 'Created', 'Role created successfully');
        this.resetForm();
        this.loadRoles();
      },
      error: (err) => this.toast('error', 'Error', err.error?.message || "Failed to create role")
    });
  }

  editRole(role: any) {
    this.editingRoleId = role.id;
    this.roleName = role.name;
    this.description = role.description || "";
    this.selectedSchool = role.school_id || null;

    if (this.permissions.length === 0) {
      this.roleService.getPermissions().subscribe((res: any) => {
        this.permissions = res.permissions;
        this.mapPermissions(role);
      });
    } else {
      this.mapPermissions(role);
    }
  }

  mapPermissions(role: any) {
    this.selectedPermissions = this.permissions.filter(p =>
      role.permissions.some((rp: any) => rp.id === p.id)
    );
  }

  updateRole() {
    if (!this.roleName.trim()) {
      this.toast('warn', 'Validation', 'Role name is required');
      return;
    }

    const payload = {
      name: this.roleName,
      description: this.description,
      school_id: this.selectedSchool,
      role_type: this.getRoleType(),  
      permissions: this.selectedPermissions.map((p: any) => p.id)
    };

    this.roleService.updateRole(this.editingRoleId!, payload).subscribe({
      next: () => {
        this.toast('success', 'Updated', 'Role updated successfully');
        this.resetForm();
        this.loadRoles();
      },
      error: (err) => this.toast('error', 'Error', err.error?.message || "Update failed")
    });
  }

  confirmDelete(event: Event, roleId: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this role?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.roleService.deleteRole(roleId).subscribe({
          next: () => {
            this.toast('success', 'Deleted', 'Role deleted successfully');
            this.loadRoles();
          },
          error: (err) => this.toast('error', 'Error', err.error?.message || "Delete failed")
        });
      }
    });
  }

  resetForm() {
    this.roleName = "";
    this.description = "";
    this.selectedPermissions = [];
    this.selectedSchool = null;
    this.editingRoleId = null;
  }
}