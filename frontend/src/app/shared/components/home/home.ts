import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, AvatarModule,
    DrawerModule, DialogModule, SelectModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {

  private router = inject(Router);
  private api = 'http://127.0.0.1:8900';

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  sidebarVisible = signal(false);

  currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  userPosition = parseInt(localStorage.getItem('position') || '2');

  userInitials = signal(() => {
    const name = this.currentUser?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  });

  isStudent = this.userPosition === 2;

  dialogVisible = false;
  quizMode: 'daily' | 'subject' | 'unit' = 'daily';

  classes: any[] = [];
  subjects: any[] = [];
  units: any[] = [];

  selectedClass: any = null;
  selectedSubject: any = null;
  selectedUnit: any = null;

  studentClassId = this.currentUser?.studentClass || null;
  schoolId = this.currentUser?.schoolId || null;

  ngOnInit() {
    this.loadClasses();
  }

  loadClasses() {
    if (this.isStudent && this.studentClassId) {
      this.http.get(`${this.api}/classes?school_id=${this.schoolId}`)
        .subscribe((res: any) => {
          this.classes = res.classes.filter(
            (c: any) => c.id === parseInt(this.studentClassId)
          );
          if (this.classes.length === 1) {
            this.selectedClass = this.classes[0];
            this.onClassChange();
          }
        });
    } else {
      this.questionService.getClasses()
        .subscribe((res: any) => this.classes = res.classes);
    }
  }

  onClassChange() {
    this.selectedSubject = null;
    this.selectedUnit = null;
    this.subjects = [];
    this.units = [];
    if (!this.selectedClass) return;

    this.questionService.getSubjectsByClass(this.selectedClass.id)
      .subscribe((res: any) => this.subjects = res.subjects);
  }

  onSubjectChange() {
    this.selectedUnit = null;
    this.units = this.selectedSubject?.units || [];
  }

  openQuizDialog(mode: 'daily' | 'subject' | 'unit') {
    this.quizMode = mode;
    this.dialogVisible = true;

    if (!this.isStudent) {
      this.selectedClass = null;
    }
    this.selectedSubject = null;
    this.selectedUnit = null;
  }

  startQuiz() {
    if (!this.selectedClass) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a class', life: 3000 });
      return;
    }

    if (this.quizMode === 'subject' && !this.selectedSubject) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a subject', life: 3000 });
      return;
    }

    if (this.quizMode === 'unit' && !this.selectedUnit) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a unit', life: 3000 });
      return;
    }

    this.dialogVisible = false;

    const classId = this.selectedClass.id;
    const subjectId = this.selectedSubject?.id || 'all';
    const unitId = this.selectedUnit?.id || 'all';

    this.router.navigate(['/quiz', classId, subjectId], {
      queryParams: {
        mode: this.quizMode,
        unit: unitId,
        school: this.schoolId
      }
    });
  }

  goTo(path: string) {
    this.sidebarVisible.set(false);
    this.router.navigate([path]);
  }

  getUserName(): string {
    return this.currentUser?.name || 'User';
  }

  getUserInitials(): string {
    const name = this.currentUser?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  getRoleLabel(): string {
    if (this.userPosition === 1) return 'Admin';
    if (this.userPosition === 2) return 'Student';
    return this.currentUser?.role || 'User';
  }
}