import { Component, OnInit } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './results.html'
})
export class Results implements OnInit {

  results: any[] = [];
  loading = true;
  private api = environment.apiUrl;
  currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  constructor(
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.loading = false;
      return;
    }
    this.http.get(`${this.api}/results?user_id=${userId}`)
      .subscribe({
        next: (res: any) => {
          this.results = res.results || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  getTestTypeLabel(type: string): string {
  if (type === 'daily_random') return '⚡ Daily Quiz';
  if (type === 'subject') return '📘 Subject Quiz';
  return type || '-';
}
}