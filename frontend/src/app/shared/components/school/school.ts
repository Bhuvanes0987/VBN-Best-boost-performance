import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-school',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    InputTextModule, DialogModule, ConfirmPopupModule,
    ToastModule, TooltipModule, FormsModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './school.html'
})
export class School implements OnInit {

  private api = 'http://127.0.0.1:8900';

  schools: any[] = [];
  schoolName = "";
  schoolCode = "";
  showDialog = false;
  editMode = false;
  selectedId: number | null = null;
  searchText: string = '';
filteredSchools: any[] = [];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
  }

  toast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }

loadSchools() {
  this.http.get(`${this.api}/schools`)
    .subscribe((res: any) => {
      this.schools = res.schools;
      this.filteredSchools = [...this.schools]; // initialize filter
    });
}
applyFilter() {
  const query = this.searchText.toLowerCase();

  this.filteredSchools = this.schools.filter(s =>
    (s.name && s.name.toLowerCase().includes(query)) ||
    (s.code && s.code.toLowerCase().includes(query)) ||
    (s.id && s.id.toString().includes(query))
  );
}

  openAdd() {
    this.schoolName = "";
    this.schoolCode = "";
    this.editMode = false;
    this.selectedId = null;
    this.showDialog = true;
  }

  editSchool(s: any) {
    this.editMode = true;
    this.selectedId = s.id;
    this.schoolName = s.name;
    this.schoolCode = s.code || "";
    this.showDialog = true;
  }

  save() {
    if (!this.schoolName.trim()) {
      this.toast('warn', 'Required', 'School name is required');
      return;
    }

    const payload = {
      name: this.schoolName,
      code: this.schoolCode
    };

    if (this.editMode) {
      this.http.put(`${this.api}/schools/${this.selectedId}`, payload).subscribe({
        next: () => {
          this.toast('success', 'Updated', 'School updated successfully');
          this.loadSchools();
          this.showDialog = false;
        },
        error: (err) => this.toast('error', 'Error', err.error?.message || 'Update failed')
      });
    } else {
      this.http.post(`${this.api}/schools`, payload).subscribe({
        next: () => {
          this.toast('success', 'Created', 'School created successfully');
          this.loadSchools();
          this.showDialog = false;
        },
        error: (err) => this.toast('error', 'Error', err.error?.message || 'Failed to create')
      });
    }
  }

  confirmDelete(event: Event, id: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this school? This will affect all linked users and classes.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.http.delete(`${this.api}/schools/${id}`).subscribe({
          next: () => {
            this.toast('success', 'Deleted', 'School deleted successfully');
            this.loadSchools();
          },
          error: (err) => this.toast('error', 'Error', err.error?.message || 'Delete failed')
        });
      }
    });
  }
}