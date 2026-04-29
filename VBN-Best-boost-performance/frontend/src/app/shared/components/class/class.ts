import { Component, OnInit } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ClassService } from '../../services/class.service';
import { HttpClient } from '@angular/common/http';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-class',
  standalone: true,
  imports: [CommonModule, DialogModule, TableModule, FormsModule,
            ButtonModule, InputTextModule, SelectModule,
            ConfirmPopupModule, ToastModule, TooltipModule,MultiSelectModule],
  providers: [ConfirmationService, MessageService ],
  templateUrl: './class.html',
  styleUrl: './class.scss'
})
export class Class implements OnInit {

  classes: any[] = [];
  schools: any[] = [];       
  className = "";
  selectedSchools: number[] = [];
  showDialog = false;
  editMode = false;
  selectedId: number | null = null;
  private api = environment.apiUrl;

  constructor(
    private classService: ClassService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadSchools();
    this.loadClasses();
  }

  loadSchools() {
    this.http.get(`${this.api}/schools`)
      .subscribe((res: any) => this.schools = res.schools);
  }

  loadClasses() {
    this.classService.getClasses().subscribe((res: any) => {
   this.classes = [...res.classes];
      });
  }

  openAdd() {
  this.className = "";
  this.selectedSchools = [];
  this.selectedId = null;
  this.editMode = false;
  this.showDialog = true;
}
  editClass(c: any) {
  this.editMode = true;
  this.selectedId = c.id;
  this.className = c.name;
  this.selectedSchools = [c.school_id];
  this.showDialog = true;
}

saveClass() {
  if (!this.className.trim()) {
    this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Class name is required', life: 3000 });
    return;
  }

  if (!this.selectedSchools || this.selectedSchools.length === 0) {
    this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select at least one school', life: 3000 });
    return;
  }

  // 🔥 EDIT MODE
  if (this.editMode && this.selectedId) {
    // ⚠️ only allow ONE school during edit (important)
    const schoolId = this.selectedSchools[0];

    this.classService.updateClass(this.selectedId, {
      name: this.className,
      school_id: schoolId
    }).subscribe({
      next: () => {
        this.showDialog = false;
        this.loadClasses();
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Class updated successfully',
          life: 3000
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Update failed',
          life: 3000
        });
      }
    });

  } else {
    // 🔥 CREATE MODE (multi-school)
    const requests = this.selectedSchools.map(schoolId => {
      return this.classService.createClass({
        name: this.className,
        school_id: schoolId
      }).toPromise();
    });

    Promise.all(requests)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Class created for selected schools',
          life: 3000
        });
        this.loadClasses();
        this.showDialog = false;
      })
      .catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create classes',
          life: 3000
        });
      });
  }
}
  getSchoolName(schoolId: number): string {
    const school = this.schools.find(s => s.id === schoolId);
    return school ? school.name : '-';
  }

  deleteClass(event: Event, id: number) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Delete this class?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete', rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.classService.deleteClass(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Class deleted successfully', life: 3000 });
            this.loadClasses();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Delete failed', life: 3000 })
        });
      }
    });
  }
}