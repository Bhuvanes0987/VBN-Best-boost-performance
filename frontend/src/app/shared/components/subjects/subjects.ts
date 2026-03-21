import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SubjectService } from '../../services/subject.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    FormsModule, CommonModule, TableModule, ButtonModule,
    MultiSelectModule, InputTextModule, DialogModule, SelectModule,
    ConfirmPopupModule, ToastModule, TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss'
})
export class Subjects implements OnInit {

  classes: any[] = [];
  subjects: any[] = [];
  schools: any[] = [];

  selectedClasses: any[] = [];
  selectedSchool: any = null;
  subjectName = "";
  editMode = false;
  selectedId: number | null = null;
  submitted = false;
  showDialog = false;

  units: Array<{ unit_name: string; unit_number: number }> = [
    { unit_name: '', unit_number: 1 }
  ];

  private api = 'http://127.0.0.1:8900';

  constructor(
    private subjectService: SubjectService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
  }

  get hasEmptyUnit(): boolean {
    return this.units.some(u => !u.unit_name.trim());
  }

  get unitCount(): number {
    return this.units.length;
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => {
        this.schools = res.schools;
        this.loadSubjects();
      });
  }

  onSchoolChange() {
    this.selectedClasses = [];
    this.classes = [];
    if (!this.selectedSchool) return;
    this.http.get(`${this.api}/classes?school_id=${this.selectedSchool}`)
      .subscribe((res: any) => this.classes = res.classes);
  }

  loadSubjects() {
    const url = this.selectedSchool
      ? `${this.api}/subjects?school_id=${this.selectedSchool}`
      : `${this.api}/subjects`;
    this.http.get(url).subscribe((res: any) => this.subjects = res.subjects);
  }

  getSchoolName(schoolId: number): string {
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : '-';
  }

  openAdd() {
    this.resetForm();
    this.showDialog = true;
  }

  addUnit() {
    this.units = [
      ...this.units,
      { unit_name: '', unit_number: this.units.length + 1 }
    ];
  }

  removeUnit(i: number) {
    if (this.units.length > 1) {
      this.units = this.units
        .filter((_, idx) => idx !== i)
        .map((u, idx) => ({ ...u, unit_number: idx + 1 }));
    }
  }

  updateUnitName(i: number, value: string) {
    this.units = this.units.map((u, idx) =>
      idx === i ? { ...u, unit_name: value } : u
    );
  }

  trackByIndex(index: number): number {
    return index;
  }

  addSubject() {
    this.submitted = true;

    if (!this.subjectName.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Subject name is required', life: 3000 });
      return;
    }
    if (!this.selectedSchool) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a school', life: 3000 });
      return;
    }
    if (this.selectedClasses.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Select at least one class', life: 3000 });
      return;
    }
    if (this.hasEmptyUnit) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'All unit names are required', life: 3000 });
      return;
    }

    const payload = {
      subject_name: this.subjectName,
      school_id: this.selectedSchool,
      class_ids: this.selectedClasses.map(c => c.id),
      units: this.units
    };

    if (this.editMode) {
      this.subjectService.updateSubject(this.selectedId!, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Subject updated successfully', life: 3000 });
          this.loadSubjects();
          this.showDialog = false;
          this.resetForm();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
      });
    } else {
      this.subjectService.createSubject(payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Subject created with units', life: 3000 });
          this.loadSubjects();
          this.showDialog = false;
          this.resetForm();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
      });
    }
  }

  editSubject(s: any) {
    this.editMode = true;
    this.selectedId = s.id;
    this.subjectName = s.subject_name;
    this.selectedSchool = s.school_id;

    if (s.school_id) {
      this.http.get(`${this.api}/classes?school_id=${s.school_id}`)
        .subscribe((res: any) => {
          this.classes = res.classes;
          this.selectedClasses = this.classes.filter(c =>
            s.classes.some((sc: any) => sc.id === c.id)
          );
        });
    }

    this.units = s.units?.length
      ? s.units.map((u: any) => ({
          unit_name: u.unit_name,
          unit_number: u.unit_number
        }))
      : [{ unit_name: '', unit_number: 1 }];

    this.showDialog = true;
  }

  deleteSubject(event: Event, id: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this subject and all its units?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.subjectService.deleteSubject(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Subject deleted', life: 3000 });
            this.loadSubjects();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Delete failed', life: 3000 })
        });
      }
    });
  }

  resetForm() {
    this.subjectName = "";
    this.selectedClasses = [];
    this.selectedSchool = null;
    this.editMode = false;
    this.selectedId = null;
    this.submitted = false;
    this.units = [{ unit_name: '', unit_number: 1 }];
    this.classes = [];
  }
}