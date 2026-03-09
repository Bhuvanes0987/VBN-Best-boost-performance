import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ButtonModule,
    AvatarModule,
    DrawerModule,
    DialogModule,
    SelectModule,
    FormsModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {

  private router = inject(Router);

  constructor(private questionService: QuestionService){}

  sidebarVisible = signal(false);
  dialogVisible = false;

  userInitials = signal('AB');

  classes:any[]=[];
  subjects:any[]=[];

  selectedClass:any;
  selectedSubject:any;

  ngOnInit(){
    this.loadClasses();
  }

  loadClasses(){
    this.questionService.getClasses()
    .subscribe((res:any)=>{
      this.classes = res.classes;
    });
  }

  onClassChange(){

    this.selectedSubject = null;

    this.questionService
    .getSubjectsByClass(this.selectedClass.id)
    .subscribe((res:any)=>{
      this.subjects = res.subjects;
    });

  }

  openQuizDialog(){
    this.dialogVisible = true;
  }

  startQuiz(){

    if(!this.selectedClass || !this.selectedSubject){
      alert("Please select class and subject");
      return;
    }

    this.dialogVisible = false;

    this.router.navigate([
      '/quiz',
      this.selectedClass.id,
      this.selectedSubject.id
    ]);

  }

  goTo(path: string) {
    this.sidebarVisible.set(false);
    this.router.navigate([path]);
  }

}