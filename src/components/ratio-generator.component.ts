import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Fertilizer } from '../services/data.service';

@Component({
  selector: 'app-ratio-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto">
      <header class="mb-8">
        <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">Organic Mix Calculator</h2>
        <p class="text-stone-600">Generates a custom fertilizer recipe based on your soil's latest NPK readings.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Input Section -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 class="text-lg font-bold text-stone-700 mb-4 border-b pb-2">1. Configuration</h3>
          
          <!-- Crop Context Alert -->
          @if (dataService.selectedCrop()) {
            <div class="mb-6 bg-[#A47E3B]/10 border border-[#A47E3B]/20 p-4 rounded-xl flex items-start justify-between">
              <div>
                <span class="text-xs font-bold text-[#A47E3B] uppercase tracking-wider">Target Crop</span>
                <h4 class="font-bold text-stone-800 text-lg">{{ dataService.selectedCrop()?.name }}</h4>
                <div class="text-xs text-stone-500 mt-1 flex gap-2">
                  <span>Target N: {{ dataService.selectedCrop()?.idealN }}</span>
                  <span>P: {{ dataService.selectedCrop()?.idealP }}</span>
                  <span>K: {{ dataService.selectedCrop()?.idealK }}</span>
                </div>
              </div>
              <button (click)="dataService.selectedCrop.set(null)" class="text-stone-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          }

          <div class="mb-6">
            <label class="block text-sm font-medium text-stone-600 mb-2">Target Volume (Liquid/Solid)</label>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                [value]="targetVolume()" 
                (input)="updateVolume($event)"
                class="block w-full rounded-lg border-stone-300 bg-stone-50 border p-3 focus:ring-2 focus:ring-[#A47E3B] focus:outline-none"
                placeholder="e.g. 10">
              <span class="text-stone-500 font-medium">kg/L</span>
            </div>
          </div>

          <div class="bg-stone-50 p-4 rounded-lg">
            <h4 class="text-sm font-semibold text-stone-500 uppercase mb-2">Current Soil Levels</h4>
            @if (dataService.npkReadings().timestamp) {
              <div class="flex justify-between text-sm">
                <div class="flex flex-col items-center">
                  <span class="font-bold text-blue-600">N</span>
                  <span>{{ dataService.npkReadings().n }}</span>
                </div>
                <div class="flex flex-col items-center">
                  <span class="font-bold text-orange-600">P</span>
                  <span>{{ dataService.npkReadings().p }}</span>
                </div>
                <div class="flex flex-col items-center">
                  <span class="font-bold text-red-600">K</span>
                  <span>{{ dataService.npkReadings().k }}</span>
                </div>
              </div>
            } @else {
              <p class="text-red-500 text-sm italic">No readings available. Please scan soil first.</p>
            }
          </div>
        </div>

        <!-- Output Section -->
        <div class="bg-[#FDFBF5] p-6 rounded-2xl border-2 border-[#A47E3B] relative">
          <div class="absolute -top-3 left-6 bg-[#A47E3B] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Recommended Mix
          </div>

          @if (recommendation()) {
            <div class="mt-4">
              @if (recommendation()?.deficiency === 'None') {
                 <div class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="text-4xl mb-3">✅</div>
                    <h3 class="font-bold text-stone-800 text-lg">Soil Optimal</h3>
                    <p class="text-stone-500 text-sm mt-2">Current levels are sufficient for {{ dataService.selectedCrop() ? dataService.selectedCrop()?.name : 'general growth' }}.</p>
                 </div>
              } @else {
                <div class="flex items-center gap-3 mb-4">
                  <div class="text-4xl">🧪</div>
                  <div>
                    <h3 class="font-bold text-stone-800 text-lg">{{ recommendation()?.primaryFertilizer?.name }} Base</h3>
                    <p class="text-stone-500 text-sm">Targeting deficiency: <span class="font-bold text-red-500 uppercase">{{ recommendation()?.deficiency }}</span></p>
                  </div>
                </div>

                <div class="space-y-3">
                  <!-- Primary Ingredient -->
                  <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                    <span class="font-medium text-stone-700">{{ recommendation()?.primaryFertilizer?.name }}</span>
                    <span class="font-bold text-[#A47E3B] text-xl">{{ recommendation()?.primaryAmount }} <small class="text-xs text-stone-400">kg/L</small></span>
                  </div>

                  <!-- Filler/Water -->
                  <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                    <span class="font-medium text-stone-700">Base Medium (Water/Soil)</span>
                    <span class="font-bold text-stone-600 text-xl">{{ recommendation()?.baseAmount }} <small class="text-xs text-stone-400">kg/L</small></span>
                  </div>
                </div>
                
                <div class="mt-6 text-sm text-stone-500 bg-stone-100 p-3 rounded text-center">
                  Total Output: {{ targetVolume() }} kg/L
                </div>
              }
            </div>
          } @else {
             <div class="h-full flex items-center justify-center text-stone-400 italic">
               Waiting for soil data...
             </div>
          }
        </div>

      </div>

      <!-- Logic Explanation -->
      <div class="mt-8 bg-white p-6 rounded-xl border border-stone-100">
        <h4 class="font-bold text-stone-800 mb-2">Calculation Logic</h4>
        <p class="text-stone-600 text-sm leading-relaxed">
          @if (dataService.selectedCrop()) {
            This calculation compares your soil's current NPK levels against the <strong>specific requirements for {{ dataService.selectedCrop()?.name }}</strong>. 
            The system identifies the nutrient gap and suggests the best organic amendment to bridge it.
          } @else {
            The system analyzes the NPK readings to identify the 'limiting nutrient' based on general agricultural baselines.
            Select a crop in the Guide tab for more precise targeting.
          }
        </p>
      </div>
    </div>
  `
})
export class RatioGeneratorComponent {
  dataService = inject(DataService);
  targetVolume = signal<number>(10);

  updateVolume(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) {
      this.targetVolume.set(val);
    }
  }

  recommendation = computed(() => {
    const readings = this.dataService.npkReadings();
    if (!readings.timestamp) return null;

    let deficiency = 'Balanced';
    let targetNutrient = '';

    const crop = this.dataService.selectedCrop();

    if (crop) {
       // Crop specific logic: Calculate deficits
       const deficitN = crop.idealN - readings.n;
       const deficitP = crop.idealP - readings.p;
       const deficitK = crop.idealK - readings.k;

       if (deficitN <= 0 && deficitP <= 0 && deficitK <= 0) {
         return { deficiency: 'None' };
       }

       // Find biggest relative deficit
       // Normalize by ideal to find which is "most" missing percentage-wise
       const normN = deficitN > 0 ? deficitN / crop.idealN : 0;
       const normP = deficitP > 0 ? deficitP / crop.idealP : 0;
       const normK = deficitK > 0 ? deficitK / crop.idealK : 0;

       const maxDeficit = Math.max(normN, normP, normK);

       if (maxDeficit === normN) { deficiency = 'Nitrogen'; targetNutrient = 'n'; }
       else if (maxDeficit === normP) { deficiency = 'Phosphorus'; targetNutrient = 'p'; }
       else { deficiency = 'Potassium'; targetNutrient = 'k'; }

    } else {
      // General logic
      // Thresholds: N < 50, P < 20, K < 100
      const nScore = readings.n / 50;
      const pScore = readings.p / 20;
      const kScore = readings.k / 100;

      const minScore = Math.min(nScore, pScore, kScore);

      if (minScore === nScore) { deficiency = 'Nitrogen'; targetNutrient = 'n'; }
      else if (minScore === pScore) { deficiency = 'Phosphorus'; targetNutrient = 'p'; }
      else { deficiency = 'Potassium'; targetNutrient = 'k'; }
    }

    // Select Fertilizer
    const bestFit = [...this.dataService.fertilizers].sort((a, b) => {
      return (b as any)[targetNutrient] - (a as any)[targetNutrient];
    })[0];

    // Calculate Ratio
    const vol = this.targetVolume();
    const primaryAmount = parseFloat((vol * 0.6).toFixed(2));
    const baseAmount = parseFloat((vol * 0.4).toFixed(2));

    return {
      deficiency,
      primaryFertilizer: bestFit,
      primaryAmount,
      baseAmount
    };
  });
}