import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuestionService } from '../../services/question.service';
import { HttpClient } from '@angular/common/http';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [
    FormsModule, CommonModule, ButtonModule, DrawerModule,
    SelectModule, MultiSelectModule, RadioButtonModule, InputTextModule,
    TableModule, ConfirmPopupModule, ToastModule, TooltipModule,
    TextareaModule, DialogModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss'
})
export class QuestionBank implements OnInit {

  @ViewChild('questionTextarea') questionTextareaRef!: ElementRef<HTMLTextAreaElement>;

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  private api = environment.apiUrl;

  // ─── Drawer ───────────────────────────────────────────────────────────────
  drawerVisible = false;
  editMode      = false;
  selectedQuestionId: number | null = null;

  // ─── Lists ────────────────────────────────────────────────────────────────
  schools:   any[] = [];
  classes:   any[] = [];
  subjects:  any[] = [];
  units:     any[] = [];
  questions: any[] = [];

  // ─── Multi-select filter state ────────────────────────────────────────────
  filterSchools:          number[] = [];
  filterSelectedClasses:  number[] = [];
  filterSelectedSubjects: number[] = [];
  filterSelectedUnits:    number[] = [];

  filterClasses:  any[] = [];
  filterSubjects: any[] = [];
  filterUnits:    any[] = [];

  // ─── Form state ───────────────────────────────────────────────────────────
  types = [
    { name: 'Choose (MCQ)', value: 'mcq' },
    { name: 'Fill Up',      value: 'fill' },
    { name: 'Match',        value: 'match' },
    { name: 'Map',          value: 'map' }
  ];

  selectedSchool:  any = null;
  selectedClass:   any = null;
  selectedSubject: any = null;
  selectedUnit:    any = null;
  questionType  = '';
  questionText  = '';
  options: any[] = [{ text: '' }, { text: '' }];
  correctOption = 0;
  pairs: any[]   = [{ left: '', right: '' }];
  fillAnswer     = '';
  selectedFile: string | null = null;
  correctMapPin: { x: number; y: number } | null = null;

  // ─── Preview dialog ───────────────────────────────────────────────────────
  previewVisible:  boolean = false;
  previewQuestion: any     = null;

  previewMCQSelected: number | null = null;
  previewFillAnswer   = '';
  previewMatchAnswers: Record<number, string> = {};
  previewDraggedValue  = '';
  previewDragOverSlot  = -1;
  previewShuffledRight: string[] = [];
  previewMapPin: { xPct: number; yPct: number } | null = null;
  previewResult: boolean | null = null;
  previewCorrectDisplay = '';

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadSchools();
    this.loadQuestions();
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  loadQuestions() {
    const params: string[] = [];
    if (this.filterSchools.length)          params.push(`school_id=${this.filterSchools.join(',')}`);
    if (this.filterSelectedClasses.length)  params.push(`class_id=${this.filterSelectedClasses.join(',')}`);
    if (this.filterSelectedSubjects.length) params.push(`subject_id=${this.filterSelectedSubjects.join(',')}`);
    if (this.filterSelectedUnits.length)    params.push(`unit_id=${this.filterSelectedUnits.join(',')}`);

    const url = params.length
      ? `${this.api}/questions?${params.join('&')}`
      : `${this.api}/questions`;

    this.http.get(url)
    .subscribe((res: any) => {
      this.questions = res.questions;
      setTimeout(() => this.renderMath(), 100);
    });  }

  // ─── Multi-select filter handlers ─────────────────────────────────────────

  onFilterSchoolChange() {
    this.filterSelectedClasses  = [];
    this.filterSelectedSubjects = [];
    this.filterSelectedUnits    = [];
    this.filterClasses  = [];
    this.filterSubjects = [];
    this.filterUnits    = [];

    if (!this.filterSchools.length) { this.loadQuestions(); return; }

    // Load classes for all selected schools
    const requests = this.filterSchools.map(id =>
      this.http.get(`${this.api}/classes?school_id=${id}`).toPromise()
    );
    Promise.all(requests).then(results => {
      const all: any[] = [];
      results.forEach((res: any) => all.push(...(res?.classes ?? [])));
      // Deduplicate by id
      this.filterClasses = all.filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
    });

    this.loadQuestions();
  }

