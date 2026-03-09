import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../services/question.service';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RadioButtonModule,
    InputTextModule
  ],
  templateUrl: './quiz.html',
  styleUrl: './quiz.scss'
})
export class Quiz implements OnInit {

  private route = inject(ActivatedRoute);

  constructor(private questionService: QuestionService) { }

  classId: any;
  subjectId: any;

  questions: any[] = [];
  currentIndex = 0;

  answers: any = {};

  score = 0;
  quizFinished = false;

  ngOnInit() {

    this.classId = this.route.snapshot.paramMap.get('classId');
    this.subjectId = this.route.snapshot.paramMap.get('subjectId');

    this.loadQuestions();

  }

  loadQuestions() {

    this.questionService.getQuestions()
      .subscribe((res: any) => {

        this.questions = res.questions.filter((q: any) =>
          q.class_id == this.classId &&
          q.subject_id == this.subjectId
        );

      });

  }

  selectOption(index: number) {

    this.answers[this.currentIndex] = index;

  }

  nextQuestion() {

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }

  }

  prevQuestion() {

    if (this.currentIndex > 0) {
      this.currentIndex--;
    }

  }

  submitQuiz() {

    this.calculateScore();

    this.quizFinished = true;

  }

  calculateScore() {

    let score = 0;

    this.questions.forEach((q, i) => {

      if (q.question_type === "mcq") {

        const correct = q.answer_data.correct;

        if (this.answers[i] === correct) {
          score++;
        }

      }

      if (q.question_type === "fill") {

        if (this.answers[i]?.toLowerCase() === q.answer_data.answer?.toLowerCase()) {
          score++;
        }

      }

    });

    this.score = score;

  }

}