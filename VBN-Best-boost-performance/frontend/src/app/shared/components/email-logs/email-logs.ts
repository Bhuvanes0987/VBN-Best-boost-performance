import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../Environment/Environment';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-email-logs',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule],
  templateUrl: './email-logs.html'
})
export class EmailLogsComponent implements OnInit {
  logs: any[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading = true;
    this.http.get<{logs: any[]}>(`${environment.apiUrl}/email-logs`).subscribe({
      next: (res) => {
        this.logs = res.logs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getBadgeClass(status: string) {
    return status === 'Success' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700';
  }
}
