import { Component, OnInit } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, InputTextModule,
    SelectModule, ButtonModule, TableModule,
    ConfirmPopupModule, TooltipModule, ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './user.html'
})
export class User implements OnInit {

  private api = environment.apiUrl;

  fullName = "";
  email = "";
  schoolCode = "";
  selectedSchool: any = null;
  selectedClass: any = null;
  selectedRole: any = null;
  selectedSubject: any = null;  
  editingUserId: number | null = null;
  submitting = false;

  users: any[] = [];
  roles: any[] = [];
  classes: any[] = [];
  schools: any[] = [];
  subjects: any[] = [];  

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
    this.loadRoles();
    this.loadUsers();
  }

  toast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  loadUsers() {
    this.userService.getUsers().subscribe((res: any) => this.users = res.users);
  }

  loadRoles() {
    this.userService.getRoles().subscribe((res: any) => this.roles = res.roles);
  }

  onSchoolChange() {
    this.selectedClass = null;
    this.selectedSubject = null;
    this.classes = [];
    this.subjects = [];
    this.schoolCode = "";
    if (!this.selectedSchool) return;

    const school = this.schools.find(s => s.id === this.selectedSchool);
    if (school) this.schoolCode = school.code || "";

    this.http.get(`${this.api}/classes?school_id=${this.selectedSchool}`)
      .subscribe((res: any) => this.classes = res.classes);
  }

  onClassChange() {
    this.selectedSubject = null;
    this.subjects = [];
    if (!this.selectedClass) return;
    this.http.get(`${this.api}/subjects/by-class/${this.selectedClass}`)
      .subscribe((res: any) => this.subjects = res.subjects);
  }

  isTeacherRole(): boolean {
    if (!this.selectedRole) return false;
    const role = this.roles.find(r => r.id === this.selectedRole);
    return role?.role_type === 'teacher' ||
           role?.name?.toLowerCase().includes('teacher');
  }

  getRoleName(user: any): string {
    if (user.position === 1 || user.position === '1') return 'Admin';
    if (user.position === 2 || user.position === '2') return 'Student';
    if (user.roleId) {
      const role = this.roles.find(r => r.id === user.roleId);
      return role ? role.name : '-';
    }
    return '-';
  }

  getClassName(classId: any): string {
    if (!classId) return '-';
    const cls = this.classes.find(c => c.id === parseInt(classId));
    return cls ? cls.name : classId;
  }

  getSchoolName(schoolId: any): string {
    if (!schoolId) return '-';
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : '-';
  }

  createUser() {
    if (this.submitting) return;
    if (!this.selectedSchool)  { this.toast('warn', 'Validation', 'Please select a school'); return; }
    if (!this.selectedRole)    { this.toast('warn', 'Validation', 'Please select a role'); return; }
    if (!this.fullName.trim()) { this.toast('warn', 'Validation', 'Full name is required'); return; }
    if (!this.email.trim())    { this.toast('warn', 'Validation', 'Email is required'); return; }
    if (this.isTeacherRole() && !this.selectedSubject) {
      this.toast('warn', 'Validation', 'Please select a subject for teacher'); return;
    }

    const payload = {
      fullName: this.fullName,
      email: this.email,
      schoolId: this.selectedSchool,
      selectedClass: this.selectedClass,
      selectedRole: this.selectedRole,
      selectedSubject: this.isTeacherRole() ? this.selectedSubject : null  
    };

    this.submitting = true;
    this.userService.createUser(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast('success', 'Created', 'User created and role assigned!');
        this.resetForm();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting = false;
        this.toast('error', 'Error', err.error?.message || "Failed to create user");
      }
    });
  }

  editUser(user: any) {
    this.editingUserId = user.id;
    this.fullName = user.name;
    this.email = user.email;
    this.selectedSchool = user.schoolId;
    this.selectedRole = user.roleId || null;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (user.schoolId) {
      const school = this.schools.find(s => s.id === user.schoolId);
      this.schoolCode = school?.code || "";

      this.http.get(`${this.api}/classes?school_id=${user.schoolId}`)
        .subscribe((res: any) => {
          this.classes = res.classes;
          this.selectedClass = user.studentClass ? parseInt(user.studentClass) : null;

          if (this.selectedClass) {
            this.http.get(`${this.api}/subjects/by-class/${this.selectedClass}`)
              .subscribe((res2: any) => {
                this.subjects = res2.subjects;
                this.selectedSubject = user.subjectScope || null;
              });
          }
        });
    }
  }

  updateUser() {
    if (this.submitting) return;
    if (!this.fullName.trim()) { this.toast('warn', 'Validation', 'Full name is required'); return; }
    if (!this.email.trim())    { this.toast('warn', 'Validation', 'Email is required'); return; }

    const payload = {
      fullName: this.fullName,
      email: this.email,
      schoolId: this.selectedSchool,
      selectedClass: this.selectedClass,
      selectedRole: this.selectedRole,
      selectedSubject: this.isTeacherRole() ? this.selectedSubject : null
    };

    this.submitting = true;
    this.userService.updateUser(this.editingUserId!, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.toast('success', 'Updated', 'User updated successfully');
        this.resetForm();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting = false;
        this.toast('error', 'Error', err.error?.message || "Update failed");
      }
    });
  }

  confirmDelete(event: Event, userId: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure you want to delete this user?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete', rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.userService.deleteUser(userId).subscribe({
          next: () => {
            this.toast('success', 'Deleted', 'User deactivated successfully');
            this.loadUsers();
          },
          error: (err) => this.toast('error', 'Error', err.error?.message || "Delete failed")
        });
      }
    });
  }

  resetForm() {
    this.fullName = "";
    this.email = "";
    this.schoolCode = "";
    this.selectedSchool = null;
    this.selectedClass = null;
    this.selectedRole = null;
    this.selectedSubject = null;
    this.classes = [];
    this.subjects = [];
    this.editingUserId = null;
    this.submitting = false;
  }
}