import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Environment/Environment';

export interface TableHeader {
  col_index: number;
  header_name: string;
}

export interface TableCell {
  row_index: number;
  col_index: number;
  cell_value: string;
}

export interface TableFile {
  id: number;
  row_index: number;
  col_index: number;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export interface ContentTableState {
  table_rows: number;
  table_cols: number;
  headers: TableHeader[];
  cells: TableCell[];
  files: TableFile[];
}

@Injectable({
  providedIn: 'root',
})
export class ContentTableService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getTable(schoolId: number): Observable<ContentTableState> {
    return this.http.get<ContentTableState>(
      `${this.api}/content-table?school_id=${schoolId}`,
    );
  }

  saveAll(
    schoolId: number,
    rows: number,
    cols: number,
    headers: TableHeader[],
    cells: TableCell[],
  ): Observable<any> {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const payload = {
      school_id: schoolId,
      table_rows: rows,
      table_cols: cols,
      headers,
      cells,
      email: user?.email || '',
    };
    return this.http.post(`${this.api}/content-table/save`, payload);
  }

  resize(
    schoolId: number,
    rows: number,
    cols: number,
    email: string,
  ): Observable<any> {
    return this.http.put(`${this.api}/content-table/resize`, {
      school_id: schoolId,
      table_rows: rows,
      table_cols: cols,
      email,
    });
  }

  deleteRow(schoolId: number, rowIndex: number): Observable<any> {
    return this.http.delete(
      `${this.api}/content-table/row/${rowIndex}?school_id=${schoolId}`,
    );
  }

  uploadFile(
    schoolId: number,
    rowIndex: number,
    colIndex: number,
    file: File,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('school_id', String(schoolId));
    formData.append('row_index', String(rowIndex));
    formData.append('col_index', String(colIndex));
    formData.append('file', file);
    return this.http.post(`${this.api}/content-table/file`, formData);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete(`${this.api}/content-table/file/${fileId}`);
  }

  getDownloadUrl(fileId: number): string {
    return `${this.api}/content-table/file/${fileId}/download`;
  }
}
