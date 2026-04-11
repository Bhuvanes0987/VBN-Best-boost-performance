import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportQuestions } from './import-questions';

describe('ImportQuestions', () => {
  let component: ImportQuestions;
  let fixture: ComponentFixture<ImportQuestions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportQuestions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportQuestions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
