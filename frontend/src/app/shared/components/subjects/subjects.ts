import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from "primeng/select";
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SubjectService } from '../../services/subject.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    SelectModule,
    FormsModule,
    TableModule,
    ButtonModule,
    MultiSelectModule,
    CommonModule,
    InputTextModule
  ],
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss'
})
export class Subjects implements OnInit {

  classes: any[] = [];
  subjects: any[] = [];

  selectedClasses: any[] = [];
  subjectName = "";

  editMode = false;
  selectedId: number | null = null;
  submitted: boolean = false
  constructor(private subjectService: SubjectService) { }

  ngOnInit() {
    this.loadClasses();
  }

  loadClasses() {

    this.subjectService.getClasses()
      .subscribe((res: any) => {

        this.classes = res.classes;
        this.loadSubjects();

      });

  }

  loadSubjects() {
    this.subjectService.getSubjects()
      .subscribe((res: any) => {
        this.subjects = res.subjects;
      });
  }

  addSubject() {

    this.submitted = true;

    if (!this.subjectName || this.selectedClasses.length === 0) {
      return;
    }

    const payload = {
      subject_name: this.subjectName,
      class_ids: this.selectedClasses.map(c => c.id)
    };

    if (this.editMode) {

      this.subjectService.updateSubject(this.selectedId!, payload)
        .subscribe(() => {
          this.loadSubjects();
          this.resetForm();
        });

    } else {

      this.subjectService.createSubject(payload)
        .subscribe(() => {
          this.loadSubjects();
          this.resetForm();
        });

    }

  }

  editSubject(s: any) {

    this.editMode = true;
    this.selectedId = s.id;
    this.subjectName = s.subject_name;

    this.selectedClasses = this.classes.filter(c =>
      s.classes.some((sc: any) => sc.id === c.id)
    );
  }

  deleteSubject(id: number) {

    if (!confirm("Delete this subject?")) return;

    this.subjectService.deleteSubject(id)
      .subscribe(() => {
        this.loadSubjects();
      });

  }

  resetForm() {

    this.subjectName = "";
    this.selectedClasses = [];
    this.editMode = false;
    this.selectedId = null;
    this.submitted = false
  }

}