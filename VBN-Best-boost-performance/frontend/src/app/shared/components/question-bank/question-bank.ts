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
  @ViewChild('questionPreviewRef') questionPreviewRef!: ElementRef<HTMLElement>;
  matchOptions: string[] = [];
  private questionMathDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  private api = environment.apiUrl;
  currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  userPosition = Number(sessionStorage.getItem('position') || this.currentUser?.position || 0);
  canEditQuestionBank = this.userPosition === 1;

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
  // `selectedFileBase64` holds the data URL payload for upload; `selectedFilePreview` is a blob URL or data URL for preview
  selectedFileBase64: string | null = null;
  selectedFilePreview: string | null = null;
  selectedFileObject: File | null = null;

  // ─── Preview dialog ───────────────────────────────────────────────────────
  previewVisible:  boolean = false;
  previewQuestion: any     = null;
  previewImageSrc: string | null = null;
  private _previewObjectUrl: string | null = null;

  previewMCQSelected: number | null = null;
  previewFillAnswer   = '';
  previewMatchAnswers: Record<number, string> = {};
  previewDraggedValue  = '';
  previewDragOverSlot  = -1;
  previewShuffledRight: string[] = [];
  previewResult: boolean | null = null;
  previewCorrectDisplay = '';
  previewMapDialogVisible = false;

  // ─── Timer configuration (persisted in localStorage) ──────────────────────
  timerDialogVisible = false;
  timerConfig: { allSubjects: number; dailyTest: number } = { allSubjects: 20, dailyTest: 20 };
  // optional: store which question row opened the dialog (not required but kept)
  timerTargetQuestion: any = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadSchools();
    this.loadQuestions();
    this.loadTimerConfig();
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
  trackByIndex(index: number): number { return index; }

  getSchoolName(schoolId: number): string {
    const s = this.schools.find(s => s.id === schoolId);
    return s ? s.name : '-';
  }

  // ─── Map admin ────────────────────────────────────────────────────────────

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedFileObject = file;
    // Use object URL for preview and keep base64 in `selectedFileBase64` for upload payload
    try{
      if (this.selectedFilePreview && this.selectedFilePreview.startsWith('blob:')){
        try{ URL.revokeObjectURL(this.selectedFilePreview); }catch(e){}
      }
      const obj = URL.createObjectURL(file);
      this.selectedFilePreview = obj;
    }catch(e){
      this.selectedFilePreview = null;
    }

    const reader = new FileReader();
    reader.onload = () => { this.selectedFileBase64 = reader.result as string; };
    reader.readAsDataURL(file);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  saveQuestion(): any {
    // ensure map image base64 is ready before sending
    const ensureBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = (e) => reject(e);
      r.readAsDataURL(file);
    });

    if (this.questionType === 'map' && !this.selectedFileBase64 && this.selectedFileObject) {
      // synchronous wait before proceeding
      return ensureBase64(this.selectedFileObject).then((dataUrl) => {
        this.selectedFileBase64 = dataUrl;
        return this.saveQuestion();
      }).catch(() => { this.error('Failed to read image'); return; });
    }
    if (!this.canEditQuestionBank) { this.warn('Only admin can edit question bank'); return; }
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
    if (validPairs.length < 1) {
      this.warn('Add at least one match pair');
      return;
    }
    answer_data = {
      pairs: validPairs,
      options: this.matchOptions.filter(o => o.trim()) 
    };
  }
    if (this.questionType === 'map') {
      if (!this.selectedFileBase64 && !this.selectedFilePreview) { this.warn('Please upload a map image'); return; }
      const validPairs = this.pairs.filter(p => (p.left || '').trim() && (p.right || '').trim());
      if (validPairs.length < 1) {
        this.warn('Add at least one match pair for map');
        return;
      }
      answer_data = {
        pairs: validPairs,
        options: this.matchOptions.filter(o => o.trim())
      };
    }

    const sanitizedMapImage = this.selectedFileBase64 ? this.sanitizeDataUrl(this.selectedFileBase64) : null;
    const payload = {
      class_id:   this.selectedClass.id,
      subject_id: this.selectedSubject.id,
      unit_id:    this.selectedUnit?.id || null,
      school_id:  this.selectedSchool,
      type:       this.questionType,
    question: this.autoFormatMath(this.questionText),
      answer_data,
      map_image:  this.questionType === 'map' ? (sanitizedMapImage || this.selectedFileBase64) : null
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
    if (!this.canEditQuestionBank) { this.warn('Only admin can edit question bank'); return; }
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
    if (this.questionType === 'match') { this.pairs = data?.pairs?.length ? data.pairs.map((p: any) => ({ ...p })) : [{ left: '', right: '' }]; this.matchOptions = data?.options || [];  }
    if (this.questionType === 'map') {
      // normalize server-provided map_image into a data URL for preview and payload
      let img = q.map_image || null;
      if (img) {
        if (typeof img === 'string' && !img.startsWith('data:') && !img.startsWith('blob:')) {
          img = 'data:image/png;base64,' + img;
        }
        const sanitized = this.sanitizeDataUrl(img as string);
        this.selectedFileBase64 = sanitized || img;
        this.selectedFilePreview = sanitized || img;
      } else {
        this.selectedFileBase64 = null;
        this.selectedFilePreview = null;
      }
      this.pairs = data?.pairs?.length ? data.pairs.map((p: any) => ({ ...p })) : [{ left: '', right: '' }];
      this.matchOptions = data?.options || [];
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  confirmDelete(event: Event, id: number) {
    if (!this.canEditQuestionBank) { this.warn('Only admin can edit question bank'); return; }
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
    this.selectedFileBase64 = null;
    this.selectedFileObject = null;
    if (this.selectedFilePreview && this.selectedFilePreview.startsWith('blob:')){
      try{ URL.revokeObjectURL(this.selectedFilePreview); }catch(e){}
    }
    this.selectedFilePreview = null;
     this.matchOptions = []; 
  }

  openDrawer() {
    if (!this.canEditQuestionBank) { this.warn('Only admin can edit question bank'); return; }
    this.resetForm(); this.drawerVisible = true;
  }

  onTypeChange() {
    this.options = [{ text: '' }, { text: '' }]; this.correctOption = 0;
    this.pairs = [{ left: '', right: '' }]; this.fillAnswer = '';
    this.selectedFileBase64 = null;
    if (this.selectedFilePreview && this.selectedFilePreview.startsWith('blob:')){
      try{ URL.revokeObjectURL(this.selectedFilePreview); }catch(e){}
    }
    this.selectedFilePreview = null;
  }

  // ─── Preview ──────────────────────────────────────────────────────────────

  openPreview(q: any) {
    this.previewQuestion      = q;
    this.previewMCQSelected   = null;
    this.previewFillAnswer    = '';
    this.previewMatchAnswers  = {};
    this.previewDragOverSlot  = -1;
    this.previewDraggedValue  = '';
    this.previewResult        = null;
    this.previewCorrectDisplay = '';

    if (q.question_type === 'match' || q.question_type === 'map') {
        const rights = [
          ...(q.answer_data?.pairs ?? []).map((p: any) => p.right),
          ...(q.answer_data?.options ?? [])
        ];

        this.previewShuffledRight = this.shuffle(rights);
    }
    // normalize preview image source
    let img: string | null = q?.map_image || null;
    if (img) {
      if (typeof img === 'string' && !img.startsWith('data:') && !img.startsWith('blob:')) {
        img = 'data:image/png;base64,' + img;
      }
      const sanitized = this.sanitizeDataUrl(img);
      if (sanitized) {
        img = sanitized;
      }
    }
    // convert very large data: URLs into object URLs to avoid browser limits
    try{
      if (img && img.startsWith('data:')){
        const MAX_DATA_URL = 60000; // safe threshold below Chrome's 64KB cutoff
        if (img.length > MAX_DATA_URL){
          const blob = this.dataUrlToBlob(img);
          if (blob){
            if (this._previewObjectUrl){ try{ URL.revokeObjectURL(this._previewObjectUrl); }catch(e){} }
            this._previewObjectUrl = URL.createObjectURL(blob);
            this.previewImageSrc = this._previewObjectUrl;
          } else {
            this.previewImageSrc = img;
          }
        } else {
          this.previewImageSrc = img;
        }
      } else {
        this.previewImageSrc = img;
      }
    }catch(e){ this.previewImageSrc = img; }

    console.log('[preview] opening question', q?.id, 'previewImageSrc length', this.previewImageSrc?.length);
    this.previewVisible = true;
    setTimeout(() => this.renderMath(), 100);
  }

  closePreview() { this.previewVisible = false; this.previewQuestion = null; this.previewResult = null; }
  
  // revoke object URL when closing preview to avoid leaks
  closePreviewAndRevoke() {
    this.closePreview();
    this.previewMapDialogVisible = false;
    if (this._previewObjectUrl) {
      try{ URL.revokeObjectURL(this._previewObjectUrl); }catch(e){}
      this._previewObjectUrl = null;
    }
    this.previewImageSrc = null;
  }

  openPreviewMapDialog() {
    if (this.previewImageSrc) {
      this.previewMapDialogVisible = true;
    }
  }

  // revoke any object URL when preview modal closes
  ngOnDestroy(): void {
    if (this._previewObjectUrl) {
      try{ URL.revokeObjectURL(this._previewObjectUrl); }catch(e){}
      this._previewObjectUrl = null;
    }
    if (this.selectedFilePreview && this.selectedFilePreview.startsWith('blob:')){
      try{ URL.revokeObjectURL(this.selectedFilePreview); }catch(e){}
    }
  }

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
        const pairs = data?.pairs ?? [];
        if (!pairs.every((_: any, i: number) => !!this.previewMatchAnswers[i])) { this.warn('Please match all items'); return; }
        correct = pairs.every((p: any, i: number) => this.previewMatchAnswers[i] === p.right);
        if (!correct) this.previewCorrectDisplay = pairs.map((p: any) => `${p.left} → ${p.right}`).join(', ');
        break;
      }
    }
    this.previewResult = correct;
  }

  private dataUrlToBlob(dataUrl: string): Blob | null {
    try{
      const cleaned = this.sanitizeDataUrl(dataUrl);
      if (!cleaned) return null;
      const comma = cleaned.indexOf(',');
      const header = cleaned.substring(0, comma);
      const payload = cleaned.substring(comma + 1);
      const mimeMatch = header.match(/^data:([^;]+);/i);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(payload);
      const len = binary.length;
      const array = new Uint8Array(len);
      for (let i = 0; i < len; i++) array[i] = binary.charCodeAt(i);
      return new Blob([array], { type: mime });
    }catch(e){
      console.error('dataUrlToBlob failed', e);
      return null;
    }
  }

  private sanitizeDataUrl(input: string | null): string | null {
    if (!input) return null;
    let s = String(input).trim();
    // if missing header, assume png base64 payload
    if (!s.startsWith('data:')){
      if (/^[A-Za-z0-9+/=\s]+$/.test(s)) {
        s = 'data:image/png;base64,' + s;
      } else {
        return null;
      }
    }
    const comma = s.indexOf(',');
    if (comma === -1) return null;
    const header = s.substring(0, comma);
    let payload = s.substring(comma + 1);
    // remove trailing :<digits> artifacts and whitespace/newlines
    payload = payload.replace(/\s+/g, '').replace(/:\d+$/, '');
    // strip any non-base64 chars
    payload = payload.replace(/[^A-Za-z0-9+/=]/g, '');
    const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    if (!base64Regex.test(payload)) return null;
    return header + ',' + payload;
  }

  onPreviewImageLoad(ev: Event) {
    console.log('[preview] image loaded', { srcPreview: this.previewImageSrc?.slice?.(0,200), length: this.previewImageSrc?.length });
  }

  onPreviewImageError(ev: Event) {
    console.error('[preview] image failed to load', { srcPreview: this.previewImageSrc?.slice?.(0,200), length: this.previewImageSrc?.length });
    this.messageService.add({ severity: 'error', summary: 'Preview image failed', detail: 'Image did not load. Check console for src details.', life: 5000 });
  }

  onAdminPreviewImageLoad(ev: Event) {
    console.log('[admin preview] image loaded', { srcPreview: this.selectedFilePreview?.slice?.(0,200), length: this.selectedFilePreview?.length });
  }

  onAdminPreviewImageError(ev: Event) {
    console.error('[admin preview] image failed to load', { srcPreview: this.selectedFilePreview?.slice?.(0,200), length: this.selectedFilePreview?.length });
    this.messageService.add({ severity: 'error', summary: 'Admin preview failed', detail: 'Map preview failed to load. Check console for details.', life: 5000 });
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
  if (this.questionMathDebounceTimer) {
    clearTimeout(this.questionMathDebounceTimer);
  }

  this.questionMathDebounceTimer = setTimeout(() => {
    const mj = (window as any).MathJax;
    const previewEl = this.questionPreviewRef?.nativeElement;
    if (mj && previewEl) {
      mj.typesetPromise([previewEl]);
    }
  }, 250);
}
renderMath() {
  setTimeout(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise();
    }
  });
}
  // ─── Timer dialog methods ───────────────────────────────────────────────
  openTimerDialogFor(q: any) {
    this.timerTargetQuestion = q;
    // load stored config if any
    this.loadTimerConfig();
    this.timerDialogVisible = true;
  }

  openTimerDialog() {
    this.timerTargetQuestion = null;
    this.loadTimerConfig();
    this.timerDialogVisible = true;
  }

  saveTimerConfig() {
    try {
      const toStore = {
        allSubjects: Number(this.timerConfig.allSubjects) || 0,
        dailyTest: Number(this.timerConfig.dailyTest) || 0
      };
      localStorage.setItem('questionTimerConfig', JSON.stringify(toStore));
      this.timerConfig = toStore;
      this.timerDialogVisible = false;
      this.success('Timer settings saved');
    } catch (e) {
      this.error('Failed to save timer settings');
    }
  }

  loadTimerConfig() {
    try {
      const raw = localStorage.getItem('questionTimerConfig');
      if (raw) {
        const obj = JSON.parse(raw);
        this.timerConfig.allSubjects = obj.allSubjects ?? 20;
        this.timerConfig.dailyTest   = obj.dailyTest ?? 20;
      } else {
        this.timerConfig = { allSubjects: 20, dailyTest: 20 };
      }
    } catch {
      this.timerConfig = { allSubjects: 20, dailyTest: 20 };
    }
  }
  addMatchOption() {
    this.matchOptions.push('');
  }

  removeMatchOption(i: number) {
    this.matchOptions.splice(i, 1);
  }
  // ─── Toasts ───────────────────────────────────────────────────────────────

  private warn(d: string)    { this.messageService.add({ severity: 'warn',    summary: 'Required', detail: d, life: 3000 }); }
  private success(d: string) { this.messageService.add({ severity: 'success', summary: 'Success',  detail: d, life: 3000 }); }
  private error(d: string)   { this.messageService.add({ severity: 'error',   summary: 'Error',    detail: d, life: 3000 }); }
}