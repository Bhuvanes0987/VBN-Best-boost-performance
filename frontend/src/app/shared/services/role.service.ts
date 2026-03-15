import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private apiUrl = 'http://localhost:8900';

  constructor(private http: HttpClient) {}

  // Get all roles
  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles`);
  }

  // Create role
  createRole(role: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles`, role);
  }

  // Assign permissions to role
  assignPermissions(roleId: number, permissions: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles/${roleId}/permissions`, permissions);
  }

  // Get permissions (optional if you add backend API)
  getPermissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`);
  }

}