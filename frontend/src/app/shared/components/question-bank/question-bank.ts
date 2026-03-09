import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

import { QuestionService } from '../../services/question.service';

@Component({
    selector: 'app-question-bank',
    standalone: true,
    imports: [
        FormsModule,
        ButtonModule,
        DrawerModule,
        SelectModule,
        RadioButtonModule,
        InputTextModule,
        TableModule,
        CommonModule
    ],
    templateUrl: './question-bank.html',
    styleUrl: './question-bank.scss'
})
export class QuestionBank implements OnInit {

    constructor(private questionService: QuestionService) { }

    drawerVisible = false;

    classes: any[] = [];
    subjects: any[] = [];
    questions: any[] = [];

    editMode = false;
    selectedQuestionId: number | null = null;

    types = [
        { name: 'Choose (MCQ)', value: 'mcq' },
        { name: 'Fill Up', value: 'fill' },
        { name: 'Match', value: 'match' },
        { name: 'Map', value: 'map' }
    ];

    selectedClass: any;
    selectedSubject: any;

    questionType = '';
    questionText = '';

    options: any[] = [{ text: '' }, { text: '' }];
    correctOption = 0;

    pairs: any[] = [{ left: '', right: '' }];

    fillAnswer = '';

    selectedFile: any;

    ngOnInit() {
        this.loadClasses();
        this.loadQuestions();
    }

    loadClasses() {
        this.questionService.getClasses()
            .subscribe((res: any) => {
                this.classes = res.classes;
            });
    }

    loadQuestions() {
        this.questionService.getQuestions()
            .subscribe((res: any) => {
                this.questions = res.questions;
            });
    }

    onClassChange() {

        this.selectedSubject = null;

        this.questionService
            .getSubjectsByClass(this.selectedClass.id)
            .subscribe((res: any) => {
                this.subjects = res.subjects;
            });

    }

    addOption() {
        this.options.push({ text: '' });
    }

    removeOption(i: number) {
        if (this.options.length > 1) {
            this.options.splice(i, 1);
        }
    }

    addPair() {
        this.pairs.push({ left: '', right: '' });
    }

    removePair(i: number) {
        if (this.pairs.length > 1) {
            this.pairs.splice(i, 1);
        }
    }

    onFileSelected(event: any) {
        this.selectedFile = event.target.files[0];
    }

    saveQuestion() {

        if (!this.selectedClass || !this.selectedSubject || !this.questionText) {
            alert("Fill all required fields");
            return;
        }

        let answer_data: any = {};

        if (this.questionType === "mcq") {
            answer_data = {
                options: this.options.map(o => o.text),
                correct: this.correctOption
            };
        }

        if (this.questionType === "fill") {
            answer_data = {
                answer: this.fillAnswer
            };
        }

        if (this.questionType === "match") {
            answer_data = {
                pairs: this.pairs
            };
        }

        const payload = {
            class_id: this.selectedClass.id,
            subject_id: this.selectedSubject.id,
            type: this.questionType,
            question: this.questionText,
            answer_data: answer_data
        };

        if (this.editMode) {

            this.questionService.updateQuestion(this.selectedQuestionId!, payload)
                .subscribe(() => {
                    this.loadQuestions();
                    this.drawerVisible = false;
                    this.resetForm();
                });

        } else {

            this.questionService.createQuestion(payload)
                .subscribe(() => {
                    this.loadQuestions();
                    this.drawerVisible = false;
                    this.resetForm();
                });

        }

    }

    editQuestion(q: any) {

        this.drawerVisible = true;

        this.editMode = true;
        this.selectedQuestionId = q.id;

        this.questionText = q.question_text;
        this.questionType = q.question_type;

        let data = q.answer_data;

        if (this.questionType === "mcq") {
            this.options = data.options.map((o: any) => ({ text: o }));
            this.correctOption = data.correct;
        }

        if (this.questionType === "fill") {
            this.fillAnswer = data.answer;
        }

        if (this.questionType === "match") {
            this.pairs = data.pairs;
        }

    }

    deleteQuestion(id: number) {

        if (!confirm("Delete this question?")) return;

        this.questionService.deleteQuestion(id)
            .subscribe(() => {
                this.loadQuestions();
            });

    }

    resetForm() {

        this.editMode = false;
        this.selectedQuestionId = null;

        this.questionText = '';
        this.questionType = '';

        this.options = [{ text: '' }, { text: '' }];
        this.correctOption = 0;

        this.pairs = [{ left: '', right: '' }];

        this.fillAnswer = '';

        this.selectedFile = null;

    }

    openDrawer() {
        this.drawerVisible = true;
        this.resetForm();
    }

    onTypeChange() {
        this.options = [{ text: '' }, { text: '' }];
        this.correctOption = 0;
        this.pairs = [{ left: '', right: '' }];
        this.fillAnswer = '';
    }

}