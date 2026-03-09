import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Class } from './class';

describe('Class', () => {
  let component: Class;
  let fixture: ComponentFixture<Class>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Class]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Class);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
