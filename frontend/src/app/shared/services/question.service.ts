import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  api = "http://127.0.0.1:8900";

  constructor(private http: HttpClient) {}

  getClasses(){
    return this.http.get(`${this.api}/classes`);
  }

  getSubjectsByClass(classId:number){
    return this.http.get(`${this.api}/subjects-by-class/${classId}`);
  }

  createQuestion(data:any){
    return this.http.post(`${this.api}/questions`,data);
  }

  getQuestions(params?: any) {
  return this.http.get(`${this.api}/questions`, { params });
}

  updateQuestion(id:number,data:any){
    return this.http.put(`${this.api}/questions/${id}`,data);
  }

  deleteQuestion(id:number){
    return this.http.delete(`${this.api}/questions/${id}`);
  }

}