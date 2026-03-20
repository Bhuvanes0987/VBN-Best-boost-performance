import { ComponentFixture, TestBed } from '@angular/core/testing';

import { School } from './school';

describe('School', () => {
  let component: School;
  let fixture: ComponentFixture<School>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [School]
    })
    .compileComponents();

    fixture = TestBed.createComponent(School);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