  onFilterClassChange() {
    this.filterSelectedSubjects = [];
    this.filterSelectedUnits    = [];
    this.filterSubjects = [];
    this.filterUnits    = [];

    if (!this.filterSelectedClasses.length) { this.loadQuestions(); return; }

    const requests = this.filterSelectedClasses.map(id =>
      this.questionService.getSubjectsByClass(id).toPromise()
    );
    Promise.all(requests).then(results => {
      const all: any[] = [];
      results.forEach((res: any) => all.push(...(res?.subjects ?? [])));
      this.filterSubjects = all.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);
    });

    this.loadQuestions();
  }

  onFilterSubjectChange() {
    this.filterSelectedUnits = [];
    this.filterUnits = [];

    if (!this.filterSelectedSubjects.length) { this.loadQuestions(); return; }

    const allUnits: any[] = [];
    this.filterSelectedSubjects.forEach(sid => {
      const subj = this.filterSubjects.find(s => s.id === sid);
      if (subj?.units) allUnits.push(...subj.units);
    });
    this.filterUnits = allUnits.filter((u, i, a) => a.findIndex(x => x.id === u.id) === i);

    this.loadQuestions();
  }

  clearFilters() {
    this.filterSchools          = [];
    this.filterSelectedClasses  = [];
    this.filterSelectedSubjects = [];
    this.filterSelectedUnits    = [];
    this.filterClasses  = [];
    this.filterSubjects = [];
    this.filterUnits    = [];
    this.loadQuestions();
  }

  // ─── Drawer cascades ──────────────────────────────────────────────────────

  onSchoolChange() {
    this.selectedClass = null; this.selectedSubject = null; this.selectedUnit = null;
    this.classes = []; this.subjects = []; this.units = [];
    if (!this.selectedSchool) return;
    this.http.get(`${this.api}/classes?school_id=${this.selectedSchool}`)
      .subscribe((res: any) => this.classes = res.classes);
  }

  onClassChange() {
    this.selectedSubject = null; this.selectedUnit = null;
    this.subjects = []; this.units = [];
    if (!this.selectedClass) return;
    this.questionService.getSubjectsByClass(this.selectedClass.id)
      .subscribe((res: any) => this.subjects = res.subjects);
  }

  onSubjectChange() {
    this.selectedUnit = null;
    this.units = this.selectedSubject?.units || [];
  }

  // ─── Symbol insert ────────────────────────────────────────────────────────

  insertSymbol(symbol: string) {
    const el = this.questionTextareaRef?.nativeElement;
    if (el) {
      const start = el.selectionStart ?? this.questionText.length;
      const end   = el.selectionEnd   ?? this.questionText.length;
      this.questionText = this.questionText.slice(0, start) + symbol + this.questionText.slice(end);
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + symbol.length; el.focus(); }, 0);
    } else {
      this.questionText = (this.questionText || '') + symbol;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  addOption()             { this.options.push({ text: '' }); }
  removeOption(i: number) { if (this.options.length > 1) this.options.splice(i, 1); }
  addPair()               { this.pairs.push({ left: '', right: '' }); }
  removePair(i: number)   { if (this.pairs.length > 1) this.pairs.splice(i, 1); }

  getSchoolName(schoolId: number): string {
    const s = this.schools.find(s => s.id === schoolId);
    return s ? s.name : '-';
  }

  // ─── Map admin ────────────────────────────────────────────────────────────

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.selectedFile = reader.result as string; this.correctMapPin = null; };
    reader.readAsDataURL(file);
  }

  captureCorrectMapPin(event: MouseEvent) {
    const wrapper = event.currentTarget as HTMLElement;
    const img     = wrapper.querySelector('img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    // Clamp to image bounds
    const x = Math.min(Math.max(((event.clientX - rect.left) / rect.width)  * 100, 0), 100);
    const y = Math.min(Math.max(((event.clientY - rect.top)  / rect.height) * 100, 0), 100);
    this.correctMapPin = { x, y };
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  saveQuestion() {
    if (!this.selectedSchool)      { this.warn('Please select a school');      return; }
    if (!this.selectedClass)       { this.warn('Please select a class');       return; }
    if (!this.selectedSubject)     { this.warn('Please select a subject');     return; }
    if (!this.questionText.trim()) { this.warn('Question text is required');   return; }
    if (!this.questionType)        { this.warn('Please select question type'); return; }

    let answer_data: any = {};

    if (this.questionType === 'mcq') {
      if (this.options.filter(o => o.text.trim()).length < 2) { this.warn('Add at least 2 options'); return; }
      answer_data = { options: this.options.map(o => o.text), correct: this.correctOption };
    }
    if (this.questionType === 'fill') {
      if (!this.fillAnswer.trim()) { this.warn('Correct answer is required'); return; }
      answer_data = { answer: this.fillAnswer };
    }
    if (this.questionType === 'match') {
      const validPairs = this.pairs.filter(p => (p.left || '').trim() && (p.right || '').trim());
      if (validPairs.length < 1) { this.warn('Add at least one match pair'); return; }
      answer_data = { pairs: validPairs };
    }
    if (this.questionType === 'map') {
      if (!this.selectedFile) { this.warn('Please upload a map image'); return; }
      answer_data = {
        correct_pin: this.correctMapPin ? { xPct: this.correctMapPin.x, yPct: this.correctMapPin.y } : null,
        tolerance: 5
      };
    }

    const payload = {
      class_id:   this.selectedClass.id,
      subject_id: this.selectedSubject.id,
      unit_id:    this.selectedUnit?.id || null,
      school_id:  this.selectedSchool,
      type:       this.questionType,
    question: this.autoFormatMath(this.questionText),
      answer_data,
      map_image:  this.questionType === 'map' ? this.selectedFile : null
    };

    if (this.editMode) {
      this.questionService.updateQuestion(this.selectedQuestionId!, payload).subscribe({
        next: () => { this.success('Question updated'); this.loadQuestions(); this.drawerVisible = false; this.resetForm(); },
        error: (err) => this.error(err.error?.message || 'Update failed')
      });
    } else {
      this.questionService.createQuestion(payload).subscribe({
        next: () => { this.success('Question added'); this.loadQuestions(); this.drawerVisible = false; this.resetForm(); },
        error: (err) => this.error(err.error?.message || 'Failed')
      });
    }
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────

  editQuestion(q: any) {
    this.resetForm();
    this.drawerVisible = true; this.editMode = true;
    this.selectedQuestionId = q.id;
    this.questionText = q.question_text;
    this.questionType = q.question_type;
    this.selectedSchool = q.school_id;

    if (q.school_id) {
      this.http.get(`${this.api}/classes?school_id=${q.school_id}`)
        .subscribe((res: any) => {
          this.classes = res.classes;
          this.selectedClass = this.classes.find(c => c.id === q.class_id) || null;
          if (q.class_id) {
            this.questionService.getSubjectsByClass(q.class_id).subscribe((res2: any) => {
              this.subjects = res2.subjects;
              this.selectedSubject = this.subjects.find(s => s.id === q.subject_id) || null;
              this.units = this.selectedSubject?.units || [];
              this.selectedUnit = this.units.find((u: any) => u.id === q.unit_id) || null;
            });
          }
        });
    }

    const data = q.answer_data;
    if (this.questionType === 'mcq')   { this.options = data.options.map((o: any) => ({ text: o })); this.correctOption = data.correct; }
    if (this.questionType === 'fill')  { this.fillAnswer = data.answer; }
    if (this.questionType === 'match') { this.pairs = data?.pairs?.length ? data.pairs.map((p: any) => ({ ...p })) : [{ left: '', right: '' }]; }
    if (this.questionType === 'map') {
      this.selectedFile  = q.map_image || null;
      this.correctMapPin = data?.correct_pin ? { x: data.correct_pin.xPct, y: data.correct_pin.yPct } : null;
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  confirmDelete(event: Event, id: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this question?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete', rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.questionService.deleteQuestion(id).subscribe({
          next: () => { this.success('Question deleted'); this.loadQuestions(); },
          error: (err) => this.error(err.error?.message || 'Delete failed')
        });
      }
    });
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  resetForm() {
    this.editMode = false; this.selectedQuestionId = null;
    this.selectedSchool = null; this.selectedClass = null;
    this.selectedSubject = null; this.selectedUnit = null;
    this.classes = []; this.subjects = []; this.units = [];
    this.questionText = ''; this.questionType = '';
    this.options = [{ text: '' }, { text: '' }]; this.correctOption = 0;
    this.pairs = [{ left: '', right: '' }]; this.fillAnswer = '';
    this.selectedFile = null; this.correctMapPin = null;
  }

  openDrawer() { this.resetForm(); this.drawerVisible = true; }

  onTypeChange() {
    this.options = [{ text: '' }, { text: '' }]; this.correctOption = 0;
    this.pairs = [{ left: '', right: '' }]; this.fillAnswer = '';
    this.selectedFile = null; this.correctMapPin = null;
  }

  // ─── Preview ──────────────────────────────────────────────────────────────

  openPreview(q: any) {
    this.previewQuestion      = q;
    this.previewMCQSelected   = null;
    this.previewFillAnswer    = '';
    this.previewMatchAnswers  = {};
    this.previewDragOverSlot  = -1;
    this.previewDraggedValue  = '';
    this.previewMapPin        = null;
    this.previewResult        = null;
    this.previewCorrectDisplay = '';

    if (q.question_type === 'match') {
      const rights: string[] = (q.answer_data?.pairs ?? []).map((p: any) => p.right);
      this.previewShuffledRight = this.shuffle([...rights]);
    }
    this.previewVisible = true;
    setTimeout(() => this.renderMath(), 100);
  }

  closePreview() { this.previewVisible = false; this.previewQuestion = null; this.previewResult = null; }

  selectPreviewMCQ(i: number) { this.previewMCQSelected = i; this.previewResult = null; }

  onPreviewDragStart(event: DragEvent, value: string) {
    this.previewDraggedValue = value;
    event.dataTransfer?.setData('text/plain', value);
  }
  onPreviewDragOver(event: DragEvent, slotIndex: number) { event.preventDefault(); this.previewDragOverSlot = slotIndex; }
  onPreviewDragLeave() { this.previewDragOverSlot = -1; }
  onPreviewDrop(event: DragEvent, slotIndex: number) {
    event.preventDefault(); this.previewDragOverSlot = -1;
    const value = event.dataTransfer?.getData('text/plain') || this.previewDraggedValue;
    if (!value) return;
    Object.keys(this.previewMatchAnswers).forEach(k => { if (this.previewMatchAnswers[+k] === value) delete this.previewMatchAnswers[+k]; });
    this.previewMatchAnswers[slotIndex] = value;
    this.previewDraggedValue = ''; this.previewResult = null;
  }
  clearPreviewSlot(i: number) { delete this.previewMatchAnswers[i]; this.previewResult = null; }
  resetPreviewMatch() { this.previewMatchAnswers = {}; this.previewResult = null; }
  isPreviewOptionUsed(value: string): boolean { return Object.values(this.previewMatchAnswers).includes(value); }

  capturePreviewMapPin(event: MouseEvent) {
    const wrapper = event.currentTarget as HTMLElement;
    const img     = wrapper.querySelector('img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const xPct = Math.min(Math.max(((event.clientX - rect.left) / rect.width)  * 100, 0), 100);
    const yPct = Math.min(Math.max(((event.clientY - rect.top)  / rect.height) * 100, 0), 100);
    this.previewMapPin = { xPct, yPct };
    this.previewResult = null;
  }

  checkPreviewAnswer() {
    const q = this.previewQuestion; const data = q.answer_data;
    let correct = false; this.previewCorrectDisplay = '';

    switch (q.question_type) {
      case 'mcq': {
        if (this.previewMCQSelected === null) { this.warn('Please select an option'); return; }
        correct = this.previewMCQSelected === data?.correct;
        if (!correct) this.previewCorrectDisplay = data?.options?.[data?.correct] ?? '';
        break;
      }
      case 'fill': {
        if (!this.previewFillAnswer.trim()) { this.warn('Please type your answer'); return; }
        correct = this.previewFillAnswer.trim().toLowerCase() === (data?.answer ?? '').trim().toLowerCase();
        if (!correct) this.previewCorrectDisplay = data?.answer ?? '';
        break;
      }
      case 'match': {
        const pairs = data?.pairs ?? [];
        if (!pairs.every((_: any, i: number) => !!this.previewMatchAnswers[i])) { this.warn('Please match all items'); return; }
        correct = pairs.every((p: any, i: number) => this.previewMatchAnswers[i] === p.right);
        if (!correct) this.previewCorrectDisplay = pairs.map((p: any) => `${p.left} → ${p.right}`).join(', ');
        break;
      }
      case 'map': {
        if (!this.previewMapPin) { this.warn('Please click on the map to place your pin'); return; }
        const cp = data?.correct_pin; const tol = data?.tolerance ?? 5;
        if (cp) {
          const dx = this.previewMapPin.xPct - cp.xPct;
          const dy = this.previewMapPin.yPct - cp.yPct;
          correct  = Math.sqrt(dx * dx + dy * dy) <= tol;
        }
        if (!correct) this.previewCorrectDisplay = 'The correct location is marked on the map by the teacher.';
        break;
      }
    }
    this.previewResult = correct;
  }

  // ─── Shuffle / badge ──────────────────────────────────────────────────────

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  previewBadgeStyle(type: string): Record<string, string> {
    const map: Record<string, Record<string, string>> = {
      mcq:   { background: 'rgba(139,92,246,0.2)', color: '#a78bfa' },
      fill:  { background: 'rgba(59,130,246,0.2)',  color: '#93c5fd' },
      match: { background: 'rgba(249,115,22,0.2)',  color: '#fdba74' },
      map:   { background: 'rgba(34,197,94,0.2)',   color: '#86efac' }
    };
    return map[type] ?? {};
  }
  
  autoFormatMath(text: string): string {
  if (!text) return '';
  if (text.includes('\\(') || text.includes('\\begin')) {
    return text;
  }

  text = text.replace(/\[([^\]]+)\]/g, (match, content) => {
    const rows = content.split(';')
      .map((row: string) =>
        row.trim().split(/\s+/).join(' & ')
      )
      .join(' \\\\ ');

    return `\\(\\begin{bmatrix}${rows}\\end{bmatrix}\\)`;
  });

  return text;
}
onQuestionChange() {
  setTimeout(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise();
    }
  }, 50);
}
renderMath() {
  setTimeout(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise();
    }
  });
}

  // ─── Toasts ───────────────────────────────────────────────────────────────

  private warn(d: string)    { this.messageService.add({ severity: 'warn',    summary: 'Required', detail: d, life: 3000 }); }
  private success(d: string) { this.messageService.add({ severity: 'success', summary: 'Success',  detail: d, life: 3000 }); }
  private error(d: string)   { this.messageService.add({ severity: 'error',   summary: 'Error',    detail: d, life: 3000 }); }
}