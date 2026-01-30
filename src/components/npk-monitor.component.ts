import { Component, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

declare var Chart: any;

@Component({
  selector: 'app-npk-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Connection & Controls -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-stone-800">NPK Sensor Status</h2>
          <p class="text-stone-500">
            @if (dataService.isConnected()) {
              <span class="text-green-600 font-semibold">● Connected to ESP32</span>
            } @else {
              <span class="text-red-500 font-semibold">● Disconnected</span>
            }
          </p>
        </div>
        
        <div class="flex gap-3">
          @if (!dataService.isConnected()) {
            <button (click)="connect()" 
              class="bg-stone-800 hover:bg-stone-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span class="text-xl">📡</span> Connect Device
            </button>
          } @else {
            <button (click)="readSensor()" 
              [disabled]="isReading()"
              class="bg-[#A47E3B] hover:bg-[#8c6b32] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
              @if (isReading()) {
                <span class="animate-spin">↻</span> Reading...
              } @else {
                <span>⚡</span> READ NPK
              }
            </button>
          }
        </div>
      </div>

      <!-- Readings Cards -->
      @if (dataService.npkReadings().timestamp) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Nitrogen -->
          <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-9xl text-blue-100 opacity-50 font-bold pointer-events-none">N</div>
            <h3 class="text-blue-800 font-semibold mb-2">Nitrogen (N)</h3>
            <div class="text-4xl font-bold text-blue-900 mb-1">{{ dataService.npkReadings().n }} <span class="text-lg text-blue-600 font-normal">mg/kg</span></div>
            <div class="w-full bg-blue-200 h-2 rounded-full mt-4">
              <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="getPercentage(dataService.npkReadings().n, 200)"></div>
            </div>
            <p class="text-sm text-blue-700 mt-2">{{ getStatus(dataService.npkReadings().n, 100, 50) }}</p>
          </div>

          <!-- Phosphorus -->
          <div class="bg-orange-50 p-6 rounded-2xl border border-orange-100 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-9xl text-orange-100 opacity-50 font-bold pointer-events-none">P</div>
            <h3 class="text-orange-800 font-semibold mb-2">Phosphorus (P)</h3>
            <div class="text-4xl font-bold text-orange-900 mb-1">{{ dataService.npkReadings().p }} <span class="text-lg text-orange-600 font-normal">mg/kg</span></div>
            <div class="w-full bg-orange-200 h-2 rounded-full mt-4">
              <div class="bg-orange-600 h-2 rounded-full" [style.width.%]="getPercentage(dataService.npkReadings().p, 100)"></div>
            </div>
            <p class="text-sm text-orange-700 mt-2">{{ getStatus(dataService.npkReadings().p, 50, 20) }}</p>
          </div>

          <!-- Potassium -->
          <div class="bg-red-50 p-6 rounded-2xl border border-red-100 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-9xl text-red-100 opacity-50 font-bold pointer-events-none">K</div>
            <h3 class="text-red-800 font-semibold mb-2">Potassium (K)</h3>
            <div class="text-4xl font-bold text-red-900 mb-1">{{ dataService.npkReadings().k }} <span class="text-lg text-red-600 font-normal">mg/kg</span></div>
            <div class="w-full bg-red-200 h-2 rounded-full mt-4">
              <div class="bg-red-600 h-2 rounded-full" [style.width.%]="getPercentage(dataService.npkReadings().k, 300)"></div>
            </div>
            <p class="text-sm text-red-700 mt-2">{{ getStatus(dataService.npkReadings().k, 200, 100) }}</p>
          </div>
        </div>

        <!-- Chart -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 class="text-lg font-bold text-stone-700 mb-4">Nutrient Balance Analysis</h3>
          <div class="h-64 w-full relative">
            <canvas #radarCanvas></canvas>
          </div>
        </div>
      } @else {
        <div class="text-center py-20 bg-stone-100 rounded-3xl border border-dashed border-stone-300">
          <p class="text-stone-500 text-lg">No readings available. Connect device and click "Read".</p>
        </div>
      }
    </div>
  `
})
export class NpkMonitorComponent {
  dataService = inject(DataService);
  isReading = signal(false);
  
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('radarCanvas');
  chart: any = null;

  constructor() {
    effect(() => {
      const readings = this.dataService.npkReadings();
      const canvas = this.canvasRef()?.nativeElement;
      if (readings.timestamp && canvas) {
        this.updateChart(canvas, readings);
      }
    });
  }

  async connect() {
    await this.dataService.connectToDevice();
  }

  async readSensor() {
    this.isReading.set(true);
    await this.dataService.readNPK();
    this.isReading.set(false);
  }

  getPercentage(val: number, max: number): number {
    return Math.min((val / max) * 100, 100);
  }

  getStatus(val: number, high: number, low: number): string {
    if (val > high) return 'High Level';
    if (val < low) return 'Deficient';
    return 'Optimal';
  }

  updateChart(canvas: HTMLCanvasElement, data: any) {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['Nitrogen', 'Phosphorus', 'Potassium'],
        datasets: [{
          label: 'Current Soil Levels',
          data: [data.n, data.p, data.k],
          backgroundColor: 'rgba(164, 126, 59, 0.2)',
          borderColor: 'rgba(164, 126, 59, 1)',
          pointBackgroundColor: 'rgba(164, 126, 59, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: '#e5e7eb' },
            grid: { color: '#e5e7eb' },
            pointLabels: {
              font: { size: 14, family: 'Inter' },
              color: '#4F4A45'
            },
            suggestedMin: 0
          }
        }
      }
    });
  }
}