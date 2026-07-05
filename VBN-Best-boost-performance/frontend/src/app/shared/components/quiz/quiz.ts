import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule,
    DialogModule, RadioButtonModule, ProgressBarModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './quiz.html'
})
export class Quiz implements OnInit, OnDestroy {

  private api = 'http://127.0.0.1:8900';
  // production
  // private api = '/api';
  currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

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
  /** slotIndex → right-label the student dropped (stores {id,text}) */
  matchAnswers: Record<number, { id: string; text: string }> = {};
  draggedValue: { id: string; text: string } | null = null;
  dragOverSlot  = -1;
  /** Shuffled Column-B options, built once per question */
  shuffledRight: Array<{ id: string; text: string }> = [];

  // ── Map pin state ────────────────────────────────────────────────────────
  mapPin: { xPct: number; yPct: number } | null = null;
  currentMapImageSrc: string | null = null;
  mapPreviewDialogVisible = false;
  private currentMapImageObjectUrl: string | null = null;
  private readonly MAX_MAP_DATA_URL_LENGTH = 60000;

  // ── Timer state ──────────────────────────────────────────────────────────
  timerSecondsRemaining: number = 0;
  timerInterval: any = null;
  timerRunning: boolean = false;
  timerConfig: { allSubjects: number; dailyTest: number } = { allSubjects: 20, dailyTest: 20 };
  // storage key for persisting timer across reloads
  private timerStorageKey: string | null = null;

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
    this.loadTimerConfig();
    this.loadQuestions();
  }

  private getTimerStorageKey(): string {
    const uid = this.currentUser?.id ?? 'anon';
    return `quizTimer_${uid}_${this.quizMode}_${this.classId}_${this.subjectId}_${this.unitId}`;
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  loadQuestions() {
    this.loading     = true;
    this.noQuestions = false;

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
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
        console.group('[Quiz] Loaded questions');
        this.questions.forEach((q: any, idx: number) => {
          console.log(`Q${idx + 1}: id=${q.id} type=${q.question_type} map_image=${q.map_image ? 'present' : 'missing'}`);
        });
        console.groupEnd();
        this.initQuestionState();
        setTimeout(() => this.renderMath(), 100);
        // start or resume timer for this quiz
        this.timerStorageKey = this.getTimerStorageKey();
        this.startTimerForMode();
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
    this.revokeMapObjectUrl();
    this.currentMapImageSrc = null;

    const q = this.currentQuestion;
    if (!q) return;

    const saved = this.answers[this.currentIndex];

    if (q.question_type === 'match' || q.question_type === 'map') {
      // Build shuffled Column B once per question (cache it)
      if (!this.shuffleCache[this.currentIndex]) {
        const rights: string[] = [
          ...(q.answer_data?.pairs ?? []).map((p: any) => p.right),
          ...(q.answer_data?.options ?? [])
        ];
        // Create distinct instances for duplicate texts so UI treats them separately
        const instances = rights.map((r: string, idx: number) => ({ id: `${q.id}_${idx}`, text: r }));
        this.shuffleCache[this.currentIndex] = this.shuffle(instances as any) as any;
        // Debug: expose original and shuffled counts for troubleshooting
        console.debug('[Quiz] Column B rights (original count=%d, unique=%d):', rights.length, new Set(rights).size, rights);
        console.debug('[Quiz] Shuffled Column B for question %s =>', q.id, this.shuffleCache[this.currentIndex]);
      }
      this.shuffledRight = this.shuffleCache[this.currentIndex] as any;
      // Backwards-compat: saved matchAnswers may be plain strings from older versions.
      if (saved) {
        const restored: Record<number, { id: string; text: string }> = {};
        Object.keys(saved).forEach(k => {
          const v = (saved as any)[k];
          if (v && typeof v === 'string') {
            restored[+k] = { id: `${q.id}_restored_${k}`, text: v };
          } else if (v && typeof v === 'object') {
            restored[+k] = v;
          }
        });
        this.matchAnswers = restored;
      } else {
        this.matchAnswers = {};
      }
    } else {
      this.shuffledRight = [];
      this.matchAnswers = {};
    }

    if (q.question_type === 'map') {
      this.currentMapImageSrc = this.normalizeMapImage(q.map_image);
      console.group('[Quiz] Current map question');
      console.log('question id:', q.id);
      console.log('raw map_image present:', !!q.map_image);
      console.log('raw map_image type:', typeof q.map_image);
      console.log('normalized map image src length:', this.currentMapImageSrc ? this.currentMapImageSrc.length : 'null');
      console.log('normalized map image src preview:', this.currentMapImageSrc ? this.currentMapImageSrc.slice(0, 80) : 'null');
      console.groupEnd();
    } else {
      this.currentMapImageSrc = null;
    }

    this.selectedAnswer = (q.question_type === 'match' || q.question_type === 'map')
      ? (Object.keys(this.matchAnswers).length ? this.matchAnswers : null)
      : (saved ?? null);
  }

  // Cache so Column B doesn't re-shuffle when navigating back
  private shuffleCache: Record<number, any[]> = {};

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get currentQuestion() { return this.questions[this.currentIndex]; }

  private normalizeMapImage(raw: string | null): string | null {
    if (!raw || typeof raw !== 'string') return null;
    let img = raw.trim();
    if (!img.startsWith('data:') && !img.startsWith('blob:')) {
      img = 'data:image/png;base64,' + img;
    }
    img = img.replace(/\s+/g, '').replace(/:\d+$/, '');

    const comma = img.indexOf(',');
    if (comma < 0) return null;

    const header = img.substring(0, comma);
    let payload = img.substring(comma + 1);
    payload = payload.replace(/[^A-Za-z0-9+/=]/g, '');

    const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    if (!base64Regex.test(payload)) return null;

    const dataUrl = `${header},${payload}`;
    if (dataUrl.length > this.MAX_MAP_DATA_URL_LENGTH) {
      return this.createMapObjectUrl(dataUrl) || dataUrl;
    }
    return dataUrl;
  }

  private createMapObjectUrl(dataUrl: string): string | null {
    const blob = this.dataUrlToBlob(dataUrl);
    if (!blob) return null;

    if (this.currentMapImageObjectUrl) {
      try { URL.revokeObjectURL(this.currentMapImageObjectUrl); } catch {}
      this.currentMapImageObjectUrl = null;
    }
    this.currentMapImageObjectUrl = URL.createObjectURL(blob);
    return this.currentMapImageObjectUrl;
  }

  private revokeMapObjectUrl(): void {
    if (this.currentMapImageObjectUrl) {
      try { URL.revokeObjectURL(this.currentMapImageObjectUrl); } catch {}
      this.currentMapImageObjectUrl = null;
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob | null {
    try {
      const comma = dataUrl.indexOf(',');
      if (comma < 0) return null;
      const payload = dataUrl.substring(comma + 1);
      const mimeMatch = dataUrl.substring(0, comma).match(/^data:([^;]+);/i);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(payload);
      const len = binary.length;
      const array = new Uint8Array(len);
      for (let i = 0; i < len; i++) array[i] = binary.charCodeAt(i);
      return new Blob([array], { type: mime });
    } catch (e) {
      console.error('Quiz dataUrlToBlob failed', e);
      return null;
    }
  }

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

  onDragStart(event: DragEvent, value: { id: string; text: string }) {
    this.draggedValue = value;
    try {
      event.dataTransfer?.setData('application/json', JSON.stringify(this.draggedValue));
    } catch {
      event.dataTransfer?.setData('text/plain', this.draggedValue.text);
    }
  }

  onDragOver(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    this.dragOverSlot = slotIndex;
  }

  onDragLeave() { this.dragOverSlot = -1; }

  onDrop(event: DragEvent, slotIndex: number) {
    event.preventDefault();
    this.dragOverSlot = -1;
    const raw = event.dataTransfer?.getData('application/json') || event.dataTransfer?.getData('text/plain') || JSON.stringify(this.draggedValue || {});
    let obj: { id: string; text: string } | null = null;
    try { obj = JSON.parse(raw); } catch { obj = { id: `tmp_${Date.now()}`, text: raw } as any; }
    if (!obj || !obj.text) return;

    // Remove same instance id from any other slot first
    Object.keys(this.matchAnswers).forEach(k => {
      if (this.matchAnswers[+k]?.id === obj!.id) delete this.matchAnswers[+k];
    });

    this.matchAnswers[slotIndex] = obj;
    this.draggedValue = null;

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
    // value may be an id (preferred) or the label text; consider both
    return Object.values(this.matchAnswers).some(v => v && (v.id === value || v.text === value));
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

  openMapPreviewDialog() {
    if (this.currentMapImageSrc) {
      this.mapPreviewDialogVisible = true;
    }
  }

  clearMapPin() {
    this.mapPin = null;
    this.selectAnswer(null);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  next() {
    const q = this.currentQuestion;

    // Validate before advancing
    if (q.question_type === 'match' || q.question_type === 'map') {
      if (!this.allMatchFilled()) {
        this.messageService.add({ severity: 'warn', summary: 'Incomplete', detail: 'Please match all items before continuing', life: 2500 });
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
    // stop the countdown and clear persisted state when submitting
    this.stopTimer();
    this.clearTimerState();
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
          // userAnswer is a Record<number, {id,text}>; every slot must match by text
          const pairs    = data?.pairs ?? [];
          const allRight = pairs.every((p: any, idx: number) =>
            userAnswer && userAnswer[idx] && userAnswer[idx].text === p.right
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
      next: () => {
  if (this.quizMode === 'daily') {
      localStorage.setItem('dailyQuizTaken', 'true');
  }

  console.log('Result saved ✅');
},
      error: (err) => console.error('Failed to save result:', err)
    });
  }

  // ─── Retake / navigation ──────────────────────────────────────────────────

  retakeQuiz() {
    this.clearTimerState();
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

  // When user navigates back to home explicitly, clear persisted timer
  goHomeAndClearTimer() {
    this.clearTimerState();
    this.router.navigate(['/home']);
  }

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
        (userAnswer?.[idx]?.text ?? userAnswer?.[idx]) === p.right
      );

    case 'map': {
      const cp = data?.correct_pin;
      const tol = data?.tolerance ?? 5;
      if (!userAnswer || !cp) return false;
      const dx = userAnswer.xPct - cp.xPct;
      const dy = userAnswer.yPct - cp.yPct;
      return Math.sqrt(dx * dx + dy * dy) <= tol;
    }

    default:
      return false;
  }
}

  // Helper to detect if a value is an image URL or data URL
  isImage(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    const v = value.trim();
    if (v.startsWith('data:image')) return true;
    if (/\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(v)) return true;
    if (/^https?:\/\/.+\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(v)) return true;
    return false;
  }

  // Compute Column B options for review (pairs' right values + any extra options)
  reviewOptions(q: any): string[] {
    const rights = (q?.answer_data?.pairs || []).map((p: any) => p.right || '');
    const extras = q?.answer_data?.options || [];
    return [...rights, ...extras];
  }

renderMath() {
  setTimeout(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetClear();   // 🔥 important
      (window as any).MathJax.typesetPromise();
    }
  }, 50);
}


  // ─── Timer helpers ──────────────────────────────────────────────────────
  loadTimerConfig() {
    try {
      const raw = localStorage.getItem('questionTimerConfig');
      if (raw) {
        const obj = JSON.parse(raw);
        this.timerConfig.allSubjects = obj.allSubjects ?? 20;
        this.timerConfig.dailyTest   = obj.dailyTest ?? 20;
      }
    } catch {
      // keep defaults
    }
  }

  startTimerForMode() {
    // clear any existing interval but DO NOT clear persisted state here
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }

    // try to resume from persisted expiresAt
    const key = this.timerStorageKey || this.getTimerStorageKey();
    let expiresAt: number | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        expiresAt = typeof obj.expiresAt === 'number' ? obj.expiresAt : null;
      }
    } catch { expiresAt = null; }

    if (expiresAt && expiresAt > Date.now()) {
      // resume
      this.timerSecondsRemaining = Math.ceil((expiresAt - Date.now()) / 1000);
    } else if (expiresAt && expiresAt <= Date.now()) {
      // timer already expired while away — submit immediately
      this.timerSecondsRemaining = 0;
      this.messageService.add({ severity: 'warn', summary: 'Time Up', detail: 'Time expired while you were away — submitting', life: 4000 });
      this.submitQuiz();
      return;
    } else {
      // no persisted state — start fresh from config
      const minutes = this.quizMode === 'daily' ? (this.timerConfig.dailyTest || 20) : (this.timerConfig.allSubjects || 20);
      this.timerSecondsRemaining = Math.max(0, Math.floor(minutes) * 60);
      // persist expiry
      const newExpires = Date.now() + this.timerSecondsRemaining * 1000;
      try { localStorage.setItem(key, JSON.stringify({ expiresAt: newExpires })); } catch {}
    }

    if (this.timerSecondsRemaining > 0) {
      this.timerRunning = true;
      // ensure storage key is set
      this.timerStorageKey = key;
      this.timerInterval = setInterval(() => {
        this.timerSecondsRemaining--;
        // update persisted expiry occasionally (every 5 seconds)
        if (this.timerSecondsRemaining % 5 === 0) {
          try {
            const expires = Date.now() + this.timerSecondsRemaining * 1000;
            localStorage.setItem(this.timerStorageKey!, JSON.stringify({ expiresAt: expires }));
          } catch {}
        }
        if (this.timerSecondsRemaining <= 0) {
          this.clearTimerState();
          this.stopTimer();
          this.messageService.add({ severity: 'warn', summary: 'Time Up', detail: 'Time is up — submitting your answers', life: 4000 });
          this.submitQuiz();
        }
      }, 1000);
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerRunning = false;
    // do not clear persisted state here by default; keep it until submission
  }

  clearTimerState() {
    try {
      const key = this.timerStorageKey || this.getTimerStorageKey();
      localStorage.removeItem(key);
    } catch {}
  }

  formatTimer(): string {
    const s = Math.max(0, this.timerSecondsRemaining || 0);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  ngOnDestroy() {
    this.stopTimer();
    this.revokeMapObjectUrl();
  }
}