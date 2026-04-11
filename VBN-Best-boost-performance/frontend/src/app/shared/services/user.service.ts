import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private API = "http://127.0.0.1:8900";

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any> {
    return this.http.get(`${this.API}/users`);
  }

  createUser(data:any): Observable<any> {
    return this.http.post(`${this.API}/users`, data);
  }

  updateUser(id:number, data:any): Observable<any> {
    return this.http.put(`${this.API}/users/${id}`, data);
  }

  deleteUser(id:number): Observable<any> {
    return this.http.delete(`${this.API}/users/${id}`);
  }

  getRoles(): Observable<any>{
    return this.http.get(`${this.API}/roles/all`);
  }

  assignRole(userId:number, payload:any): Observable<any>{
    return this.http.post(`${this.API}/users/${userId}/role`, payload);
  }

}