import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule,
    RadioButtonModule, ProgressBarModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './quiz.html'
})
export class Quiz implements OnInit {

  private api = 'http://127.0.0.1:8900';
  currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  questions: any[] = [];
  currentIndex = 0;
  selectedAnswer: any = null;
  answers: any[] = [];
  quizDone = false;
  loading = true;
  noQuestions = false;

  classId = '';
  subjectId = '';
  unitId = 'all';
  quizMode = 'daily';
  schoolId = '';

  correctCount = 0;
  scorePercent = 0;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.classId  = this.route.snapshot.paramMap.get('classId') || '';
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
    this.unitId   = this.route.snapshot.queryParamMap.get('unit') || 'all';
    this.quizMode = this.route.snapshot.queryParamMap.get('mode') || 'daily';
    this.schoolId = this.route.snapshot.queryParamMap.get('school') || '';

    console.log('Quiz params:', { classId: this.classId, subjectId: this.subjectId, quizMode: this.quizMode, schoolId: this.schoolId });

    this.loadQuestions();
  }

  loadQuestions() {
  this.loading = true;
  this.noQuestions = false;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const selectedSubjectIds: number[] = user?.selectedSubjects || [];

    let url = '';

  if (this.quizMode === 'daily') {
    url = `${this.api}/questions/daily-test?class_id=${this.classId}&limit=20`;
    if (this.schoolId && this.schoolId !== 'null') url += `&school_id=${this.schoolId}`;
    if (selectedSubjectIds.length > 0) {
      url += `&subject_ids=${selectedSubjectIds.join(',')}`;
    }
  } else {
    url = `${this.api}/questions/subject-test?class_id=${this.classId}&subject_id=${this.subjectId}&limit=20`;
    if (this.unitId && this.unitId !== 'all') url += `&unit_id=${this.unitId}`;
    if (this.schoolId && this.schoolId !== 'null') url += `&school_id=${this.schoolId}`;
  }

  this.http.get(url).subscribe({
    next: (res: any) => {
      this.loading = false;
      if (!res.questions || res.questions.length === 0) {
        this.noQuestions = true; return;
      }
      this.questions = res.questions;
      this.answers = new Array(this.questions.length).fill(null);
    },
    error: () => { this.loading = false; this.noQuestions = true; }
  });
}

  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  get progress() {
    if (!this.questions.length) return 0;
    return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
  }

  get isLastQuestion() {
    return this.currentIndex === this.questions.length - 1;
  }

  selectAnswer(answer: any) {
    this.selectedAnswer = answer;
    this.answers[this.currentIndex] = answer;
  }

  next() {
    if (this.selectedAnswer === null || this.selectedAnswer === undefined) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select an answer', life: 2000 });
      return;
    }
    if (this.isLastQuestion) {
      this.submitQuiz();
    } else {
      this.currentIndex++;
      this.selectedAnswer = this.answers[this.currentIndex] ?? null;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.selectedAnswer = this.answers[this.currentIndex] ?? null;
    }
  }

  submitQuiz() {
    this.correctCount = 0;
    this.questions.forEach((q, i) => {
      const userAnswer = this.answers[i];
      const data = q.answer_data;

      if (q.question_type === 'mcq') {
        if (userAnswer === data?.correct) this.correctCount++;
      } else if (q.question_type === 'fill') {
        if (userAnswer?.toString().toLowerCase().trim() ===
            data?.answer?.toString().toLowerCase().trim()) {
          this.correctCount++;
        }
      } else if (q.question_type === 'match') {
        if (userAnswer === 'matched') this.correctCount++;
      }
    });

    this.scorePercent = Math.round((this.correctCount / this.questions.length) * 100);
    this.quizDone = true;
    this.saveResult();
  }

  saveResult() {
    const payload = {
      user_id: this.currentUser?.id,
      school_id: this.schoolId && this.schoolId !== 'null' ? parseInt(this.schoolId) : null,
      class_id: parseInt(this.classId) || null,
      subject_id: this.subjectId && this.subjectId !== 'all' ? parseInt(this.subjectId) : null,
      unit_id: this.unitId && this.unitId !== 'all' ? parseInt(this.unitId) : null,
      total_questions: this.questions.length,
      correct_answers: this.correctCount,
      test_type: this.quizMode === 'daily' ? 'daily_random' : 'subject_test'
    };

    this.http.post(`${this.api}/results`, payload).subscribe({
      next: () => console.log('Result saved ✅'),
      error: (err) => console.error('Failed to save result:', err)
    });
  }

  goHome() { this.router.navigate(['/home']); }

  retakeQuiz() {
    this.currentIndex = 0;
    this.selectedAnswer = null;
    this.answers = [];
    this.quizDone = false;
    this.correctCount = 0;
    this.scorePercent = 0;
    this.loadQuestions();
  }

  getScoreColor(): string {
    if (this.scorePercent >= 70) return 'text-green-600';
    if (this.scorePercent >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  getScoreMessage(): string {
    if (this.scorePercent >= 80) return '🎉 Excellent work!';
    if (this.scorePercent >= 60) return '👍 Good job!';
    if (this.scorePercent >= 40) return '📚 Keep practicing!';
    return "💪 Don't give up, try again!";
  }
}