import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, Drawer, Avatar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  private router = inject(Router);

  sidebarVisible = signal(false);
  userInitials = signal('AB');

  currentRoute = signal('');

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute.set(e.urlAfterRedirects);
      });
  }

  // hide navbar on login + signup
  hideLayout = computed(() => {
    return this.currentRoute() === '/login' || this.currentRoute() === '/signup';
  });

  goTo(path: string) {
    this.sidebarVisible.set(false);
    this.router.navigate([path]);
  }
}