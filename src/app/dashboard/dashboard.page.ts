
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton
} from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { environment } from '../../environments/environment';

interface Tarifa {
  name: string;
  base_fare: number;
  minimum_fare: number;
  price_per_km: number;
}

interface Solicitud {
  id: number;
  origin_name: string;
  destination_name: string;
  estimated_fare: number;
}

interface Estadisticas {
  total_clients: number;
  total_drivers: number;
  active_trips: number;
  completed_trips: number;
  pending_requests: number;
  total_revenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>UBER</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="panel">
        <div class="encabezado">
          <div>
            <p>Bienvenido</p>
            <h1>{{ usuario?.name }}</h1>
          </div>

          <ion-button
            fill="outline"
            color="dark"
            (click)="cerrarSesion()">
            Salir
          </ion-button>
        </div>

        @if (mensaje()) {
          <p class="mensaje">{{ mensaje() }}</p>
        }

        @if (rol === 'client') {
          <h2>Panel del cliente</h2>

          <section class="tarjeta">
            <h3>Tarifa actual</h3>

            @if (tarifa(); as t) {
              <p>{{ t.name }}</p>
              <div class="precio">
                {{ t.minimum_fare | currency:'COP':'symbol-narrow':'1.0-0' }}
              </div>
              <p>Tarifa mínima</p>
              <p>
                Por kilómetro:
                {{ t.price_per_km | currency:'COP':'symbol-narrow':'1.0-0' }}
              </p>
            } @else {
              <p>Consultando tarifa...</p>
            }
          </section>

          <section class="tarjeta">
            <h3>Mi viaje actual</h3>

            @if (viajeActivo() === null) {
              <p>Consultando viajes...</p>
            } @else if (viajeActivo()) {
              <p>Tienes una solicitud o viaje activo.</p>
              <p>Estado: {{ estadoViaje() }}</p>
            } @else {
              <p>No tienes viajes activos.</p>
            }
          </section>

          <ion-button
            expand="block"
            color="dark"
            (click)="cargarDatos()">
            Actualizar información
          </ion-button>
        }

        @if (rol === 'driver') {
          <h2>Panel del conductor</h2>

          <section class="tarjeta">
            <h3>Solicitudes disponibles</h3>

            @for (solicitud of solicitudes(); track solicitud.id) {
              <div class="solicitud">
                <p><b>Origen:</b> {{ solicitud.origin_name }}</p>
                <p><b>Destino:</b> {{ solicitud.destination_name }}</p>

                <p>
                  <b>Tarifa estimada:</b>
                  {{ solicitud.estimated_fare | currency:'COP':'symbol-narrow':'1.0-0' }}
                </p>

                <ion-button
                  expand="block"
                  color="dark"
                  (click)="aceptarSolicitud(solicitud.id)">
                  Aceptar viaje
                </ion-button>
              </div>
            } @empty {
              <p>No hay solicitudes disponibles.</p>
            }
          </section>

          <ion-button
            color="dark"
            expand="block"
            (click)="cargarDatos()">
            Actualizar solicitudes
          </ion-button>
        }

        @if (rol === 'admin') {
          <h2>Panel de administración</h2>

          @if (estadisticas(); as e) {
            <div class="metricas">
              <section class="tarjeta">
                <p>Clientes</p>
                <h2>{{ e.total_clients }}</h2>
              </section>

              <section class="tarjeta">
                <p>Conductores</p>
                <h2>{{ e.total_drivers }}</h2>
              </section>

              <section class="tarjeta">
                <p>Viajes activos</p>
                <h2>{{ e.active_trips }}</h2>
              </section>

              <section class="tarjeta">
                <p>Viajes completados</p>
                <h2>{{ e.completed_trips }}</h2>
              </section>

              <section class="tarjeta">
                <p>Solicitudes pendientes</p>
                <h2>{{ e.pending_requests }}</h2>
              </section>

              <section class="tarjeta">
                <p>Ingresos registrados</p>
                <h2>
                  {{ e.total_revenue | currency:'COP':'symbol-narrow':'1.0-0' }}
                </h2>
              </section>
            </div>
          } @else {
            <p>Consultando estadísticas...</p>
          }

          <ion-button
            expand="block"
            color="dark"
            (click)="cargarDatos()">
            Actualizar estadísticas
          </ion-button>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #f4f5f7;
    }

