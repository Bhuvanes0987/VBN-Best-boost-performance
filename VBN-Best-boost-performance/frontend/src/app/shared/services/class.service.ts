import { Injectable } from '@angular/core';
import { environment } from '../../Environment/Environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClassService {

  API = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getClasses(): Observable<any> {
    return this.http.get(`${this.API}/classes`);
  }

  createClass(data: any): Observable<any> {
    return this.http.post(`${this.API}/classes`, data);
  }

  updateClass(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/classes/${id}`, data);
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete(`${this.API}/classes/${id}`);
  }

}