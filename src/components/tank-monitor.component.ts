import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-tank-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full">
      <div class="bg-gradient-to-r from-teal-800 to-teal-700 p-8 rounded-3xl shadow-lg text-white mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-3xl font-bold mb-2">Fertilizer Tank Monitor</h2>
          <p class="opacity-80">Real-time telemetry from fermentation unit</p>
          
          <div class="mt-4 flex gap-2">
            @if (dataService.isTankConnected()) {
              <div class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 border border-white/10">
                <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Tank USB Connected
              </div>
            } @else if (dataService.isDemoMode()) {
              <div class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 border border-white/10">
                <span class="w-2 h-2 bg-yellow-400 rounded-full"></span> Simulated Data
              </div>
            } @else {
              <div class="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-sm font-semibold border border-white/10">
                 System Disconnected
              </div>
            }
          </div>
        </div>

        <div>
          @if (!dataService.isTankConnected()) {
             <div class="flex gap-2">
               @if(!dataService.isDemoMode()) {
                <button (click)="dataService.simulateConnection()" class="bg-teal-900/50 hover:bg-teal-900/70 border border-teal-600 text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm">
                    Run Demo Mode
                </button>
               }
               <button (click)="connectUsb()" class="bg-white text-teal-800 hover:bg-teal-50 px-6 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg">
                 <span>🔌</span> Connect Tank USB
               </button>
             </div>
          } @else {
             <div class="text-right opacity-70 text-sm">
               Reading Tank Stream...<br>
               Baud: 9600
             </div>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Methane -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center min-h-[160px]">
          <div class="text-stone-400 font-medium uppercase tracking-wider text-xs mb-2">Methane (Gas)</div>
          <div class="text-4xl font-bold text-stone-700">
            {{ dataService.tankReadings().methane }}
            <span class="text-base font-normal text-stone-400">ppm</span>
          </div>
          <div class="w-full bg-gray-200 h-1.5 mt-4 rounded-full overflow-hidden">
             <div class="bg-stone-600 h-full transition-all duration-500" [style.width.%]="(dataService.tankReadings().methane / 1000) * 100"></div>
          </div>
        </div>

        <!-- Temperature -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center min-h-[160px]">
          <div class="text-orange-400 font-medium uppercase tracking-wider text-xs mb-2">Temperature</div>
          <div class="text-4xl font-bold text-orange-600">
            {{ dataService.tankReadings().temperature }}
            <span class="text-base font-normal text-orange-400">°C</span>
          </div>
          <div class="w-full bg-orange-100 h-1.5 mt-4 rounded-full overflow-hidden">
             <div class="bg-orange-500 h-full transition-all duration-500" [style.width.%]="(dataService.tankReadings().temperature / 50) * 100"></div>
          </div>
        </div>

        <!-- Humidity -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center min-h-[160px]">
          <div class="text-blue-400 font-medium uppercase tracking-wider text-xs mb-2">Humidity</div>
          <div class="text-4xl font-bold text-blue-600">
            {{ dataService.tankReadings().humidity }}
            <span class="text-base font-normal text-blue-400">%</span>
          </div>
          <div class="w-full bg-blue-100 h-1.5 mt-4 rounded-full overflow-hidden">
             <div class="bg-blue-500 h-full transition-all duration-500" [style.width.%]="dataService.tankReadings().humidity"></div>
          </div>
        </div>

        <!-- pH Level -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center min-h-[160px]">
          <div class="text-purple-400 font-medium uppercase tracking-wider text-xs mb-2">pH Level</div>
          <div class="text-4xl font-bold text-purple-600">
            {{ dataService.tankReadings().ph }}
          </div>
          <div class="w-full bg-purple-100 h-1.5 mt-4 rounded-full overflow-hidden">
             <div class="bg-purple-500 h-full transition-all duration-500" [style.width.%]="(dataService.tankReadings().ph / 14) * 100"></div>
          </div>
          <div class="mt-2 text-xs font-medium text-purple-500 uppercase tracking-wide">
            {{ getPhStatus(dataService.tankReadings().ph) }}
          </div>
        </div>

      </div>

      <!-- Status Log -->
      <div class="mt-6 bg-white p-6 rounded-2xl border border-stone-200">
        <h3 class="font-bold text-stone-700 mb-2">System Health</h3>
        <div class="flex items-center gap-2">
           <div class="w-3 h-3 rounded-full animate-pulse" 
             [class.bg-green-500]="dataService.isTankConnected() || dataService.isDemoMode()"
             [class.bg-red-500]="!dataService.isTankConnected() && !dataService.isDemoMode()">
           </div>
           <span class="text-sm text-stone-500">
             @if(dataService.isTankConnected()) {
               Live data stream active via Tank Serial Port (USB)
             } @else if (dataService.isDemoMode()) {
               Simulation Mode
             } @else {
               Waiting for connection...
             }
           </span>
        </div>
      </div>
    </div>
  `
})
export class TankMonitorComponent {
  dataService = inject(DataService);

  getPhStatus(ph: number): string {
    if (ph < 6.0) return 'ACIDIC';
    if (ph > 7.5) return 'ALKALINE';
    return 'NEUTRAL';
  }

  async connectUsb() {
    await this.dataService.connectTank();
  }
}