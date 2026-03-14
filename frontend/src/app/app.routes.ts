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

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login,
    title: 'Login - MyApp'
  },
  
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'user',
    component: User,
  },
   {
    path: 'classes',
    component: Class,
    title: 'Manage Classes'
  },

  {
    path: 'subjects',
    component: Subjects,
    title: 'Manage Subjects'
  },

  {
    path: 'questions',
    component: QuestionBank,
    title: 'Question Bank'
  },

  {
    path: 'import',
    component: ImportQuestions,
    title: 'Import Questions'
  },
{
  path:'quiz/:classId/:subjectId',
  component:Quiz
},
{
 path:'signup',
 component:Signup
},
{
 path:'roles',
 component:Role
},

  {
    path: '**',
    redirectTo: 'login'
  }
  
];