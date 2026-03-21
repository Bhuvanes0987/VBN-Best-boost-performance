import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, ButtonModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments {

}
