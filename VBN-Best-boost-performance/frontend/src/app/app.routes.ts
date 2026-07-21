import { Routes } from '@angular/router';
import { Login } from './shared/components/login/login';
import { Home } from './shared/components/home/home';
import { User } from './shared/components/user/user';
import { Class } from './shared/components/class/class';
import { QuestionBank } from './shared/components/question-bank/question-bank';
import { ImportQuestions } from './shared/components/import-questions/import-questions';
import { Subjects } from './shared/components/subjects/subjects';
import { Quiz } from './shared/components/quiz/quiz';
import { Signup } from './shared/components/signup/signup';
import { Role } from './shared/components/role/role';
import { School } from './shared/components/school/school';
import { UnitComponent } from './shared/components/unit/unit';
import { authGuard } from './shared/services/auth-guard';
import { adminGuard } from './shared/services/admin-guard';
import { permissionGuard } from './shared/services/permission-guard';
import { noAuthGuard } from './shared/services/no-auth-guard';
import { ResetPassword } from './shared/components/reset-password/reset-password';
import { ForgotPassword } from './shared/components/forgot-password/forgot-password';
import { Results } from './shared/components/results/results';
import { Payments } from './shared/components/payments/payments';
import { Profile } from './shared/components/profile/profile';
import { StudentResult } from './shared/components/student-result/student-result';
import { AdminPaymentsDashboard } from './shared/components/admin-payments-dashboard/admin-payments-dashboard';
import { EmailLogsComponent } from './shared/components/email-logs/email-logs';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [noAuthGuard] },
  { path: 'signup', component: Signup, canActivate: [noAuthGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [noAuthGuard] },
  { path: 'reset-password', component: ResetPassword },

  { path: 'home', component: Home, canActivate: [authGuard] },

  {
    path: 'results',
    component: Results,
    canActivate: [authGuard]
  },

  {
    path: 'payments',
    component: Payments,
    canActivate: [authGuard]
  },

  {
    path: 'quiz/:classId/:subjectId',
    component: Quiz,
    canActivate: [authGuard]
  },

  { path: 'schools', component: School, canActivate: [authGuard, adminGuard] },
  { path: 'user', component: User, canActivate: [authGuard, adminGuard] },
  { path: 'roles', component: Role, canActivate: [authGuard, adminGuard] },

  { path: 'classes', component: Class, canActivate: [authGuard, permissionGuard], data: { page: 'classes' } },
  { path: 'subjects', component: Subjects, canActivate: [authGuard, permissionGuard], data: { page: 'subjects' } },
  { path: 'questions', component: QuestionBank, canActivate: [authGuard, permissionGuard], data: { page: 'questions' } },
  { path: 'import', component: ImportQuestions, canActivate: [authGuard, permissionGuard], data: { page: 'questions' } },
  { path: 'units', component: UnitComponent, canActivate: [authGuard, permissionGuard], data: { page: 'subjects' } },
  { path: 'student-results', component: StudentResult, canActivate: [authGuard, permissionGuard] },
  {
  path: 'profile',
  component: Profile,
  canActivate: [authGuard]
},
  {
    path: 'admin-payments',
    component: AdminPaymentsDashboard,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'email-logs',
    component: EmailLogsComponent,
    canActivate: [authGuard, adminGuard]
  },

  { path: '**', redirectTo: 'login' }
];