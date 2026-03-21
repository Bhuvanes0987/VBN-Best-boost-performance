import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
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
    DialogModule, SelectModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {

  public router = inject(Router);
  private api = 'http://127.0.0.1:8900';

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  userPosition = parseInt(localStorage.getItem('position') || '2');
  isStudent = this.userPosition === 2;

  dialogVisible = false;
  quizMode: 'daily' | 'subject' = 'daily';

  classes: any[] = [];
  subjects: any[] = [];
  units: any[] = [];
  selectedClass: any = null;
  selectedSubject: any = null;
  selectedUnit: any = null;
  schoolId = this.currentUser?.schoolId || null;
  studentClassId = this.currentUser?.studentClass || null;

  stats = { totalTests: 0, avgScore: 0, bestScore: 0, streak: 0 };

  ngOnInit() {
    this.loadClasses();
    this.loadStats();
  }

  loadStats() {
    const userId = this.currentUser?.id;
    if (!userId) return;
    this.http.get(`${this.api}/results/stats?user_id=${userId}`)
      .subscribe({
        next: (res: any) => this.stats = res.stats || this.stats,
        error: () => {}
      });
  }

  loadClasses() {
    if (this.isStudent && this.studentClassId) {
      const url = this.schoolId
        ? `${this.api}/classes?school_id=${this.schoolId}`
        : `${this.api}/classes`;

      this.http.get(url).subscribe((res: any) => {
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

  openQuizDialog(mode: 'daily' | 'subject') {
    this.quizMode = mode;
    this.selectedSubject = null;
    this.selectedUnit = null;
    this.units = [];
    if (!this.isStudent) this.selectedClass = null;
    this.dialogVisible = true;
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

    this.dialogVisible = false;

    const classId = this.selectedClass.id;
    const subjectId = this.selectedSubject?.id || 'all';
    const unitId = this.selectedUnit?.id || 'all';

    const queryParams: any = {
      mode: this.quizMode,
      unit: unitId
    };
    if (this.schoolId) queryParams['school'] = this.schoolId;

    this.router.navigate(['/quiz', classId, subjectId], { queryParams });
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  getUserName(): string { return this.currentUser?.name || 'User'; }

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