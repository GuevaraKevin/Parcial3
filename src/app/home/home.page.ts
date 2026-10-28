
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  IonContent,
  IonInput,
  IonButton,
  IonSpinner
} from '@ionic/angular';

import { AuthService, Rol } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner
  ]
})
export class HomePage implements OnInit {

  private auth = inject(AuthService);
  private router = inject(Router);

  correo = '';
  clave = '';
  mensaje = '';
  cargando = false;

  ngOnInit() {
    const rol = this.auth.obtenerRol();

    if (rol) {
      this.redirigir(rol);
    }
  }

  iniciarSesion() {
    if (!this.correo || !this.clave || this.cargando) {
      return;
    }

    this.cargando = true;
    this.mensaje = '';

    this.auth.login(this.correo, this.clave).subscribe({
      next: (respuesta) => {
        this.cargando = false;

        if (respuesta.success && respuesta.access_token) {

          // Guardar sesión JWT
          this.auth.guardarSesion(respuesta);

          // Limpiar contraseña
          this.clave = '';

          // Abrir panel correspondiente
          this.redirigir(respuesta.user.role);

        } else {
          this.mensaje = 'No se pudo iniciar sesión.';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;

        this.mensaje = error.status === 0
          ? 'No hay conexión con el servidor.'
          : error.error?.message || 'Credenciales incorrectas';
      }
    });
  }

  private redirigir(rol: Rol) {
    const rutas: Record<Rol, string> = {
      client: '/cliente',
      driver: '/conductor',
      admin: '/admin'
    };

    void this.router.navigateByUrl(rutas[rol], {
      replaceUrl: true
    });
  }
}
