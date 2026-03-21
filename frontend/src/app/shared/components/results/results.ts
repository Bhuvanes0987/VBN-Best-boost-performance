import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './results.html',

})
export class Results implements OnInit {
  results: any[] = [];
  private api = 'http://127.0.0.1:8900';
  currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    const userId = this.currentUser?.id;
    if (!userId) return;
    this.http.get(`${this.api}/results?user_id=${userId}`)
      .subscribe((res: any) => this.results = res.results || []);
  }
}