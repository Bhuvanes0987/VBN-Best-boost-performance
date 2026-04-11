import { Injectable } from '@angular/core';
import { environment } from '../../Environment/Environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SubjectService {

    API = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getSubjects(): Observable<any> {
        return this.http.get(`${this.API}/subjects`);
    }

    createSubject(data: any): Observable<any> {
        return this.http.post(`${this.API}/subjects`, data);
    }

    updateSubject(id: number, data: any): Observable<any> {
        return this.http.put(`${this.API}/subjects/${id}`, data);
    }

    deleteSubject(id: number): Observable<any> {
        return this.http.delete(`${this.API}/subjects/${id}`);
    }

    getClasses(): Observable<any> {
        return this.http.get(`${this.API}/classes`);
    }

}