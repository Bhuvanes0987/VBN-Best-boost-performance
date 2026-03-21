import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuestionService } from '../../services/question.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [
    FormsModule, CommonModule, ButtonModule, DrawerModule,
    SelectModule, RadioButtonModule, InputTextModule, TableModule,
    ConfirmPopupModule, ToastModule, TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss'
})
export class QuestionBank implements OnInit {

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  private api = 'http://127.0.0.1:8900';

  drawerVisible = false;
  schools: any[] = [];
  classes: any[] = [];
  subjects: any[] = [];
  units: any[] = [];
  questions: any[] = [];
  editMode = false;
  selectedQuestionId: number | null = null;

  filterSchool: any = null;
  filterClass: any = null;
  filterSubject: any = null;
  filterUnit: any = null;
  filterClasses: any[] = [];
  filterSubjects: any[] = [];
  filterUnits: any[] = [];

  types = [
    { name: 'Choose (MCQ)', value: 'mcq' },
    { name: 'Fill Up', value: 'fill' },
    { name: 'Match', value: 'match' },
    { name: 'Map', value: 'map' }
  ];

  selectedSchool: any = null;
  selectedClass: any = null;
  selectedSubject: any = null;
  selectedUnit: any = null;
  questionType = '';
  questionText = '';
  options: any[] = [{ text: '' }, { text: '' }];
  correctOption = 0;
  pairs: any[] = [{ left: '', right: '' }];
  fillAnswer = '';
  selectedFile: any;

  ngOnInit() {
    this.loadSchools();
    this.loadQuestions();
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  loadQuestions() {
    let url = `${this.api}/questions`;
    const params: string[] = [];
    if (this.filterSchool)  params.push(`school_id=${this.filterSchool}`);
    if (this.filterClass)   params.push(`class_id=${this.filterClass}`);
    if (this.filterSubject) params.push(`subject_id=${this.filterSubject}`);
    if (this.filterUnit)    params.push(`unit_id=${this.filterUnit}`);
    if (params.length) url += '?' + params.join('&');

    this.questionService.getQuestions()
      .subscribe((res: any) => this.questions = res.questions);
  }

  onFilterSchoolChange() {
    this.filterClass = null; this.filterSubject = null; this.filterUnit = null;
    this.filterClasses = []; this.filterSubjects = []; this.filterUnits = [];
    if (!this.filterSchool) { this.loadQuestions(); return; }
    this.http.get(`${this.api}/classes?school_id=${this.filterSchool}`)
      .subscribe((res: any) => this.filterClasses = res.classes);
    this.loadQuestions();
  }

  onFilterClassChange() {
    this.filterSubject = null; this.filterUnit = null;
    this.filterSubjects = []; this.filterUnits = [];
    if (!this.filterClass) { this.loadQuestions(); return; }
    this.questionService.getSubjectsByClass(this.filterClass)
      .subscribe((res: any) => this.filterSubjects = res.subjects);
    this.loadQuestions();
  }

  onFilterSubjectChange() {
    this.filterUnit = null; this.filterUnits = [];
    if (!this.filterSubject) { this.loadQuestions(); return; }
    const subject = this.filterSubjects.find(s => s.id === this.filterSubject);
    this.filterUnits = subject?.units || [];
    this.loadQuestions();
  }

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

  getSchoolName(schoolId: number): string {
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : '-';
  }

  addOption() { this.options.push({ text: '' }); }
  removeOption(i: number) { if (this.options.length > 1) this.options.splice(i, 1); }
  addPair() { this.pairs.push({ left: '', right: '' }); }
  removePair(i: number) { if (this.pairs.length > 1) this.pairs.splice(i, 1); }
  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

  saveQuestion() {
    if (!this.selectedSchool) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a school', life: 3000 }); return;
    }
    if (!this.selectedClass) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a class', life: 3000 }); return;
    }
    if (!this.selectedSubject) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a subject', life: 3000 }); return;
    }
    if (!this.questionText.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Question text is required', life: 3000 }); return;
    }
    if (!this.questionType) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select question type', life: 3000 }); return;
    }

    let answer_data: any = {};
    if (this.questionType === 'mcq') {
      if (this.options.filter(o => o.text.trim()).length < 2) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Add at least 2 options', life: 3000 }); return;
      }
      answer_data = { options: this.options.map(o => o.text), correct: this.correctOption };
    }
    if (this.questionType === 'fill') {
      if (!this.fillAnswer.trim()) {
        this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Correct answer is required', life: 3000 }); return;
      }
      answer_data = { answer: this.fillAnswer };
    }
    if (this.questionType === 'match') {
      answer_data = { pairs: this.pairs };
    }

    const payload = {
      class_id: this.selectedClass.id,
      subject_id: this.selectedSubject.id,
      unit_id: this.selectedUnit?.id || null,
      school_id: this.selectedSchool,
      type: this.questionType,
      question: this.questionText,
      answer_data
    };

    if (this.editMode) {
      this.questionService.updateQuestion(this.selectedQuestionId!, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Question updated', life: 3000 });
          this.loadQuestions(); this.drawerVisible = false; this.resetForm();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Update failed', life: 3000 })
      });
    } else {
      this.questionService.createQuestion(payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Question added', life: 3000 });
          this.loadQuestions(); this.drawerVisible = false; this.resetForm();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
      });
    }
  }

  editQuestion(q: any) {
    this.drawerVisible = true;
    this.editMode = true;
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
            this.questionService.getSubjectsByClass(q.class_id)
              .subscribe((res2: any) => {
                this.subjects = res2.subjects;
                this.selectedSubject = this.subjects.find(s => s.id === q.subject_id) || null;
                this.units = this.selectedSubject?.units || [];
                this.selectedUnit = this.units.find(u => u.id === q.unit_id) || null;
              });
          }
        });
    }

    const data = q.answer_data;
    if (this.questionType === 'mcq') {
      this.options = data.options.map((o: any) => ({ text: o }));
      this.correctOption = data.correct;
    }
    if (this.questionType === 'fill') this.fillAnswer = data.answer;
    if (this.questionType === 'match') this.pairs = data.pairs;
  }

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
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Question deleted', life: 3000 });
            this.loadQuestions();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Delete failed', life: 3000 })
        });
      }
    });
  }

  resetForm() {
    this.editMode = false;
    this.selectedQuestionId = null;
    this.selectedSchool = null;
    this.selectedClass = null;
    this.selectedSubject = null;
    this.selectedUnit = null;
    this.classes = [];
    this.subjects = [];
    this.units = [];
    this.questionText = '';
    this.questionType = '';
    this.options = [{ text: '' }, { text: '' }];
    this.correctOption = 0;
    this.pairs = [{ left: '', right: '' }];
    this.fillAnswer = '';
    this.selectedFile = null;
  }

  openDrawer() {
    this.resetForm();
    this.drawerVisible = true;
  }

  onTypeChange() {
    this.options = [{ text: '' }, { text: '' }];
    this.correctOption = 0;
    this.pairs = [{ left: '', right: '' }];
    this.fillAnswer = '';
  }
}