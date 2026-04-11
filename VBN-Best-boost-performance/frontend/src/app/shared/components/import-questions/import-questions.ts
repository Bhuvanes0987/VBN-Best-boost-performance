import { Component } from '@angular/core';
import { FileUploadModule } from 'primeng/fileupload';

@Component({
  selector: 'app-import-questions',
  imports: [FileUploadModule],
  standalone:true,
  templateUrl: './import-questions.html',
  styleUrl: './import-questions.scss',
})
export class ImportQuestions {

}
