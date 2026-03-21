import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { AvatarModule } from 'primeng/avatar';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule,
    InputTextModule, MultiSelectModule, ToastModule, AvatarModule
  ],
  providers: [MessageService],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {

  private api = 'http://127.0.0.1:8900';
  currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  name = '';
  email = '';
  phone = '';
  className = '';
  schoolName = '';
  profilePic: string | null = null;
  previewPic: string | null = null;

  availableSubjects: any[] = [];
  selectedSubjects: any[] = [];
  maxSubjects = 5;

  loading = false;
  saving = false;

  constructor(
    private http: HttpClient,
    public router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    const userId = this.currentUser?.id;
    if (!userId) { this.router.navigate(['/login']); return; }

    this.loading = true;
    this.http.get(`${this.api}/profile/${userId}`).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.name = res.name || '';
        this.email = res.email || '';
        this.phone = res.phone || '';
        this.className = res.class_name || '';
        this.schoolName = res.school_name || '';
        this.profilePic = res.profile_pic || null;
        this.previewPic = res.profile_pic || null;

        this.loadAvailableSubjects(res.selected_subjects || []);
      },
      error: () => this.loading = false
    });
  }

  loadAvailableSubjects(selectedFromDB: any[]) {
    const userId = this.currentUser?.id;
    this.http.get(`${this.api}/profile/${userId}/subjects`).subscribe({
      next: (res: any) => {
        this.availableSubjects = res.subjects || [];
        this.selectedSubjects = this.availableSubjects.filter(s =>
          selectedFromDB.some((sel: any) => sel.id === s.id)
        );
      }
    });
  }

  onSubjectChange() {
    if (this.selectedSubjects.length > this.maxSubjects) {
      this.selectedSubjects = this.selectedSubjects.slice(0, this.maxSubjects);
      this.messageService.add({
        severity: 'warn',
        summary: 'Limit Reached',
        detail: 'You can select maximum 5 subjects only',
        life: 3000
      });
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.messageService.add({
        severity: 'warn', summary: 'File too large',
        detail: 'Image must be under 2MB', life: 3000
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewPic = e.target.result;
      this.profilePic = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getUserInitials(): string {
    return this.name.split(' ')
      .map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  get subjectCountLabel(): string {
    const count = this.selectedSubjects.length;
    const remaining = this.maxSubjects - count;
    if (count === 0) return 'No subjects selected';
    if (remaining === 0) return '✅ Maximum 5 subjects selected';
    return `${count} selected — ${remaining} more allowed`;
  }

  saveProfile() {
    if (!this.name.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Name is required', life: 3000 });
      return;
    }

    this.saving = true;
    const payload = {
      name: this.name,
      phone: this.phone,
      profile_pic: this.profilePic,
      selected_subjects: this.selectedSubjects.map(s => s.id)
    };

    const userId = this.currentUser?.id;
      this.http.put(`${this.api}/profile/${userId}`, payload).subscribe({
    next: () => {
      this.saving = false;
      const user = {
        ...this.currentUser,
        name: this.name,
        selectedSubjects: this.selectedSubjects.map(s => s.id)
      };
      localStorage.setItem('user', JSON.stringify(user));

      this.messageService.add({
        severity: 'success', summary: 'Saved',
        detail: 'Profile updated successfully', life: 3000
      });
    }
  });
  }
  isSelected(subject: any): boolean {
  return this.selectedSubjects.some(s => s.id === subject.id);
}

toggleSubject(subject: any) {
  if (this.isSelected(subject)) {
    this.selectedSubjects = this.selectedSubjects.filter(s => s.id !== subject.id);
  } else {
    if (this.selectedSubjects.length >= this.maxSubjects) {
      this.messageService.add({
        severity: 'warn', summary: 'Limit Reached',
        detail: 'You can select maximum 5 subjects only', life: 3000
      });
      return;
    }
    this.selectedSubjects = [...this.selectedSubjects, subject];
  }
}
}