    .panel {
      max-width: 950px;
      margin: 0 auto;
      padding: 24px;
    }

    .encabezado {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      gap: 15px;
    }

    h1 {
      color: #111;
      font-size: 28px;
      font-weight: 800;
      margin: 4px 0;
    }

    h2, h3 {
      color: #111;
    }

    p {
      color: #555;
    }

    .tarjeta {
      padding: 24px;
      background: #fff;
      border-radius: 16px;
      margin-bottom: 16px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.04);
    }

    .precio {
      font-size: 32px;
      font-weight: 800;
      color: #111;
    }

    .metricas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .metricas h2 {
      font-size: 28px;
      margin-bottom: 0;
    }

    .solicitud {
      padding: 16px 0;
      border-bottom: 1px solid #eee;
    }

    .mensaje {
      background: #fff;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 20px;
    }
  `]
})
export class DashboardPage implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);

  private api = environment.apiUrl;

  usuario = this.auth.obtenerUsuario();
  rol = this.auth.obtenerRol();

  tarifa = signal<Tarifa | null>(null);
  viajeActivo = signal<boolean | null>(null);
  estadoViaje = signal('');
  solicitudes = signal<Solicitud[]>([]);
  estadisticas = signal<Estadisticas | null>(null);
  mensaje = signal('');

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.mensaje.set('');

    const opciones = this.auth.opcionesAutorizadas();

    if (this.rol === 'client') {
      this.http.get<{
        success: boolean;
        fare: Tarifa;
      }>(`${this.api}/fares/active`).subscribe({
        next: r => this.tarifa.set(r.fare),
        error: e => this.mostrarError(e)
      });

      this.http.get<{
        has_active: boolean;
        type?: string;
        data?: { status?: string };
      }>(`${this.api}/client/active`, opciones).subscribe({
        next: r => {
          this.viajeActivo.set(r.has_active);
          this.estadoViaje.set(
            r.data?.status ?? r.type ?? ''
          );
        },
        error: e => this.mostrarError(e)
      });
    }

    if (this.rol === 'driver') {
      this.http.get<{
        success: boolean;
        requests: Solicitud[];
      }>(`${this.api}/driver/ride-requests`, opciones)
        .subscribe({
          next: r => this.solicitudes.set(r.requests),
          error: e => this.mostrarError(e)
        });
    }

    if (this.rol === 'admin') {
      this.http.get<{
        success: boolean;
        stats: Estadisticas;
      }>(`${this.api}/admin/dashboard`, opciones)
        .subscribe({
          next: r => this.estadisticas.set(r.stats),
          error: e => this.mostrarError(e)
        });
    }
  }

  aceptarSolicitud(id: number) {
    this.http.post(
      `${this.api}/driver/ride-requests/${id}/accept`,
      {},
      this.auth.opcionesAutorizadas()
    ).subscribe({
      next: () => {
        this.mensaje.set('Viaje aceptado correctamente.');
        this.cargarDatos();
      },
      error: e => this.mostrarError(e)
    });
  }

  private mostrarError(error: HttpErrorResponse) {
    if (error.status === 401) {
      this.auth.limpiarSesion();
      void this.router.navigateByUrl('/home');
      return;
    }

    this.mensaje.set(
      error.error?.message ??
      'No fue posible consultar el servidor.'
    );
  }

  cerrarSesion() {
    this.auth.logout().subscribe({
      next: () => this.salir(),
      error: () => this.salir()
    });
  }

  private salir() {
    this.auth.limpiarSesion();
    void this.router.navigateByUrl('/home', {
      replaceUrl: true
    });
  }
}
