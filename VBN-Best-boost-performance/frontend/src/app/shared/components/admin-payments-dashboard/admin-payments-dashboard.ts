import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../Environment/Environment';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-payments-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './admin-payments-dashboard.html',
  styleUrls: ['./admin-payments-dashboard.scss']
})
export class AdminPaymentsDashboard implements OnInit {

  // Dashboard Data
  totalRevenue = 0;
  totalPaidUsers = 0;
  totalUnpaidUsers = 0;
  monthlyRevenue: any[] = [];
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Users Table
  users: any[] = [];
  searchQuery = '';
  filterStatus = '';

  // Roles Config
  roles: any[] = [];

  // UI state
  isLoading = false;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.refreshAll();
  }

  refreshAll() {
    this.isLoading = true;
    let done = 0;
    const checkDone = () => { done++; if (done === 3) this.isLoading = false; };

    this.http.get<any>(`${environment.apiUrl}/api/admin/payments/dashboard`).subscribe(res => {
      if (res.success) {
        this.totalRevenue = res.totalRevenue;
        this.totalPaidUsers = res.totalPaidUsers;
        this.totalUnpaidUsers = res.totalUnpaidUsers;
        this.monthlyRevenue = res.monthlyRevenue;
      }
      checkDone();
    }, () => checkDone());

    this.loadUsers(checkDone);
    this.loadRoles(checkDone);
  }

  loadUsers(callback?: () => void) {
    let url = `${environment.apiUrl}/api/admin/payments/users?search=${this.searchQuery}`;
    if (this.filterStatus) {
      url += `&payment_status=${this.filterStatus}`;
    }
    this.http.get<any>(url).subscribe(res => {
      if (res.success) {
        this.users = res.users;
      }
      if (callback) callback();
    }, () => { if (callback) callback(); });
  }

  loadRoles(callback?: () => void) {
    this.http.get<any>(`${environment.apiUrl}/api/admin/payments/roles`).subscribe(res => {
      if (res.success) {
        this.roles = res.roles;
      }
      if (callback) callback();
    }, () => { if (callback) callback(); });
  }

  toggleUserStatus(user: any) {
    const newStatus = user.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    this.http.put<any>(`${environment.apiUrl}/api/admin/payments/users/${user.id}/status`, { status: newStatus })
      .subscribe(res => {
        if (res.success) {
          user.paymentStatus = newStatus;
          // Refresh dashboard stats to reflect change
          this.http.get<any>(`${environment.apiUrl}/api/admin/payments/dashboard`).subscribe(r => {
            if (r.success) {
              this.totalRevenue = r.totalRevenue;
              this.totalPaidUsers = r.totalPaidUsers;
              this.totalUnpaidUsers = r.totalUnpaidUsers;
            }
          });
        }
      });
  }

  updateRoleConfig(role: any) {
    this.http.put<any>(`${environment.apiUrl}/api/admin/payments/roles/${role.id}`, { requiresPayment: role.requiresPayment })
      .subscribe(res => {
        if (!res.success) {
          // Revert checkbox if failed
          role.requiresPayment = !role.requiresPayment;
        }
        // Reload to confirm server state
        this.loadRoles();
      }, () => {
        // Revert on error
        role.requiresPayment = !role.requiresPayment;
      });
  }

  resetTrial(user: any) {
    if (!confirm(`Reset the 30-day trial for "${user.name}"? Their login count will go back to 0.`)) return;
    this.http.put<any>(`${environment.apiUrl}/api/admin/payments/users/${user.id}/reset-trial`, {})
      .subscribe(res => {
        if (res.success) {
          user.loginCount = 0;
        }
      });
  }


  exportPDF() {
    const doc = new jsPDF();
    doc.text('VBN Payments Audit Report', 14, 15);
    const head = [['ID', 'Name', 'Email', 'School', 'Payment Status', 'Login Count', 'Joined Date']];
    const data = this.users.map(u => [
      u.id, u.name, u.email, u.schoolName, u.paymentStatus, u.loginCount,
      u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
    ]);
    autoTable(doc, { head, body: data, startY: 20 });
    doc.save('payments_audit.pdf');
  }

  exportExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.users.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      School: u.schoolName,
      'Payment Status': u.paymentStatus,
      'Login Count': u.loginCount,
      'Joined Date': u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
    })));
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit');
    XLSX.writeFile(wb, 'payments_audit.xlsx');
  }
}
