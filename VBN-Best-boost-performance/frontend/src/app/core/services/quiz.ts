import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../Environment/Environment';

@Injectable({
  providedIn: 'root',
})
export class Quiz {
    constructor(private http:HttpClient){}

  getQuiz(classId:number,subjectId:number){

    return this.http.get(
      `${environment.apiUrl}/quiz?class_id=${classId}&subject_id=${subjectId}`
    )

  }
}
