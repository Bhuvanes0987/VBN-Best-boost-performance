import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, DrawerModule, Avatar, ConfirmPopupModule, CommonModule],
  providers: [ConfirmationService],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  sidebarVisible = signal(false);
  currentRoute = signal('');
  userPosition = signal<number>(parseInt(sessionStorage.getItem('position') ?? '2'));
  userData = signal<any>(JSON.parse(sessionStorage.getItem('user') || '{}'));
  termsAccepted = signal<boolean>(false);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute.set(e.urlAfterRedirects);
        this.userPosition.set(parseInt(sessionStorage.getItem('position') ?? '2'));
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        this.userData.set(user);
        if (user?.id) {
          this.termsAccepted.set(sessionStorage.getItem(`terms_accepted_${user.id}`) === 'true');
        }
      });
      
    window.addEventListener('terms_accepted', () => {
      this.termsAccepted.set(true);
    });
  }

  hideLayout = computed(() => {
    const route = this.currentRoute();
    return route === '/login' || route === '/signup' ||
           route === '/forgot-password' || route.startsWith('/reset-password');
  });

  isAdmin = computed(() => this.userPosition() === 1);

  allowedPages = computed((): string[] => {
  if (this.isAdmin()) return ['users', 'roles', 'classes', 'subjects', 'questions', 'quiz', 'payments', 'results'];
  return this.userData()?.allowedPages || [];
  });

  canAccess(page: string): boolean {
    return this.allowedPages().includes(page);
  }

  showSettings = computed(() => {
    if (!this.termsAccepted()) {
      return false;
    }
    
    return this.isAdmin() || this.allowedPages().length > 0;
  });

  userInitials = computed(() => {
    const name = this.userData()?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  });

  userName = computed(() => this.userData()?.name || 'User');
  userEmail = computed(() => this.userData()?.email || '');
  userRole = computed(() => this.userData()?.role || '');

  goTo(path: string) {
    this.sidebarVisible.set(false);
    this.router.navigate([path]);
  }

  confirmLogout(event: Event) {
  this.confirmationService.confirm({
    target: event.target as EventTarget,
    message: 'Do you want to logout?',
    icon: 'pi pi-sign-out',
    acceptLabel: 'Logout',
    rejectLabel: 'Cancel',
    acceptButtonStyleClass: 'p-button-danger p-button-sm',
    rejectButtonStyleClass: 'p-button-text p-button-sm',
    accept: () => {
      localStorage.clear();
      sessionStorage.clear();
      this.userPosition.set(2);  
      this.userData.set({});
      this.router.navigate(['/login']);
    }
  });
}

logout() {
  localStorage.clear();
  sessionStorage.clear();
  this.userPosition.set(2);  
  this.userData.set({});
  this.router.navigate(['/login']);
}

}