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
import { authGuard } from './shared/services/auth-guard';
import { adminGuard } from './shared/services/admin-guard';
import { permissionGuard } from './shared/services/permission-guard';
import { ResetPassword } from './shared/components/reset-password/reset-password';
import { ForgotPassword } from './shared/components/forgot-password/forgot-password';
import { School } from './shared/components/school/school';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },

  { path: 'home', component: Home, canActivate: [authGuard] },

  {
    path: 'user', component: User,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'roles', component: Role,
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'classes', component: Class,
    canActivate: [authGuard, permissionGuard],
    data: { page: 'classes' }
  },
  {
    path: 'subjects', component: Subjects,
    canActivate: [authGuard, permissionGuard],
    data: { page: 'subjects' }
  },
  {
    path: 'questions', component: QuestionBank,
    canActivate: [authGuard, permissionGuard],
    data: { page: 'questions' }
  },
  {
    path: 'import', component: ImportQuestions,
    canActivate: [authGuard, permissionGuard],
    data: { page: 'questions' }
  },
  {
    path: 'quiz/:classId/:subjectId', component: Quiz,
    canActivate: [authGuard, permissionGuard],
    data: { page: 'quiz' }
  },
  {
  path: 'schools',
  component: School,
  canActivate: [authGuard, adminGuard]
},

  { path: '**', redirectTo: 'login' }
];