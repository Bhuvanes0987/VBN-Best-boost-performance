import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ClassService } from '../../services/class.service';

@Component({
  selector: 'app-class',
  standalone:true,
  imports:[
    DialogModule,
    TableModule,
    FormsModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl:'./class.html',
  styleUrl:'./class.scss'
})
export class Class implements OnInit{

  classes:any[]=[];

  className="";
  showDialog=false;

  editMode=false;
  selectedId:number | null=null;

  constructor(private classService:ClassService){}

  ngOnInit(){
    this.loadClasses();
  }

  /* =====================
      LOAD CLASSES
  ===================== */

  loadClasses(){

    this.classService.getClasses()
    .subscribe((res:any)=>{
      this.classes = res.classes;
    });

  }

  /* =====================
      OPEN ADD
  ===================== */

  openAdd(){

    this.className="";
    this.selectedId=null;
    this.editMode=false;

    this.showDialog=true;

  }

  /* =====================
      ADD / UPDATE
  ===================== */

  saveClass(){

    const payload={
      class_name:this.className
    };

    if(this.editMode){

      this.classService.updateClass(this.selectedId!,payload)
      .subscribe(()=>{
        this.loadClasses();
        this.showDialog=false;
      });

    }else{

      this.classService.createClass(payload)
      .subscribe(()=>{
        this.loadClasses();
        this.showDialog=false;
      });

    }

  }

  /* =====================
      EDIT CLASS
  ===================== */

  editClass(c:any){

    this.editMode=true;

    this.selectedId=c.id;
    this.className=c.class_name;

    this.showDialog=true;

  }

  /* =====================
      DELETE CLASS
  ===================== */

  deleteClass(id:number){

    if(!confirm("Delete this class?")) return;

    this.classService.deleteClass(id)
    .subscribe(()=>{
      this.loadClasses();
    });

  }

}