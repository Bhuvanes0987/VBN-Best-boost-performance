import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Drawer } from 'primeng/drawer';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    Drawer
  ],
  templateUrl: './user.html',
  styleUrl: './user.scss'
})
export class User implements OnInit {

  isDrawerVisible = signal(false);

  users = signal<any[]>([]);

  selectedUserId: number | null = null;

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.loadUsers();
  }

  classOptions = signal([
    { label: 'Class 10', value: '10' },
    { label: 'Class 11', value: '11' },
    { label: 'Class 12', value: '12' }
  ]);

  userForm = new FormGroup({
    fullName: new FormControl('', Validators.required),
    selectedClass: new FormControl('', Validators.required),
    schoolName: new FormControl('', Validators.required),
    schoolCode: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl(''),
    position: new FormControl('')
  });


  loadUsers() {
    this.userService.getUsers().subscribe((res: any) => {
      this.users.set(res.users);
    });
  }

  openAddUser() {
    this.selectedUserId = null;
    this.userForm.reset();
    this.isDrawerVisible.set(true);
  }


  editUser(user: any) {

    this.selectedUserId = user.id;

    this.userForm.patchValue({
      fullName: user.name,
      selectedClass: user.studentClass,
      schoolName: user.schoolName,
      schoolCode: user.schoolCode,
      email: user.email,
      phone: user.phone,
      position: user.position
    });

    this.isDrawerVisible.set(true);
  }

  saveUser() {

    if (!this.userForm.valid) return;

    const formData = this.userForm.value;

    if (this.selectedUserId) {

      this.userService.updateUser(this.selectedUserId, formData)
        .subscribe(() => {
          this.loadUsers();
          this.isDrawerVisible.set(false);
        });

    } else {

      this.userService.createUser(formData)
        .subscribe(() => {
          this.loadUsers();
          this.isDrawerVisible.set(false);
        });

    }
  }


  deleteUser(id: number) {

    if (!confirm("Deactivate this user?")) return;

    this.userService.deleteUser(id)
      .subscribe(() => {
        this.loadUsers();
      });
  }
}