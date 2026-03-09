import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Quiz {
    constructor(private http:HttpClient){}

  getQuiz(classId:number,subjectId:number){

    return this.http.get(
      `http://localhost:8000/quiz?class_id=${classId}&subject_id=${subjectId}`
    )

  }
}
