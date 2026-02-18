import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, OrganicAdditive } from '../services/data.service';

interface RecipeItem {
  name: string;
  amount: number;
  reason: string;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-ratio-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-5xl mx-auto">
      <header class="mb-8">
        <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">Organic Mix Calculator</h2>
        <p class="text-stone-600">Generates a custom fertilizer recipe based on your soil's latest NPK readings and AI diagnostics.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Input Section -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 h-fit">
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

          <!-- AI Deficiencies Alert -->
          @if (dataService.detectedDeficiencies().length > 0) {
            <div class="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl">
               <div class="flex items-center gap-2 mb-2">
                 <span class="text-xl">🤖</span>
                 <span class="font-bold text-red-800 text-sm">AI Plant Diagnosis Active</span>
               </div>
               <div class="flex flex-wrap gap-2">
                 @for (def of dataService.detectedDeficiencies(); track def) {
                   <span class="px-2 py-1 bg-white border border-red-100 rounded text-xs font-bold text-red-600 uppercase">{{ def }}</span>
                 }
               </div>
               <p class="text-xs text-red-700 mt-2">The recipe will be adjusted to treat these specific deficiencies.</p>
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
        <div class="bg-[#FDFBF5] rounded-2xl border-2 border-[#A47E3B] relative overflow-hidden flex flex-col">
          <div class="bg-[#A47E3B] px-6 py-4 flex justify-between items-center">
            <h3 class="text-white font-bold text-lg">Custom Fertilizer Mix</h3>
            <span class="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded">
               For {{ dataService.selectedCrop() ? dataService.selectedCrop()?.name : 'General Growth' }}
            </span>
          </div>

          @if (recommendation()) {
            <div class="p-6 flex-1 flex flex-col">
               
               <!-- Summary -->
               <div class="text-center mb-6">
                 <div class="text-4xl font-bold text-stone-800">{{ targetVolume() }} <span class="text-lg text-stone-500 font-normal">kg/L</span></div>
                 <div class="text-stone-500 text-sm">Total Output Yield</div>
               </div>

               <!-- Ingredients List -->
               <div class="space-y-4">
                 
                 <!-- Part 1: Base -->
                 <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-stone-400">
                    <div class="flex justify-between items-start mb-1">
                      <h4 class="font-bold text-stone-700">1. Base Medium</h4>
                      <span class="font-bold text-xl text-stone-600">{{ recommendation()?.base?.amount }} <small class="text-xs">kg/L</small></span>
                    </div>
                    <p class="text-stone-600 text-sm">{{ recommendation()?.base?.name }}</p>
                    <p class="text-xs text-stone-400 mt-1 italic">{{ recommendation()?.base?.reason }}</p>
                 </div>

                 <!-- Part 2: Compost -->
                 <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-600">
                    <div class="flex justify-between items-start mb-1">
                      <h4 class="font-bold text-stone-700">2. Organic Compost</h4>
                      <span class="font-bold text-xl text-amber-700">{{ recommendation()?.compost?.amount }} <small class="text-xs">kg/L</small></span>
                    </div>
                    <p class="text-stone-600 text-sm">{{ recommendation()?.compost?.name }}</p>
                    <p class="text-xs text-stone-400 mt-1 italic">{{ recommendation()?.compost?.reason }}</p>
                 </div>

                 <!-- Part 3: Booster (The "Manufacturing" bit) -->
                 <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                    <div class="flex justify-between items-start mb-1">
                       <div class="flex items-center gap-2">
                         <h4 class="font-bold text-stone-700">3. Target Booster</h4>
                         <span class="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Essential</span>
                       </div>
                       <span class="font-bold text-xl text-red-600">{{ recommendation()?.booster?.amount }} <small class="text-xs">kg/L</small></span>
                    </div>
                    <p class="text-stone-800 font-bold text-sm">{{ recommendation()?.booster?.name }}</p>
                    <p class="text-xs text-red-500 mt-1 font-medium">{{ recommendation()?.booster?.reason }}</p>
                 </div>

               </div>

            </div>
          } @else {
             <div class="h-full flex items-center justify-center text-stone-400 italic p-10">
               Waiting for data to generate recipe...
             </div>
          }
        </div>

      </div>

      <!-- Logic Explanation -->
      <div class="mt-8 bg-white p-6 rounded-xl border border-stone-100">
        <h4 class="font-bold text-stone-800 mb-2">Why this mix?</h4>
        <p class="text-stone-600 text-sm leading-relaxed">
           This formula uses a <strong>{{ recommendation()?.base?.percent }}% Base</strong>, <strong>{{ recommendation()?.compost?.percent }}% Compost</strong>, and <strong>{{ recommendation()?.booster?.percent }}% Booster</strong> ratio.
           @if (dataService.detectedDeficiencies().length > 0) {
             The booster was specifically selected to address the <strong>{{ dataService.detectedDeficiencies()[0] }}</strong> detected by the AI analysis.
           } @else {
             The booster was selected to bridge the gap between your soil's current NPK levels and the optimal requirements for <strong>{{ dataService.selectedCrop() ? dataService.selectedCrop()?.name : 'general crops' }}</strong>.
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
    // 1. Gather Inputs
    const vol = this.targetVolume();
    const readings = this.dataService.npkReadings();
    const crop = this.dataService.selectedCrop();
    const aiDeficiencies = this.dataService.detectedDeficiencies(); // From Plant AI
    const allAdditives = this.dataService.organicAdditives;

    // 2. Define Ratios (Manufacturing Recipe)
    // 50% Base, 30% Compost, 20% Booster
    const ratioBase = 0.5;
    const ratioCompost = 0.3;
    const ratioBooster = 0.2;

    const amountBase = parseFloat((vol * ratioBase).toFixed(2));
    const amountCompost = parseFloat((vol * ratioCompost).toFixed(2));
    const amountBooster = parseFloat((vol * ratioBooster).toFixed(2));

    // 3. Determine Ingredients
    
    // -- A. Base Medium --
    const baseItem: RecipeItem = {
      name: 'Garden Soil / Potting Mix',
      amount: amountBase,
      reason: 'Provides volume and root support medium.',
      color: 'stone',
      percent: ratioBase * 100
    };

    // -- B. Organic Compost --
    // Prefer Vermicompost if available, else Cow Dung
    const vermi = allAdditives.find(a => a.id === 'vermicompost');
    const cow = allAdditives.find(a => a.id === 'reset');
    const compostChoice = vermi || cow || { name: 'Compost' };
    
    const compostItem: RecipeItem = {
      name: compostChoice.name,
      amount: amountCompost,
      reason: 'Ensures baseline NPK, microbial activity, and soil structure.',
      color: 'amber',
      percent: ratioCompost * 100
    };

    // -- C. Target Booster (The intelligent part) --
    let boosterChoice: OrganicAdditive | undefined;
    let boosterReason = '';

    // Priority 1: AI Detected Deficiency (Specific Micro/Macro nutrients)
    if (aiDeficiencies.length > 0) {
      const def = aiDeficiencies[0].toLowerCase();
      
      if (def.includes('magnesium')) boosterChoice = allAdditives.find(a => a.nutrientBoost['Mg']);
      else if (def.includes('calcium')) boosterChoice = allAdditives.find(a => a.nutrientBoost['Ca']);
      else if (def.includes('sulphur')) boosterChoice = allAdditives.find(a => a.nutrientBoost['S']);
      else if (def.includes('nitrogen')) boosterChoice = allAdditives.find(a => a.nutrientBoost['N']);
      else if (def.includes('phosphorus')) boosterChoice = allAdditives.find(a => a.nutrientBoost['P']);
      else if (def.includes('potassium')) boosterChoice = allAdditives.find(a => a.nutrientBoost['K']);

      if (boosterChoice) {
        boosterReason = `Targeted fix for AI-detected ${def} deficiency.`;
      }
    }

    // Priority 2: Sensor NPK Gaps (if no AI deficiency or mapping failed)
    if (!boosterChoice && readings.timestamp) {
       let targetNutrient = 'N';
       
       if (crop) {
         // Calculate gap from Ideal
         const gapN = (crop.idealN - readings.n) / crop.idealN;
         const gapP = (crop.idealP - readings.p) / crop.idealP;
         const gapK = (crop.idealK - readings.k) / crop.idealK;
         
         const maxGap = Math.max(gapN, gapP, gapK);
         if (maxGap === gapN) targetNutrient = 'N';
         else if (maxGap === gapP) targetNutrient = 'P';
         else targetNutrient = 'K';

         boosterReason = `Compensates for low ${targetNutrient} levels required by ${crop.name}.`;
       } else {
         // General Baseline (50-20-100)
         const nScore = readings.n / 50;
         const pScore = readings.p / 20;
         const kScore = readings.k / 100;
         
         const minScore = Math.min(nScore, pScore, kScore);
         if (minScore === nScore) targetNutrient = 'N';
         else if (minScore === pScore) targetNutrient = 'P';
         else targetNutrient = 'K';

         boosterReason = `Boosts ${targetNutrient}, the limiting nutrient in current soil.`;
       }

       // Find best additive for this nutrient
       boosterChoice = allAdditives.find(a => a.nutrientBoost[targetNutrient] >= 2);
    }

    // Fallback if nothing specific needed or found
    if (!boosterChoice) {
      boosterChoice = allAdditives.find(a => a.id === 'vermicompost'); // More vermicompost
      boosterReason = 'General purpose nutrient booster.';
    }

    const boosterItem: RecipeItem = {
      name: boosterChoice?.name || 'General Booster',
      amount: amountBooster,
      reason: boosterReason,
      color: 'red',
      percent: ratioBooster * 100
    };

    return {
      base: baseItem,
      compost: compostItem,
      booster: boosterItem
    };
  });
}