import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-motor-control',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto">
      <header class="mb-8">
        <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">Automated Motor Control</h2>
        <p class="text-stone-600">Manual override for relay-controlled pumps and agitators.</p>
      </header>

      <!-- Connection Status Warning -->
      @if (!dataService.isSerialConnected()) {
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 mb-8">
          <div class="text-2xl">⚠️</div>
          <div>
            <h4 class="font-bold text-amber-800">Controller Offline</h4>
            <p class="text-sm text-amber-700">Connect the Arduino via USB in the "Tank Monitor" tab to enable controls.</p>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Motor 1 Card -->
        <div class="bg-white p-8 rounded-3xl shadow-sm border transition-all duration-300 relative overflow-hidden group"
             [class.border-stone-200]="!dataService.relay1State()"
             [class.border-green-500]="dataService.relay1State()"
             [class.shadow-md]="dataService.relay1State()">
          
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="text-9xl font-black">1</span>
          </div>

          <div class="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-xl">🔥</div>
                <h3 class="text-2xl font-bold text-stone-700">Heater</h3>
              </div>
              <p class="text-stone-500">Maintains optimal fermentation temperature.</p>
            </div>

            <div class="mt-8 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" 
                     [class.bg-green-500]="dataService.relay1State()"
                     [class.bg-stone-300]="!dataService.relay1State()"></div>
                <span class="font-mono text-sm font-bold uppercase" 
                      [class.text-green-600]="dataService.relay1State()"
                      [class.text-stone-400]="!dataService.relay1State()">
                  {{ dataService.relay1State() ? 'RUNNING' : 'STOPPED' }}
                </span>
              </div>

              <button 
                (click)="toggle(1)" 
                [disabled]="!dataService.isSerialConnected()"
                class="px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                [class.bg-red-50]="dataService.relay1State()"
                [class.text-red-600]="dataService.relay1State()"
                [class.bg-stone-800]="!dataService.relay1State()"
                [class.text-white]="!dataService.relay1State()">
                @if (dataService.relay1State()) {
                  <span>⏹ STOP HEATER</span>
                } @else {
                  <span>▶ START HEATER</span>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Motor 2 Card -->
        <div class="bg-white p-8 rounded-3xl shadow-sm border transition-all duration-300 relative overflow-hidden group"
             [class.border-stone-200]="!dataService.relay2State()"
             [class.border-green-500]="dataService.relay2State()"
             [class.shadow-md]="dataService.relay2State()">
          
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="text-9xl font-black">2</span>
          </div>

          <div class="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full flex items-center justify-center bg-stone-100 text-xl">🌪</div>
                <h3 class="text-2xl font-bold text-stone-700">Agitator</h3>
              </div>
              <p class="text-stone-500">Mixer for fertilizer tank.</p>
            </div>

            <div class="mt-8 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" 
                     [class.bg-green-500]="dataService.relay2State()"
                     [class.bg-stone-300]="!dataService.relay2State()"></div>
                <span class="font-mono text-sm font-bold uppercase" 
                      [class.text-green-600]="dataService.relay2State()"
                      [class.text-stone-400]="!dataService.relay2State()">
                  {{ dataService.relay2State() ? 'ACTIVE' : 'IDLE' }}
                </span>
              </div>

              <button 
                (click)="toggle(2)" 
                [disabled]="!dataService.isSerialConnected()"
                class="px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                [class.bg-red-50]="dataService.relay2State()"
                [class.text-red-600]="dataService.relay2State()"
                [class.bg-stone-800]="!dataService.relay2State()"
                [class.text-white]="!dataService.relay2State()">
                @if (dataService.relay2State()) {
                  <span>⏹ STOP MOTOR</span>
                } @else {
                  <span>▶ START MOTOR</span>
                }
              </button>
            </div>
          </div>
        </div>

      </div>
      
      <div class="mt-8 text-center text-stone-400 text-sm">
        <p>Ensure relay module pins are connected to Arduino digital outputs.</p>
      </div>
    </div>
  `
})
export class MotorControlComponent {
  dataService = inject(DataService);

  toggle(id: 1 | 2) {
    const currentState = id === 1 ? this.dataService.relay1State() : this.dataService.relay2State();
    this.dataService.toggleRelay(id, !currentState);
  }
}