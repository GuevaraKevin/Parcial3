
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonSpinner } from '@ionic/angular';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth.service';
import { environment } from '../../environments/environment';

interface Punto {
  lat: number;
  lng: number;
}

interface Estimacion {
  distance_km: number;
  duration_min: number;
  estimated_fare: number;
  currency: string;
}

interface ViajeActivo {
  has_active: boolean;
  type?: string;
  data?: {
    id?: number;
    status?: string;
  };
}

@Component({
  selector: 'app-cliente',
  standalone: true,
  templateUrl: './cliente.page.html',
  styleUrls: ['./cliente.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonInput,
    IonSpinner
  ]
})
export class ClientePage implements AfterViewInit, OnDestroy {

  @ViewChild('mapa', { static: true })
  mapaElemento!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private zona = inject(NgZone);

  private api = environment.apiUrl;

  private mapa?: L.Map;
  private marcadorOrigen?: L.CircleMarker;
  private marcadorDestino?: L.CircleMarker;
  private linea?: L.Polyline;

  usuario = this.auth.obtenerUsuario();

  modo: 'origen' | 'destino' = 'origen';

  origen: Punto | null = null;
  destino: Punto | null = null;

  nombreOrigen = '';
  nombreDestino = '';

  estimacion = signal<Estimacion | null>(null);
  viajeActivo = signal<ViajeActivo | null>(null);

  cargando = signal(false);
  solicitando = signal(false);
  mensaje = signal('');

  ngAfterViewInit() {
    this.crearMapa();
  }

  ionViewDidEnter() {
    this.mapa?.invalidateSize();
    this.consultarViaje();
  }

  ngOnDestroy() {
    this.mapa?.remove();
  }

  private crearMapa() {
    this.mapa = L.map(this.mapaElemento.nativeElement)
      .setView([2.9273, -75.2819], 13);

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(this.mapa);

    this.mapa.on('click', evento => {
      this.zona.run(() => {
        this.seleccionarPunto(evento.latlng);
      });
    });

    this.consultarViaje();
  }

  cambiarModo(modo: 'origen' | 'destino') {
    this.modo = modo;
    this.mensaje.set('');
  }

  private seleccionarPunto(posicion: L.LatLng) {
    const punto = {
      lat: posicion.lat,
      lng: posicion.lng
    };

    if (this.modo === 'origen') {
      this.origen = punto;
      this.nombreOrigen =
        `Origen (${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)})`;

      this.modo = 'destino';
    } else {
      this.destino = punto;
      this.nombreDestino =
        `Destino (${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)})`;
    }

    this.estimacion.set(null);
    this.actualizarMapa();
  }

  usarMiUbicacion() {
    if (!navigator.geolocation) {
      this.mensaje.set('Tu navegador no admite geolocalización.');
      return;
    }

    this.mensaje.set('Consultando tu ubicación...');

    navigator.geolocation.getCurrentPosition(
      posicion => {
        this.zona.run(() => {
          const lat = posicion.coords.latitude;
          const lng = posicion.coords.longitude;

          this.origen = { lat, lng };
          this.nombreOrigen = 'Mi ubicación actual';
          this.modo = 'destino';

          this.estimacion.set(null);
          this.mensaje.set('Ubicación obtenida correctamente.');

          this.mapa?.setView([lat, lng], 16);
          this.actualizarMapa();
        });
      },
      () => {
        this.zona.run(() => {
          this.mensaje.set(
            'No se pudo acceder a tu ubicación. Selecciónala en el mapa.'
          );
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000
      }
    );
  }

  private actualizarMapa() {
    if (!this.mapa) return;

    if (this.marcadorOrigen) {
      this.mapa.removeLayer(this.marcadorOrigen);
    }

    if (this.marcadorDestino) {
      this.mapa.removeLayer(this.marcadorDestino);
    }

    if (this.linea) {
      this.mapa.removeLayer(this.linea);
    }

    if (this.origen) {
      this.marcadorOrigen = L.circleMarker(
        [this.origen.lat, this.origen.lng],
        {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: '#111111',
          fillOpacity: 1
        }
      ).addTo(this.mapa);

      this.marcadorOrigen.bindPopup('Punto de recogida');
    }

    if (this.destino) {
      this.marcadorDestino = L.circleMarker(
        [this.destino.lat, this.destino.lng],
        {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: '#16a34a',
          fillOpacity: 1
        }
      ).addTo(this.mapa);

      this.marcadorDestino.bindPopup('Destino');
    }

    if (this.origen && this.destino) {
      this.linea = L.polyline(
        [
          [this.origen.lat, this.origen.lng],
          [this.destino.lat, this.destino.lng]
        ],
        {
          color: '#111111',
          weight: 3,
          dashArray: '8, 8'
        }
      ).addTo(this.mapa);

      this.mapa.fitBounds(this.linea.getBounds(), {
        padding: [45, 45],
        maxZoom: 16
      });
    }
  }

  calcularTarifa() {
    if (!this.origen || !this.destino) {
      this.mensaje.set('Selecciona origen y destino.');
      return;
    }

    this.cargando.set(true);
    this.mensaje.set('');

    const datos = {
      origin_latitude: this.origen.lat,
      origin_longitude: this.origen.lng,
      destination_latitude: this.destino.lat,
      destination_longitude: this.destino.lng
    };

    this.http.post<{
      success: boolean;
      estimate: Estimacion;
    }>(
      `${this.api}/client/estimate-fare`,
      datos,
      this.auth.opcionesAutorizadas()
    ).subscribe({
      next: respuesta => {
        this.estimacion.set(respuesta.estimate);
        this.cargando.set(false);
      },
      error: error => {
        this.cargando.set(false);
        this.mostrarError(error);
      }
    });
  }

  solicitarViaje() {
    if (!this.origen || !this.destino ||
        !this.estimacion() || this.solicitando() ||
        this.viajeActivo()?.has_active) {
      return;
    }

    if (!this.nombreOrigen.trim() ||
        !this.nombreDestino.trim()) {
      this.mensaje.set('Completa los nombres del origen y destino.');
      return;
    }

    const confirmar = window.confirm(
      '¿Confirmas solicitar un viaje real en el backend?'
    );

    if (!confirmar) return;

    this.solicitando.set(true);

    const datos = {
      origin_name: this.nombreOrigen.trim(),
      origin_latitude: this.origen.lat,
      origin_longitude: this.origen.lng,
      destination_name: this.nombreDestino.trim(),
      destination_latitude: this.destino.lat,
      destination_longitude: this.destino.lng
    };

    this.http.post<{
      success: boolean;
      message: string;
    }>(
      `${this.api}/client/ride-requests`,
      datos,
      this.auth.opcionesAutorizadas()
    ).subscribe({
      next: respuesta => {
        this.solicitando.set(false);
        this.mensaje.set(respuesta.message);
        this.consultarViaje();
      },
      error: error => {
        this.solicitando.set(false);
        this.mostrarError(error);
      }
    });
  }

  consultarViaje() {
    this.http.get<ViajeActivo>(
      `${this.api}/client/active`,
      this.auth.opcionesAutorizadas()
    ).subscribe({
      next: respuesta => {
        this.viajeActivo.set(respuesta);
      },
      error: error => this.mostrarError(error)
    });
  }

  private mostrarError(error: HttpErrorResponse) {
    if (error.status === 401) {
      this.auth.limpiarSesion();
      void this.router.navigateByUrl('/home');
      return;
    }

    this.mensaje.set(
      error.error?.message ||
      (error.status === 0
        ? 'No se pudo conectar con el backend.'
        : 'Ocurrió un error al procesar la solicitud.')
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
