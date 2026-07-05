import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { environment } from '../../../Environment/Environment';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-student-result',
  imports: [CommonModule,
   FormsModule,
   TableModule,
   InputTextModule,
   SelectModule],
  templateUrl: './student-result.html',
  styleUrl: './student-result.scss',
})
export class StudentResult {

 api=environment.apiUrl;

 students:any[]=[];
 filtered:any[]=[];

 search='';

 classFilter:any=null;
 subjectFilter:any=null;

 classes:any[]=[];
 subjects:any[]=[];

 currentUser=
 JSON.parse(sessionStorage.getItem('user')||'{}');

 constructor(
  private http:HttpClient
 ){}

ngOnInit(){

this.loadResults();

this.loadFilters();

}

loadResults(){

const teacherId=this.currentUser.id;

this.http.get(
`${this.api}/teacher/student-results?teacher_id=${teacherId}`
)

.subscribe((res:any)=>{

this.students=res.results||[];

this.filtered=[...this.students];

});

}

loadFilters(){

this.classes=[
{label:'All',value:null}
];

this.subjects=[
{label:'All',value:null}
];

}

applyFilter(){

this.filtered=this.students.filter(x=>{

const nameMatch=
!this.search ||
x.student_name
.toLowerCase()
.includes(
this.search.toLowerCase()
);

const classMatch=
!this.classFilter ||
x.class_name===this.classFilter;

const subjectMatch=
!this.subjectFilter ||
x.subject_name===this.subjectFilter;

return (
nameMatch &&
classMatch &&
subjectMatch
);

});

}

}
