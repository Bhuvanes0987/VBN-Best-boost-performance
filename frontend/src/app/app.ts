import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,ButtonModule,Drawer,Avatar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  private router = inject(Router);
  
  sidebarVisible = signal(false);
  userInitials = signal('AB');

  goTo(path: string) {
    this.sidebarVisible.set(false);
    this.router.navigate([path]);
  }
}
