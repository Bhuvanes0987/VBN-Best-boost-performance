import { Injectable } from '@angular/core';
import { environment } from '../../Environment/Environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  api = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getClasses() {
    return this.http.get(`${this.api}/classes`);
  }

  getSubjectsByClass(classId: number) {
    return this.http.get(`${this.api}/subjects-by-class/${classId}`);
  }

  createQuestion(data: any) {
    return this.http.post(`${this.api}/questions`, data);
  }

  getQuestions() {
    return this.http.get(`${this.api}/questions`);
  }

  updateQuestion(id: number, data: any) {
    return this.http.put(`${this.api}/questions/${id}`, data);
  }

  deleteQuestion(id: number) {
    return this.http.delete(`${this.api}/questions/${id}`);
  }

}