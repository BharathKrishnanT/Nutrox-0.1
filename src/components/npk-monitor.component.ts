import { Component, inject, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService, NpkData } from '../services/data.service';

declare var Chart: any;

@Component({
  selector: 'app-npk-monitor',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Connection & Controls -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-stone-800">NPK Sensor Status</h2>
          <p class="text-stone-500">
            @if (dataService.isNpkConnected()) {
              <span class="text-green-600 font-semibold">● Connected to NPK Sensor (USB)</span>
            } @else if (dataService.isDemoMode()) {
              <span class="text-yellow-600 font-semibold">● Simulated Connection</span>
            } @else {
              <span class="text-red-500 font-semibold">● Disconnected</span>
            }
          </p>
        </div>
        
        <div class="flex gap-3">
          @if (!dataService.isNpkConnected()) {
            @if (!dataService.isDemoMode()) {
               <button (click)="dataService.simulateConnection()" class="bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                  Demo Mode
               </button>
            }
            <button (click)="connect()" 
              class="bg-stone-800 hover:bg-stone-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span class="text-xl">🔌</span> Connect NPK USB
            </button>
          } @else {
             <!-- Save Button (Only enabled when data exists) -->
             <button (click)="dataService.saveNpkToHistory()" 
              [disabled]="!dataService.npkReadings().timestamp"
              class="bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
               💾 Save
             </button>

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
            <p class="text-sm mt-2 font-bold" [class]="getStatusColor(dataService.npkReadings().n, 100, 50)">
                {{ getStatus(dataService.npkReadings().n, 100, 50) }}
            </p>
          </div>

          <!-- Phosphorus -->
          <div class="bg-orange-50 p-6 rounded-2xl border border-orange-100 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-9xl text-orange-100 opacity-50 font-bold pointer-events-none">P</div>
            <h3 class="text-orange-800 font-semibold mb-2">Phosphorus (P)</h3>
            <div class="text-4xl font-bold text-orange-900 mb-1">{{ dataService.npkReadings().p }} <span class="text-lg text-orange-600 font-normal">mg/kg</span></div>
            <div class="w-full bg-orange-200 h-2 rounded-full mt-4">
              <div class="bg-orange-600 h-2 rounded-full" [style.width.%]="getPercentage(dataService.npkReadings().p, 100)"></div>
            </div>
            <p class="text-sm mt-2 font-bold" [class]="getStatusColor(dataService.npkReadings().p, 50, 20)">
                {{ getStatus(dataService.npkReadings().p, 50, 20) }}
            </p>
          </div>

          <!-- Potassium -->
          <div class="bg-red-50 p-6 rounded-2xl border border-red-100 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-9xl text-red-100 opacity-50 font-bold pointer-events-none">K</div>
            <h3 class="text-red-800 font-semibold mb-2">Potassium (K)</h3>
            <div class="text-4xl font-bold text-red-900 mb-1">{{ dataService.npkReadings().k }} <span class="text-lg text-red-600 font-normal">mg/kg</span></div>
            <div class="w-full bg-red-200 h-2 rounded-full mt-4">
              <div class="bg-red-600 h-2 rounded-full" [style.width.%]="getPercentage(dataService.npkReadings().k, 300)"></div>
            </div>
            <p class="text-sm mt-2 font-bold" [class]="getStatusColor(dataService.npkReadings().k, 200, 100)">
                {{ getStatus(dataService.npkReadings().k, 200, 100) }}
            </p>
          </div>
        </div>

        <!-- Radar Chart -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 class="text-lg font-bold text-stone-700 mb-4">Nutrient Balance Analysis</h3>
          <div class="h-64 w-full relative">
            <canvas #radarCanvas></canvas>
          </div>
        </div>
      } @else {
        <div class="text-center py-20 bg-stone-100 rounded-3xl border border-dashed border-stone-300">
          <p class="text-stone-500 text-lg">No readings available. Connect device or use Demo Mode.</p>
        </div>
      }

      <!-- Previous Readings History -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-stone-700">Previous Readings</h3>
              @if (dataService.npkHistory().length > 0) {
                  <button (click)="dataService.clearHistory()" class="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider">Clear History</button>
              }
          </div>
          
          <div class="overflow-x-auto mb-4 max-h-64 overflow-y-auto">
              <table class="w-full text-left border-collapse">
                  <thead class="sticky top-0 bg-white z-10 shadow-sm">
                      <tr class="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                          <th class="p-3 rounded-l-lg">Date / Time</th>
                          <th class="p-3">Nitrogen (N)</th>
                          <th class="p-3">Phosphorus (P)</th>
                          <th class="p-3">Potassium (K)</th>
                          <th class="p-3 rounded-r-lg text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody class="text-sm text-stone-600">
                      @for (item of dataService.npkHistory(); track $index) {
                          <tr class="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors group">
                              <td class="p-3 font-medium">{{ item.timestamp | date:'MMM d, y, h:mm a' }}</td>
                              <td class="p-3"><span class="font-bold text-blue-600">{{ item.n }}</span> mg/kg</td>
                              <td class="p-3"><span class="font-bold text-orange-600">{{ item.p }}</span> mg/kg</td>
                              <td class="p-3"><span class="font-bold text-red-600">{{ item.k }}</span> mg/kg</td>
                              <td class="p-3 text-right">
                                  <button (click)="dataService.deleteHistoryItem($index)" class="text-stone-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50">
                                      🗑
                                  </button>
                              </td>
                          </tr>
                      } @empty {
                          <tr>
                              <td colspan="5" class="p-8 text-center text-stone-400 italic">
                                  No stored readings found. Save a reading to see it here.
                              </td>
                          </tr>
                      }
                  </tbody>
              </table>
          </div>
      </div>
      
      <!-- History Chart Section -->
      @if (dataService.npkHistory().length > 0) {
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
           <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 class="text-lg font-bold text-stone-700">Historical Trend Analysis</h3>
              
              <div class="flex flex-wrap items-center gap-2">
                 <!-- Quick Ranges -->
                 <div class="flex bg-stone-100 rounded-lg p-1">
                   <button (click)="setRange(7)" class="px-3 py-1 text-xs font-bold rounded-md transition-colors" [class.bg-white]="isRange(7)" [class.shadow-sm]="isRange(7)" [class.text-stone-400]="!isRange(7)">7D</button>
                   <button (click)="setRange(30)" class="px-3 py-1 text-xs font-bold rounded-md transition-colors" [class.bg-white]="isRange(30)" [class.shadow-sm]="isRange(30)" [class.text-stone-400]="!isRange(30)">30D</button>
                   <button (click)="setRange(999)" class="px-3 py-1 text-xs font-bold rounded-md transition-colors" [class.bg-white]="isRange(999)" [class.shadow-sm]="isRange(999)" [class.text-stone-400]="!isRange(999)">ALL</button>
                 </div>

                 <div class="h-6 w-px bg-stone-300 mx-2 hidden md:block"></div>

                 <!-- Custom Date Inputs -->
                 <div class="flex items-center gap-2">
                   <input type="date" [value]="startDate()" (change)="onDateChange($event, 'start')" class="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-600 outline-none focus:ring-1 focus:ring-stone-400">
                   <span class="text-stone-400">-</span>
                   <input type="date" [value]="endDate()" (change)="onDateChange($event, 'end')" class="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-600 outline-none focus:ring-1 focus:ring-stone-400">
                 </div>
              </div>
           </div>

           <div class="h-80 w-full relative">
              <canvas #historyCanvas></canvas>
           </div>
        </div>
      }
    </div>
  `
})
export class NpkMonitorComponent {
  dataService = inject(DataService);
  isReading = signal(false);
  
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('radarCanvas');
  historyCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('historyCanvas');

  chart: any = null;
  historyChart: any = null;

  // Date Range State (Defaults to Last 7 Days)
  startDate = signal<string>(this.formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  endDate = signal<string>(this.formatDate(new Date()));
  currentRangeBtn = signal<number>(7);

  constructor() {
    // Effect: Update Current Readings Radar Chart
    effect(() => {
      const readings = this.dataService.npkReadings();
      const canvas = this.canvasRef()?.nativeElement;
      if (readings.timestamp && canvas) {
        this.updateChart(canvas, readings);
      }
    });

    // Effect: Update History Line Chart
    effect(() => {
       const history = this.dataService.npkHistory();
       const start = this.startDate();
       const end = this.endDate();
       const canvas = this.historyCanvasRef()?.nativeElement;
       
       if (canvas && history.length > 0) {
          // Use setTimeout to allow DOM to render if newly appeared
          setTimeout(() => this.updateHistoryChart(canvas, history, start, end), 0);
       }
    });
  }

  async connect() {
    await this.dataService.connectNpk();
  }

  async readSensor() {
    this.isReading.set(true);
    await this.dataService.readNPK();
    setTimeout(() => this.isReading.set(false), 500);
  }

  // --- Date Range Logic ---

  formatDate(d: Date): string {
     return d.toISOString().split('T')[0];
  }

  setRange(days: number) {
     this.currentRangeBtn.set(days);
     const end = new Date();
     const start = new Date();
     if (days === 999) {
        start.setFullYear(2020); // Show all
     } else {
        start.setDate(end.getDate() - days);
     }
     this.startDate.set(this.formatDate(start));
     this.endDate.set(this.formatDate(end));
  }

  isRange(days: number) {
     return this.currentRangeBtn() === days;
  }

  onDateChange(e: Event, type: 'start' | 'end') {
     const val = (e.target as HTMLInputElement).value;
     if (type === 'start') this.startDate.set(val);
     else this.endDate.set(val);
     this.currentRangeBtn.set(0); // Set to Custom
  }

  // --- Chart Logic ---

  getPercentage(val: number, max: number): number {
    return Math.min((val / max) * 100, 100);
  }

  getStatus(val: number, high: number, low: number): string {
    if (val > high) return 'High Level';
    if (val < low) return 'Deficient';
    return 'Optimal';
  }

  getStatusColor(val: number, high: number, low: number): string {
    if (val > high) return 'text-orange-600';
    if (val < low) return 'text-red-600';
    return 'text-green-600';
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

  updateHistoryChart(canvas: HTMLCanvasElement, allHistory: NpkData[], startStr: string, endStr: string) {
     if (this.historyChart) this.historyChart.destroy();
     
     const start = new Date(startStr);
     start.setHours(0,0,0,0);
     const end = new Date(endStr);
     end.setHours(23,59,59,999);

     // Filter and Sort (Oldest first for chart)
     const filtered = allHistory
        .filter(item => {
           if (!item.timestamp) return false;
           const d = new Date(item.timestamp);
           return d >= start && d <= end;
        })
        .sort((a, b) => (a.timestamp!.getTime() - b.timestamp!.getTime()));

     if (filtered.length === 0) return; // Could handle empty state here

     const labels = filtered.map(i => {
        const d = new Date(i.timestamp!);
        // Format: DD/MM HH:MM
        return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes() < 10 ? '0'+d.getMinutes() : d.getMinutes()}`;
     });

     this.historyChart = new Chart(canvas, {
        type: 'line',
        data: {
           labels: labels,
           datasets: [
              {
                 label: 'Nitrogen (N)',
                 data: filtered.map(i => i.n),
                 borderColor: '#2563EB', // Blue 600
                 backgroundColor: '#2563EB',
                 borderWidth: 2,
                 tension: 0.3,
                 pointRadius: 3
              },
              {
                 label: 'Phosphorus (P)',
                 data: filtered.map(i => i.p),
                 borderColor: '#EA580C', // Orange 600
                 backgroundColor: '#EA580C',
                 borderWidth: 2,
                 tension: 0.3,
                 pointRadius: 3
              },
              {
                 label: 'Potassium (K)',
                 data: filtered.map(i => i.k),
                 borderColor: '#DC2626', // Red 600
                 backgroundColor: '#DC2626',
                 borderWidth: 2,
                 tension: 0.3,
                 pointRadius: 3
              }
           ]
        },
        options: {
           responsive: true,
           maintainAspectRatio: false,
           interaction: {
              mode: 'index',
              intersect: false,
           },
           plugins: {
              legend: {
                 position: 'top',
                 labels: { usePointStyle: true, boxWidth: 6 }
              }
           },
           scales: {
              y: {
                 beginAtZero: true,
                 grid: { color: '#f3f4f6' },
                 title: { display: true, text: 'mg/kg' }
              },
              x: {
                 grid: { display: false },
                 ticks: { maxTicksLimit: 8 }
              }
           }
        }
     });
  }
}