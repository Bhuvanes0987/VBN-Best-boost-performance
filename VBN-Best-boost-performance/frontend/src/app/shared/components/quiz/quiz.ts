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

  questions:     any[]  = [];
  currentIndex   = 0;
  selectedAnswer: any   = null;
  answers:       any[]  = [];   // per-question saved answers
  quizDone       = false;
  loading        = true;
  noQuestions    = false;

  classId   = '';
  subjectId = '';
  unitId    = 'all';
  quizMode  = 'daily';
  schoolId  = '';

  correctCount  = 0;
  scorePercent  = 0;

  // ── Match drag & drop state ──────────────────────────────────────────────
  /** slotIndex → right-label the student dropped */
  matchAnswers: Record<number, string> = {};
  draggedValue  = '';
  dragOverSlot  = -1;
  /** Shuffled Column-B options, built once per question */
  shuffledRight: string[] = [];

  // ── Map pin state ────────────────────────────────────────────────────────
  mapPin: { xPct: number; yPct: number } | null = null;

  constructor(
    private route: ActivatedRoute,
    public  router: Router,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.classId   = this.route.snapshot.paramMap.get('classId')   || '';
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
    this.unitId    = this.route.snapshot.queryParamMap.get('unit')   || 'all';
    this.quizMode  = this.route.snapshot.queryParamMap.get('mode')   || 'daily';
    this.schoolId  = this.route.snapshot.queryParamMap.get('school') || '';
    this.loadQuestions();
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  loadQuestions() {
    this.loading     = true;
    this.noQuestions = false;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const selectedSubjectIds: number[] = user?.selectedSubjects || [];

    let url = '';
    if (this.quizMode === 'daily') {
      url = `${this.api}/questions/daily-test?class_id=${this.classId}&limit=20`;
      if (this.schoolId && this.schoolId !== 'null') url += `&school_id=${this.schoolId}`;
      if (selectedSubjectIds.length > 0) url += `&subject_ids=${selectedSubjectIds.join(',')}`;
    } else {
      url = `${this.api}/questions/subject-test?class_id=${this.classId}&subject_id=${this.subjectId}&limit=20`;
      if (this.unitId && this.unitId !== 'all')    url += `&unit_id=${this.unitId}`;
      if (this.schoolId && this.schoolId !== 'null') url += `&school_id=${this.schoolId}`;
    }

    this.http.get(url).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res.questions || res.questions.length === 0) { this.noQuestions = true; return; }
        this.questions = res.questions;
this.answers   = new Array(this.questions.length).fill(null);
  this.initQuestionState();
  setTimeout(() => this.renderMath(), 100);
      },
      error: () => { this.loading = false; this.noQuestions = true; }
    });
  }

  // ─── Question state initialisation ───────────────────────────────────────

  /**
   * Called whenever we land on a new question (first load or navigation).
   * Restores saved match / map state or initialises fresh state.
   */
  private initQuestionState() {
    const q = this.currentQuestion;
    if (!q) return;

    const saved = this.answers[this.currentIndex];

    if (q.question_type === 'match') {
      // Build shuffled Column B once per question (cache it)
      if (!this.shuffleCache[this.currentIndex]) {
      const rights: string[] = [
        ...(q.answer_data?.pairs ?? []).map((p: any) => p.right),
        ...(q.answer_data?.options ?? [])
      ];

      this.shuffleCache[this.currentIndex] = this.shuffle([...new Set(rights)]);
}
      this.shuffledRight = this.shuffleCache[this.currentIndex];
      // Restore saved match slots
      this.matchAnswers  = saved ? { ...saved } : {};
    } else {
      this.shuffledRight = [];
      this.matchAnswers  = {};
    }

    if (q.question_type === 'map') {
      this.mapPin = saved ?? null;
    } else {
      this.mapPin = null;
    }

    // Restore selectedAnswer for MCQ / fill
    this.selectedAnswer = (q.question_type === 'match' || q.question_type === 'map')
      ? null
      : (saved ?? null);
  }

  // Cache so Column B doesn't re-shuffle when navigating back
  private shuffleCache: Record<number, string[]> = {};

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get currentQuestion() { return this.questions[this.currentIndex]; }

  get progress() {
    if (!this.questions.length) return 0;
    return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
  }

  get isLastQuestion() { return this.currentIndex === this.questions.length - 1; }

  // ─── Answer selection ─────────────────────────────────────────────────────

  selectAnswer(answer: any) {
    this.selectedAnswer = answer;
    this.answers[this.currentIndex] = answer;
  }

  // ─── Match drag & drop ────────────────────────────────────────────────────

  onDragStart(event: DragEvent, value: string) {
    this.draggedValue = value;
    event.dataTransfer?.setData('text/plain', value);
  }

  onDragOver(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    this.dragOverSlot = slotIndex;
  }

  onDragLeave() { this.dragOverSlot = -1; }

  onDrop(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    this.dragOverSlot = -1;
    const value = event.dataTransfer?.getData('text/plain') || this.draggedValue;
    if (!value) return;

    // Remove this label from any other slot first
    Object.keys(this.matchAnswers).forEach(k => {
      if (this.matchAnswers[+k] === value) delete this.matchAnswers[+k];
    });

    this.matchAnswers[slotIndex] = value;
    this.draggedValue = '';

    // Save a copy of current match state
    this.answers[this.currentIndex] = { ...this.matchAnswers };

    // Mark selectedAnswer as truthy so Next doesn't block
    this.selectedAnswer = this.matchAnswers;
  }

  clearSlot(i: number) {
    delete this.matchAnswers[i];
    this.answers[this.currentIndex] = { ...this.matchAnswers };
    if (Object.keys(this.matchAnswers).length === 0) this.selectedAnswer = null;
  }

  resetMatch() {
    this.matchAnswers = {};
    this.answers[this.currentIndex] = null;
    this.selectedAnswer = null;
  }

  isOptionUsed(value: string): boolean {
    return Object.values(this.matchAnswers).includes(value);
  }

  /** True only when every pair slot is filled */
  private allMatchFilled(): boolean {
    const pairs = this.currentQuestion?.answer_data?.pairs ?? [];
    return pairs.length > 0 && pairs.every((_: any, i: number) => !!this.matchAnswers[i]);
  }

  // ─── Map pin ──────────────────────────────────────────────────────────────

  captureMapPin(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    const img       = container.querySelector('img') as HTMLImageElement;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const xPct = Math.min(Math.max(((event.clientX - rect.left) / rect.width)  * 100, 0), 100);
    const yPct = Math.min(Math.max(((event.clientY - rect.top)  / rect.height) * 100, 0), 100);

    this.mapPin = { xPct, yPct };
    this.answers[this.currentIndex] = { ...this.mapPin };
    this.selectedAnswer = this.mapPin;   // truthy → Next won't block
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  next() {
    const q = this.currentQuestion;

    // Validate before advancing
    if (q.question_type === 'match') {
      if (!this.allMatchFilled()) {
        this.messageService.add({ severity: 'warn', summary: 'Incomplete', detail: 'Please match all items before continuing', life: 2500 });
        return;
      }
    } else if (q.question_type === 'map') {
      if (!this.mapPin) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please click on the map to place your pin', life: 2500 });
        return;
      }
    } else {
      if (this.selectedAnswer === null || this.selectedAnswer === undefined) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select an answer', life: 2000 });
        return;
      }
    }

    if (this.isLastQuestion) {
      this.submitQuiz();
    } else {
      this.currentIndex++;
this.initQuestionState();
setTimeout(() => this.renderMath(), 50);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
   this.currentIndex--;
  this.initQuestionState();
  setTimeout(() => this.renderMath(), 50);
    }
  }

  // ─── Submit & grade ───────────────────────────────────────────────────────

  submitQuiz() {
    this.correctCount = 0;

    this.questions.forEach((q, i) => {
      const userAnswer = this.answers[i];
      const data       = q.answer_data;

      switch (q.question_type) {
        case 'mcq': {
          if (userAnswer === data?.correct) this.correctCount++;
          break;
        }
        case 'fill': {
          const student  = userAnswer?.toString().toLowerCase().trim() ?? '';
          const expected = data?.answer?.toString().toLowerCase().trim() ?? '';
          if (student === expected) this.correctCount++;
          break;
        }
        case 'match': {
          // userAnswer is a Record<number, string>; every slot must match
          const pairs    = data?.pairs ?? [];
          const allRight = pairs.every((p: any, idx: number) =>
            userAnswer && userAnswer[idx] === p.right
          );
          if (allRight) this.correctCount++;
          break;
        }
        case 'map': {
          // userAnswer is { xPct, yPct }; check distance against correct_pin
          const cp  = data?.correct_pin;
          const tol = data?.tolerance ?? 5;
          if (userAnswer && cp) {
            const dx = userAnswer.xPct - cp.xPct;
            const dy = userAnswer.yPct - cp.yPct;
            if (Math.sqrt(dx * dx + dy * dy) <= tol) this.correctCount++;
          }
          break;
        }
      }
    });

    this.scorePercent = Math.round((this.correctCount / this.questions.length) * 100);
    this.quizDone = true;
    setTimeout(() => this.renderMath(), 100);
    this.saveResult();
  }

  // ─── Save result ──────────────────────────────────────────────────────────

  saveResult() {
    const payload = {
      user_id:         this.currentUser?.id,
      school_id:       this.schoolId && this.schoolId !== 'null' ? parseInt(this.schoolId) : null,
      class_id:        parseInt(this.classId) || null,
      subject_id:      this.subjectId && this.subjectId !== 'all' ? parseInt(this.subjectId) : null,
      unit_id:         this.unitId && this.unitId !== 'all' ? parseInt(this.unitId) : null,
      total_questions: this.questions.length,
      correct_answers: this.correctCount,
      test_type:       this.quizMode === 'daily' ? 'daily_random' : 'subject_test'
    };

    this.http.post(`${this.api}/results`, payload).subscribe({
      next: () => console.log('Result saved ✅'),
      error: (err) => console.error('Failed to save result:', err)
    });
  }

  // ─── Retake / navigation ──────────────────────────────────────────────────

  retakeQuiz() {
    this.currentIndex   = 0;
    this.selectedAnswer = null;
    this.answers        = [];
    this.quizDone       = false;
    this.correctCount   = 0;
    this.scorePercent   = 0;
    this.matchAnswers   = {};
    this.shuffledRight  = [];
    this.shuffleCache   = {};
    this.mapPin         = null;
    this.loadQuestions();
  }

  goHome() { this.router.navigate(['/home']); }

  // ─── Score helpers ────────────────────────────────────────────────────────

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
  
  isCorrect(q: any, i: number): boolean {
  const userAnswer = this.answers[i];
  const data = q.answer_data;

  switch (q.question_type) {
    case 'mcq':
      return userAnswer === data.correct;

    case 'fill':
      return userAnswer?.toLowerCase().trim() ===
             data.answer?.toLowerCase().trim();

    case 'match':
      return data.pairs.every((p: any, idx: number) =>
        userAnswer?.[idx] === p.right
      );

    case 'map':
      return !!userAnswer; 

    default:
      return false;
  }
}

renderMath() {
  setTimeout(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetClear();   // 🔥 important
      (window as any).MathJax.typesetPromise();
    }
  }, 50);
}
}