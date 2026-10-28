
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { environment } from '../environments/environment';

export type Rol = 'client' | 'driver' | 'admin';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  role: Rol;
  status: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: Usuario;
}

interface Sesion {
  token: string;
  usuario: Usuario;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private clave = 'uber_sesion';

  login(correo: string, password: string) {
    return this.http.post<AuthResponse>(
      `${this.api}/auth/login`,
      { login: correo, password }
    );
  }

  guardarSesion(respuesta: AuthResponse) {
    const sesion: Sesion = {
      token: respuesta.access_token,
      usuario: respuesta.user,
      expiresAt: Date.now() +
        respuesta.expires_in * 1000
    };

    sessionStorage.setItem(
      this.clave,
      JSON.stringify(sesion)
    );
  }

  obtenerSesion(): Sesion | null {
    try {
      const datos = sessionStorage.getItem(this.clave);

      if (!datos) return null;

      const sesion = JSON.parse(datos) as Sesion;

      if (!sesion.token || !sesion.usuario ||
          Date.now() >= sesion.expiresAt) {
        this.limpiarSesion();
        return null;
      }

      return sesion;
    } catch {
      this.limpiarSesion();
      return null;
    }
  }

  obtenerUsuario(): Usuario | null {
    return this.obtenerSesion()?.usuario ?? null;
  }

  obtenerRol(): Rol | null {
    return this.obtenerUsuario()?.role ?? null;
  }

  opcionesAutorizadas() {
    const token = this.obtenerSesion()?.token ?? '';

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      })
    };
  }

  logout() {
    return this.http.post(
      `${this.api}/auth/logout`,
      {},
      this.opcionesAutorizadas()
    );
  }

  limpiarSesion() {
    sessionStorage.removeItem(this.clave);
  }
}
