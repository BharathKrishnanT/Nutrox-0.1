import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-motor-control',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto">
      <header class="mb-8">
        <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">Automated Motor Control</h2>
        <p class="text-stone-600">Manual override for relay-controlled pumps, agitators, and grinders.</p>
      </header>

      <!-- Connection Status Warning -->
      @if (!dataService.isTankConnected() && !dataService.isDemoMode()) {
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 mb-8">
          <div class="flex items-center gap-4">
             <div class="text-2xl">⚠️</div>
             <div>
               <h4 class="font-bold text-amber-800">Controller Offline</h4>
               <p class="text-sm text-amber-700">Connect the Tank/Motor Control Unit (USB) to enable controls.</p>
             </div>
          </div>
          <button (click)="dataService.simulateConnection()" class="px-4 py-2 bg-amber-200 text-amber-900 rounded-lg text-sm font-bold hover:bg-amber-300">
             Try Demo Mode
          </button>
        </div>
      } @else if (dataService.isTankConnected()) {
        <div class="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-4 mb-8">
          <div class="text-2xl">🔌</div>
          <div>
            <h4 class="font-bold text-green-800">Live Control Active</h4>
            <p class="text-sm text-green-700">Commands are being sent to the connected Tank Controller.</p>
          </div>
        </div>
      } @else {
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4 mb-8">
          <div class="text-2xl">🧪</div>
          <div>
            <h4 class="font-bold text-blue-800">Demo Mode Active</h4>
            <p class="text-sm text-blue-700">Controls are simulated. No physical commands sent.</p>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Motor 1: Heater (Relay) -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full"
             [class.border-stone-200]="!dataService.relay1State()"
             [class.border-red-400]="dataService.relay1State()"
             [class.shadow-md]="dataService.relay1State()">
          
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="text-9xl font-black">1</span>
          </div>

          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-full flex items-center justify-center bg-red-50 text-2xl">🔥</div>
              <h3 class="text-2xl font-bold text-stone-700">Heater</h3>
            </div>
            <p class="text-stone-500 text-sm">Maintains optimal fermentation temperature.</p>
          </div>

          <div class="mt-8">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-3 h-3 rounded-full" 
                   [class.bg-red-500]="dataService.relay1State()"
                   [class.bg-stone-300]="!dataService.relay1State()"></div>
              <span class="font-mono text-xs font-bold uppercase" 
                    [class.text-red-600]="dataService.relay1State()"
                    [class.text-stone-400]="!dataService.relay1State()">
                {{ dataService.relay1State() ? 'HEATING' : 'STOPPED' }}
              </span>
            </div>

            <button 
              (click)="toggle(1)" 
              [disabled]="!dataService.isTankConnected() && !dataService.isDemoMode()"
              class="w-full px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        <!-- Motor 2: Grinder (Motor A) -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full"
             [class.border-stone-200]="!dataService.relay2State()"
             [class.border-amber-500]="dataService.relay2State()"
             [class.shadow-md]="dataService.relay2State()">
          
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="text-9xl font-black">2</span>
          </div>

          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-full flex items-center justify-center bg-amber-50 text-2xl">⚙️</div>
              <h3 class="text-2xl font-bold text-stone-700">Grinder</h3>
            </div>
            <p class="text-stone-500 text-sm">Crushes organic waste (Motor A).</p>
          </div>

          <div class="mt-6">
            
            <!-- Direction Control -->
            <div class="flex bg-stone-100 rounded-xl p-1 mb-4 border border-stone-200">
               <button 
                 (click)="setDir(2, 'F')"
                 [class.bg-white]="dataService.grinderDirection() === 'F'"
                 [class.shadow-sm]="dataService.grinderDirection() === 'F'"
                 [class.text-amber-600]="dataService.grinderDirection() === 'F'"
                 [class.text-stone-400]="dataService.grinderDirection() !== 'F'"
                 class="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                 @if(dataService.grinderDirection() === 'F') { <span class="text-[10px] mr-1">●</span> }
                 ↻ FORWARD
               </button>
               <button 
                 (click)="setDir(2, 'B')"
                 [class.bg-white]="dataService.grinderDirection() === 'B'"
                 [class.shadow-sm]="dataService.grinderDirection() === 'B'"
                 [class.text-amber-600]="dataService.grinderDirection() === 'B'"
                 [class.text-stone-400]="dataService.grinderDirection() !== 'B'"
                 class="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                 @if(dataService.grinderDirection() === 'B') { <span class="text-[10px] mr-1">●</span> }
                 ↺ REVERSE
               </button>
            </div>

            <!-- Speed Control Slider -->
            <div class="mb-6 bg-stone-50 p-3 rounded-xl border border-stone-100">
               <label class="flex justify-between text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">
                 <span>RPM Control</span>
                 <span class="text-amber-600">{{ (dataService.grinderSpeed() / 255 * 3000) | number:'1.0-0' }} RPM</span>
               </label>
               <input 
                 type="range" min="0" max="255" 
                 [value]="dataService.grinderSpeed()" 
                 (input)="updateSpeed(2, $event)"
                 [disabled]="!dataService.isTankConnected() && !dataService.isDemoMode()" 
                 class="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600">
            </div>

            <div class="flex items-center gap-2 mb-4">
               <div class="w-3 h-3 rounded-full" 
                    [class.bg-amber-500]="dataService.relay2State()"
                    [class.bg-stone-300]="!dataService.relay2State()"></div>
               <span class="font-mono text-xs font-bold uppercase" 
                     [class.text-amber-600]="dataService.relay2State()"
                     [class.text-stone-400]="!dataService.relay2State()">
                 {{ dataService.relay2State() ? 'GRINDING' : 'IDLE' }} 
                 ({{ dataService.grinderDirection() === 'F' ? 'FWD' : 'REV' }})
               </span>
            </div>

            <button 
              (click)="toggle(2)" 
              [disabled]="!dataService.isTankConnected() && !dataService.isDemoMode()"
              class="w-full px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              [class.bg-amber-50]="dataService.relay2State()"
              [class.text-amber-600]="dataService.relay2State()"
              [class.bg-stone-800]="!dataService.relay2State()"
              [class.text-white]="!dataService.relay2State()">
              @if (dataService.relay2State()) {
                <span>⏹ STOP GRINDER</span>
              } @else {
                <span>▶ START GRINDER</span>
              }
            </button>
          </div>
        </div>

        <!-- Motor 3: Agitator (Motor B) -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full"
             [class.border-stone-200]="!dataService.relay3State()"
             [class.border-blue-500]="dataService.relay3State()"
             [class.shadow-md]="dataService.relay3State()">
          
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="text-9xl font-black">3</span>
          </div>

          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50 text-2xl">🌪</div>
              <h3 class="text-2xl font-bold text-stone-700">Agitator</h3>
            </div>
            <p class="text-stone-500 text-sm">Mixer for fertilizer tank (Motor B).</p>
          </div>

          <div class="mt-6">
            
            <!-- Direction Control -->
            <div class="flex bg-stone-100 rounded-xl p-1 mb-4 border border-stone-200">
               <button 
                 (click)="setDir(3, 'F')"
                 [class.bg-white]="dataService.agitatorDirection() === 'F'"
                 [class.shadow-sm]="dataService.agitatorDirection() === 'F'"
                 [class.text-blue-600]="dataService.agitatorDirection() === 'F'"
                 [class.text-stone-400]="dataService.agitatorDirection() !== 'F'"
                 class="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                 @if(dataService.agitatorDirection() === 'F') { <span class="text-[10px] mr-1">●</span> }
                 ↻ FORWARD
               </button>
               <button 
                 (click)="setDir(3, 'B')"
                 [class.bg-white]="dataService.agitatorDirection() === 'B'"
                 [class.shadow-sm]="dataService.agitatorDirection() === 'B'"
                 [class.text-blue-600]="dataService.agitatorDirection() === 'B'"
                 [class.text-stone-400]="dataService.agitatorDirection() !== 'B'"
                 class="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                 @if(dataService.agitatorDirection() === 'B') { <span class="text-[10px] mr-1">●</span> }
                 ↺ REVERSE
               </button>
            </div>

            <!-- Speed Control Slider -->
            <div class="mb-6 bg-stone-50 p-3 rounded-xl border border-stone-100">
               <label class="flex justify-between text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">
                 <span>RPM Control</span>
                 <span class="text-blue-600">{{ (dataService.agitatorSpeed() / 255 * 1000) | number:'1.0-0' }} RPM</span>
               </label>
               <input 
                 type="range" min="0" max="255" 
                 [value]="dataService.agitatorSpeed()" 
                 (input)="updateSpeed(3, $event)"
                 [disabled]="!dataService.isTankConnected() && !dataService.isDemoMode()" 
                 class="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
            </div>

            <div class="flex items-center gap-2 mb-4">
               <div class="w-3 h-3 rounded-full" 
                    [class.bg-blue-500]="dataService.relay3State()"
                    [class.bg-stone-300]="!dataService.relay3State()"></div>
               <span class="font-mono text-xs font-bold uppercase" 
                     [class.text-blue-600]="dataService.relay3State()"
                     [class.text-stone-400]="!dataService.relay3State()">
                 {{ dataService.relay3State() ? 'RUNNING' : 'IDLE' }}
                 ({{ dataService.agitatorDirection() === 'F' ? 'FWD' : 'REV' }})
               </span>
            </div>

            <button 
              (click)="toggle(3)" 
              [disabled]="!dataService.isTankConnected() && !dataService.isDemoMode()"
              class="w-full px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              [class.bg-blue-50]="dataService.relay3State()"
              [class.text-blue-600]="dataService.relay3State()"
              [class.bg-stone-800]="!dataService.relay3State()"
              [class.text-white]="!dataService.relay3State()">
              @if (dataService.relay3State()) {
                <span>⏹ STOP AGITATOR</span>
              } @else {
                <span>▶ START AGITATOR</span>
              }
            </button>
          </div>
        </div>

      </div>
      
      <!-- Live Command Log -->
      <div class="mt-8 bg-stone-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-hidden shadow-inner">
        <div class="flex justify-between items-center mb-2 border-b border-stone-700 pb-1">
          <span class="text-stone-500 font-bold uppercase">Controller Terminal</span>
          <span class="text-stone-600">COM9600</span>
        </div>
        <div class="h-8 flex items-center">
           <span class="mr-2 text-stone-500">$</span>
           {{ dataService.lastCommand() || 'Ready...' }}
        </div>
      </div>
      
      <div class="mt-2 text-center text-stone-400 text-sm">
        <p>Ensure relay module and PWM drivers are connected to the Tank Controller (D4 Relay, D6/11 Motor A, D8/10 Motor B).</p>
      </div>
    </div>
  `
})
export class MotorControlComponent {
  dataService = inject(DataService);

  toggle(id: 1 | 2 | 3) {
    if (id === 1) this.dataService.toggleRelay(1, !this.dataService.relay1State());
    if (id === 2) this.dataService.toggleRelay(2, !this.dataService.relay2State());
    if (id === 3) this.dataService.toggleRelay(3, !this.dataService.relay3State());
  }

  setDir(id: 2 | 3, dir: 'F' | 'B') {
    this.dataService.setDirection(id, dir);
  }

  updateSpeed(id: 2 | 3, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.dataService.setMotorSpeed(id, val);
  }
}