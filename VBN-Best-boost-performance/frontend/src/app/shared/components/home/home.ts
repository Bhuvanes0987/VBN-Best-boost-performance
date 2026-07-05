import { Component, inject, OnInit } from '@angular/core';
import { environment } from '../../../Environment/Environment';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QuestionService } from '../../services/question.service';
import { forkJoin } from 'rxjs';

type CustomFileItem = { id?: number; name: string; url: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, AvatarModule,
    DialogModule, SelectModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {

  public router = inject(Router);
  private api   = environment.apiUrl;

  constructor(
    private questionService: QuestionService,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  currentUser    = JSON.parse(sessionStorage.getItem('user') || '{}');
  userPosition   = parseInt(sessionStorage.getItem('position') || '2');
  isStudent      = this.userPosition === 2;
  isTeacher = this.userPosition === 3;
  isAdmin = this.userPosition === 1;

canEditHomeTable = this.isAdmin;

  // ─── Quiz dialog ──────────────────────────────────────────────────────────
  dialogVisible  = false;
  quizMode: 'daily' | 'subject' = 'daily';

  classes:        any[] = [];
  subjects:       any[] = [];
  units:          any[] = [];
  selectedClass:  any   = null;
  selectedSubject: any  = null;
  selectedUnit:   any   = null;

  schoolId       = Number(this.currentUser?.schoolId ?? this.currentUser?.school_id ?? 0) || null;
  studentClassId = this.currentUser?.studentClass || null;

  // ─── Stats ────────────────────────────────────────────────────────────────
  stats = { totalTests: 0, avgScore: 0, bestScore: 0, streak: 0 };

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  leaderboard:        any[]    = [];
  leaderboardLoading  = false;
  /** The current user's own leaderboard row (may be outside top-10) */
  myRankEntry:        any      = null;

  // ─── Configurable table ───────────────────────────────────────────────────
  customTableHeaders: string[] = ['Column 1', 'Column 2', 'Column 3', 'Documents', 'Link'];
  customTableData: string[][] = [
    ['', '', '', '', ''],
  ];
  customTableRowEditFlags: boolean[] = [this.canEditHomeTable];
  customTableConfigDialog = false;
  customTableRowInput = '1';
  customTableColInput = '5';
  customTableRowIds: Array<number | null> = [null];

  // col-3 file store keyed by row index
  customTableFileStore: { [rowIndex: number]: CustomFileItem[] } = {};
  private _customFileActiveRow: number | null = null;
  dailyQuizTaken = false;
  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadClasses();
    this.loadStats();
    this.loadLeaderboard();
    this.loadCustomTable();
    this.dailyQuizTaken =
      localStorage.getItem('dailyQuizTaken') === 'true';
    this.checkDailyQuizStatus();
}
  // ─── Stats ────────────────────────────────────────────────────────────────

  loadStats() {
    const userId = this.currentUser?.id;
    if (!userId) return;
    this.http.get(`${this.api}/results/stats?user_id=${userId}`).subscribe({
      next: (res: any) => this.stats = res.stats || this.stats,
      error: () => {}
    });
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  loadLeaderboard() {
  this.leaderboardLoading = true;

  const url = `${this.api}/results/leaderboard?limit=5`;

  this.http.get(url).subscribe({
    next: (res: any) => {
      this.leaderboard = res.leaderboard || [];
      this.leaderboardLoading = false;
      this.findMyRank();
    },
    error: () => {
      this.leaderboardLoading = false;
    }
  });
}
 
  private findMyRank() {
    const uid = this.currentUser?.id;
    if (!uid) return;

    const inTop = this.leaderboard.find(e => e.user_id === uid);
    if (inTop) { this.myRankEntry = inTop; return; }

    // Not in top 10 — fetch full list to find rank
    if (this.stats.totalTests > 0) {
      let url = `${this.api}/results/leaderboard?limit=1000`;
      if (this.schoolId) url += `&school_id=${this.schoolId}`;
      this.http.get(url).subscribe({
        next: (res: any) => {
          const full = res.leaderboard || [];
          this.myRankEntry = full.find((e: any) => e.user_id === uid) || null;
        },
        error: () => {}
      });
    }
  }

  /** True when the current user already appears in the visible top-10 list. */
  isInLeaderboard(): boolean {
    const uid = this.currentUser?.id;
    return !!uid && this.leaderboard.some(e => e.user_id === uid);
  }

  // ─── Classes / subjects ───────────────────────────────────────────────────

  loadClasses() {
    if (this.isStudent && this.studentClassId) {
      const url = this.schoolId
        ? `${this.api}/classes?school_id=${this.schoolId}`
        : `${this.api}/classes`;
      this.http.get(url).subscribe((res: any) => {
        this.classes = res.classes.filter(
          (c: any) => c.id === parseInt(this.studentClassId)
        );
        if (this.classes.length === 1) {
          this.selectedClass = this.classes[0];
          this.onClassChange();
        }
      });
    } else {
      this.questionService.getClasses()
        .subscribe((res: any) => this.classes = res.classes);
    }
  }

  onClassChange() {
    this.selectedSubject = null; this.selectedUnit = null;
    this.subjects = []; this.units = [];
    if (!this.selectedClass) return;
    this.questionService.getSubjectsByClass(this.selectedClass.id)
      .subscribe((res: any) => {
        let allSubjects = res.subjects || [];
        if (this.isStudent) {
          const selectedSubjectIds: number[] = this.currentUser?.selectedSubjects || [];
          if (selectedSubjectIds.length > 0) {
            allSubjects = allSubjects.filter((s: any) => selectedSubjectIds.includes(s.id));
          }
        }
        this.subjects = allSubjects;
      });
  }

  onSubjectChange() {
    this.selectedUnit = null;
    this.units = this.selectedSubject?.units || [];
  }

  // ─── Quiz dialog ──────────────────────────────────────────────────────────

  openQuizDialog(mode: 'daily' | 'subject') {
    this.quizMode = mode;
    this.selectedSubject = null; this.selectedUnit = null; this.units = [];
    if (!this.isStudent) this.selectedClass = null;
    this.dialogVisible = true;
  }

  startQuiz() {
    if (!this.selectedClass) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a class', life: 3000 });
      return;
    }
    if (this.quizMode === 'subject' && !this.selectedSubject) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please select a subject', life: 3000 });
      return;
    }

    this.dialogVisible = false;
    const classId   = this.selectedClass.id;
    const subjectId = this.selectedSubject?.id || 'all';
    const unitId    = this.selectedUnit?.id    || 'all';

    const queryParams: any = { mode: this.quizMode, unit: unitId };
    if (this.schoolId) queryParams['school'] = this.schoolId;

    this.router.navigate(['/quiz', classId, subjectId], { queryParams });
  }

  // ─── Configurable table helpers ───────────────────────────────────────────

  openCustomTableConfig() {
    if (!this.canEditHomeTable) return;
    this.customTableRowInput = String(this.customTableData.length || 1);
    this.customTableColInput = String(this.customTableHeaders.length || 1);
    this.customTableConfigDialog = true;
  }

  applyCustomTableSize() {
    if (!this.canEditHomeTable) return;
    const nextRows = Number.parseInt(this.customTableRowInput, 10);
    const nextCols = Number.parseInt(this.customTableColInput, 10);

    if (!nextRows || !nextCols || nextRows < 1 || nextRows > 100 || nextCols < 1 || nextCols > 20) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid size',
        detail: 'Rows must be 1-100 and columns must be 1-20',
        life: 3000,
      });
      return;
    }

    const removedRowIds = this.customTableRowIds.slice(nextRows).filter((id): id is number => id !== null);

    const resizedRows: string[][] = [];
    for (let r = 0; r < nextRows; r++) {
      const row: string[] = [];
      for (let c = 0; c < nextCols; c++) {
        row.push(this.customTableData[r]?.[c] ?? '');
      }
      resizedRows.push(row);
    }

    const resizedHeaders: string[] = [];
    for (let c = 0; c < nextCols; c++) {
      resizedHeaders.push(this.customTableHeaders[c] || `Column ${c + 1}`);
    }

    const resizedEditFlags: boolean[] = [];
    for (let r = 0; r < nextRows; r++) {
      resizedEditFlags.push(this.customTableRowEditFlags[r] ?? false);
    }

    const resizedRowIds: Array<number | null> = [];
    for (let r = 0; r < nextRows; r++) {
      resizedRowIds.push(this.customTableRowIds[r] ?? null);
    }

    const resizedFiles: { [rowIndex: number]: CustomFileItem[] } = {};
    for (let r = 0; r < nextRows; r++) {
      resizedFiles[r] = [...(this.customTableFileStore[r] || [])];
    }

    this.customTableData = resizedRows;
    this.customTableHeaders = resizedHeaders;
    this.customTableRowEditFlags = resizedEditFlags;
    this.customTableRowIds = resizedRowIds;
    this.customTableFileStore = resizedFiles;
    this.customTableConfigDialog = false;

    this.saveCustomHeaders();

    removedRowIds.forEach((id) => {
      this.http.delete(`${this.api}/custom-table/row/${id}`).subscribe({
        error: () => {}
      });
    });
  }

  addCustomRow() {
    if (!this.canEditHomeTable) return;
    this.customTableData.push(Array(this.customTableHeaders.length).fill(''));
    this.customTableRowEditFlags.push(true);
    this.customTableRowIds.push(null);
  }

  addCustomColumn() {
    if (!this.canEditHomeTable) return;
    const nextIndex = this.customTableHeaders.length + 1;
    this.customTableHeaders.push(`Column ${nextIndex}`);
    this.customTableData.forEach((row) => row.push(''));
    this.saveCustomHeaders();
  }

  deleteCustomRow(rowIndex: number) {
    if (!this.canEditHomeTable) return;
    if (this.customTableData.length <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot delete',
        detail: 'At least one row is required',
        life: 2500,
      });
      return;
    }

    const rowId = this.customTableRowIds[rowIndex];

    const finalizeDelete = () => {
      this.customTableData.splice(rowIndex, 1);
      this.customTableRowEditFlags.splice(rowIndex, 1);
      this.customTableRowIds.splice(rowIndex, 1);

      const rebuilt: { [row: number]: CustomFileItem[] } = {};
      this.customTableData.forEach((_, idx) => {
        const oldIdx = idx >= rowIndex ? idx + 1 : idx;
        rebuilt[idx] = [...(this.customTableFileStore[oldIdx] || [])];
      });
      this.customTableFileStore = rebuilt;

      if (this.customTableData.length === 0) {
        this.customTableData = [Array(this.customTableHeaders.length).fill('')];
        this.customTableRowEditFlags = [true];
        this.customTableRowIds = [null];
        this.customTableFileStore = {};
      }
    };

    if (rowId) {
      this.http.delete(`${this.api}/custom-table/row/${rowId}`).subscribe({
        next: finalizeDelete,
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Delete failed',
            detail: 'Could not delete row from server',
            life: 2500,
          });
        }
      });
      return;
    }

    finalizeDelete();
  }

  toggleCustomRowEdit(rowIndex: number) {
    if (!this.canEditHomeTable) return;
    if (this.customTableRowEditFlags[rowIndex]) {
      this.saveRow(rowIndex);
      return;
    }
    this.customTableRowEditFlags[rowIndex] = true;
  }

  autoSaveRow(rowIndex: number) {
    if (!this.canEditHomeTable) return;
    if (!this.customTableRowEditFlags[rowIndex]) return;
    this.saveRow(rowIndex, true);
  }

  trackByIndex(index: number) {
    return index;
  }

  // ─── Table file upload (col 3) ───────────────────────────────────────────

  triggerCustomFileUpload(rowIndex: number) {
    if (!this.canEditHomeTable) return;
    this._customFileActiveRow = rowIndex;
    const el = document.getElementById('customTableFileInput') as HTMLInputElement;
    if (el) { el.value = ''; el.click(); }
  }

  onCustomFileUpload(event: Event) {
    if (!this.canEditHomeTable) return;
    if (this._customFileActiveRow === null) return;
    const input = event.target as HTMLInputElement;
    const rowIndex = this._customFileActiveRow;
    this._customFileActiveRow = null;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const uploadNow = (rowId: number) => {
      const uploads = files.map((file) => {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.api}/custom-table/row/${rowId}/file`, formData);
      });

      forkJoin(uploads).subscribe({
        next: (responses) => {
          if (!this.customTableFileStore[rowIndex]) this.customTableFileStore[rowIndex] = [];
          responses.forEach((res) => {
            this.customTableFileStore[rowIndex].push({
              id: res.id,
              name: res.file_name,
              url: `${this.api}/custom-table/file/${res.id}/download`,
            });
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Upload failed',
            detail: 'Could not upload file(s)',
            life: 2500,
          });
        }
      });
    };

    const rowId = this.customTableRowIds[rowIndex];
    if (rowId) {
      uploadNow(rowId);
      return;
    }

    this.createRow(rowIndex).subscribe({
      next: (res) => {
        const newId = Number(res?.id);
        if (!newId) {
          this.messageService.add({
            severity: 'error',
            summary: 'Save failed',
            detail: 'Could not get saved row id',
            life: 2500,
          });
          return;
        }
        this.customTableRowIds[rowIndex] = newId;
        uploadNow(newId);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: 'Please save row before upload',
          life: 2500,
        });
      }
    });
  }

  removeCustomFile(rowIndex: number, fileIndex: number) {
    if (!this.canEditHomeTable) return;
    const file = this.customTableFileStore[rowIndex]?.[fileIndex];
    if (!file) return;

    if (file.id) {
      this.http.delete(`${this.api}/custom-table/file/${file.id}`).subscribe({
        next: () => this.customTableFileStore[rowIndex]?.splice(fileIndex, 1),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Delete failed',
            detail: 'Could not delete file',
            life: 2500,
          });
        }
      });
      return;
    }

    this.customTableFileStore[rowIndex]?.splice(fileIndex, 1);
  }

  getCustomFiles(rowIndex: number) {
    return this.customTableFileStore[rowIndex] || [];
  }

  private getDefaultHeaders(): string[] {
    return ['Column 1', 'Column 2', 'Column 3', 'Documents', 'Link'];
  }

  private normalizeHeaders(input: string[]): string[] {
    const defaults = this.getDefaultHeaders();
    const count = Math.max(input.length || 0, defaults.length);
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      out.push(input[i] || defaults[i] || `Column ${i + 1}`);
    }
    return out;
  }

  loadCustomTable() {
    if (!this.schoolId) return;

    this.http.get<any>(`${this.api}/custom-table?school_id=${this.schoolId}`).subscribe({
      next: (res) => {
        const sortedHeaders = [...(res?.headers || [])].sort((a, b) => a.col_index - b.col_index);
        const mappedHeaders = sortedHeaders.map((h: any) => h.header_name || '');
        this.customTableHeaders = this.normalizeHeaders(mappedHeaders);

        const rows = res?.rows || [];
        if (rows.length === 0) {
          this.customTableData = [Array(this.customTableHeaders.length).fill('')];
          this.customTableRowEditFlags = [this.canEditHomeTable];
          this.customTableRowIds = [null];
          this.customTableFileStore = {};
          return;
        }

        this.customTableData = rows.map((r: any) => {
          const row = Array(this.customTableHeaders.length).fill('');
          row[0] = r.col0 || '';
          row[1] = r.col1 || '';
          row[2] = r.col2 || '';
          if (this.customTableHeaders.length > 4) row[4] = r.link || '';
          return row;
        });
        this.customTableRowIds = rows.map((r: any) => r.id);
        this.customTableRowEditFlags = rows.map(() => false);

        const fileStore: { [rowIndex: number]: CustomFileItem[] } = {};
        rows.forEach((r: any, rowIndex: number) => {
          fileStore[rowIndex] = (r.files || []).map((f: any) => ({
            id: f.id,
            name: f.file_name,
            url: `${this.api}/custom-table/file/${f.id}/download`,
          }));
        });
        this.customTableFileStore = fileStore;
      },
      error: () => {}
    });
  }

  saveCustomHeaders() {
    if (!this.canEditHomeTable) return;
    if (!this.schoolId) return;

    const payload = {
      school_id: this.schoolId,
      headers: this.customTableHeaders.map((header_name, col_index) => ({
        col_index,
        header_name: header_name || `Column ${col_index + 1}`,
      })),
    };

    this.http.post(`${this.api}/custom-table/headers`, payload).subscribe({
      error: () => {}
    });
  }

  private rowPayload(rowIndex: number) {
    return {
      school_id: this.schoolId,
      col0: this.customTableData[rowIndex]?.[0] || '',
      col1: this.customTableData[rowIndex]?.[1] || '',
      col2: this.customTableData[rowIndex]?.[2] || '',
      link: this.customTableData[rowIndex]?.[4] || '',
    };
  }

  private createRow(rowIndex: number) {
    return this.http.post<any>(`${this.api}/custom-table/row`, this.rowPayload(rowIndex));
  }

  private saveRow(rowIndex: number, keepEditOpen: boolean = false) {
    if (!this.canEditHomeTable) return;
    if (!this.schoolId) return;

    const rowId = this.customTableRowIds[rowIndex];
    const done = () => {
      if (!keepEditOpen) {
        this.customTableRowEditFlags[rowIndex] = false;
      }
    };

    if (!rowId) {
      this.createRow(rowIndex).subscribe({
        next: (res) => {
          this.customTableRowIds[rowIndex] = res.id;
          done();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Save failed',
            detail: 'Could not save row',
            life: 2500,
          });
        }
      });
      return;
    }

    const payload = {
      col0: this.customTableData[rowIndex]?.[0] || '',
      col1: this.customTableData[rowIndex]?.[1] || '',
      col2: this.customTableData[rowIndex]?.[2] || '',
      link: this.customTableData[rowIndex]?.[4] || '',
    };

    this.http.put(`${this.api}/custom-table/row/${rowId}`, payload).subscribe({
      next: () => done(),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: 'Could not update row',
          life: 2500,
        });
      }
    });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  goTo(path: string) { this.router.navigate([path]); }

  getUserName(): string     { return this.currentUser?.name || 'User'; }
  getUserInitials(): string {
    const name = this.currentUser?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }
  getRoleLabel(): string {
    if (this.userPosition === 1) return 'Admin';
    if (this.userPosition === 2) return 'Student';
    return this.currentUser?.role || 'User';
  }

  /** Initials from a full name string */
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  /** Deterministic colour from rank position */
  avatarColor(rank: number): string {
    const colors = [
      'linear-gradient(135deg,#f97316,#ea580c)',
      'linear-gradient(135deg,#3b82f6,#2563eb)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#ef4444,#dc2626)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
    ];
    return colors[(rank - 1) % colors.length];
  }
  checkDailyQuizStatus() {
  const userId = this.currentUser?.id;

  if (!userId) return;

  this.http.get(`${this.api}/results/check-daily?user_id=${userId}`)
    .subscribe({
      next: (res: any) => {
        this.dailyQuizTaken = res.attended;

        localStorage.setItem(
          'dailyQuizTaken',
          String(res.attended)
        );
      },
      error: () => {
        this.dailyQuizTaken = false;
      }
    });
}
}