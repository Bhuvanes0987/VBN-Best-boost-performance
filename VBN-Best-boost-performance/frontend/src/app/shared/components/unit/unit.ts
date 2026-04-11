import { Component, OnInit } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-unit',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule,
    DialogModule, ConfirmPopupModule, ToastModule, TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './unit.html'
})
export class UnitComponent implements OnInit {

  private api = environment.apiUrl;

  schools: any[] = [];
  subjects: any[] = [];
  units: any[] = [];

  selectedSchool: any = null;
  selectedSubject: any = null;

  // Form
  unitName = "";
  unitNumber: number = 1;
  showDialog = false;
  editMode = false;
  selectedId: number | null = null;

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  onSchoolChange() {
    this.selectedSubject = null;
    this.subjects = [];
    this.units = [];
    if (!this.selectedSchool) return;
    this.http.get(`${this.api}/subjects?school_id=${this.selectedSchool}`)
      .subscribe((res: any) => this.subjects = res.subjects);
  }

  onSubjectChange() {
    this.units = [];
    if (!this.selectedSubject) return;
    this.loadUnits();
  }

  loadUnits() {
    if (!this.selectedSubject) return;
    this.http.get(`${this.api}/subjects/${this.selectedSubject}/units`)
      .subscribe((res: any) => this.units = res.units);
  }

  getSubjectName(subjectId: number): string {
    const subject = this.subjects.find(s => s.id === subjectId);
    return subject ? subject.subject_name : '-';
  }

  openAdd() {
    if (!this.selectedSubject) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a subject first', life: 3000 });
      return;
    }
    this.unitName = "";
    this.unitNumber = this.units.length + 1;
    this.editMode = false;
    this.selectedId = null;
    this.showDialog = true;
  }

  editUnit(u: any) {
    this.editMode = true;
    this.selectedId = u.id;
    this.unitName = u.unit_name;
    this.unitNumber = u.unit_number;
    this.showDialog = true;
  }

  saveUnit() {
    if (!this.unitName.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Unit name is required', life: 3000 });
      return;
    }

    const payload = {
      unit_name: this.unitName,
      unit_number: this.unitNumber,
      subject_id: this.selectedSubject
    };

    if (this.editMode) {
      this.http.put(`${this.api}/units/${this.selectedId}`, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Unit updated', life: 3000 });
          this.loadUnits();
          this.showDialog = false;
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
      });
    } else {
      this.http.post(`${this.api}/units`, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Unit created', life: 3000 });
          this.loadUnits();
          this.showDialog = false;
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
      });
    }
  }

  confirmDelete(event: Event, id: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this unit?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete', rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.http.delete(`${this.api}/units/${id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Unit deleted', life: 3000 });
            this.loadUnits();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed', life: 3000 })
        });
      }
    });
  }
}