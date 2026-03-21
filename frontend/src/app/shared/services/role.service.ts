import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private api = '${environment.apiUrl}';

  constructor(private http: HttpClient) {}

  getRoles() { return this.http.get(`${this.api}/roles`); }
  getPermissions() { return this.http.get(`${this.api}/permissions`); }
  createRole(data: any) { return this.http.post(`${this.api}/roles`, data); }
  updateRole(id: number, data: any) { return this.http.put(`${this.api}/roles/${id}`, data); }
  deleteRole(id: number) { return this.http.delete(`${this.api}/roles/${id}`); }
}