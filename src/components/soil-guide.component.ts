import { Component, inject, signal, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, SoilType, Crop, OrganicAdditive } from '../services/data.service';

declare var Chart: any;

@Component({
  selector: 'app-soil-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto pb-12">
      <!-- Navigation Tabs -->
      <nav class="flex flex-wrap justify-center bg-[#F1EADF] rounded-full p-2 mb-10 max-w-xl mx-auto shadow-sm">
        <button (click)="setTab('soils')" [class.active]="viewMode() === 'soils'" class="nav-button flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all">🌱 Soil Explorer</button>
        <button (click)="setTab('crops')" [class.active]="viewMode() === 'crops'" class="nav-button flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all">🌾 Crop Guide</button>
        <button (click)="setTab('organics')" [class.active]="viewMode() === 'organics'" class="nav-button flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all">♻️ Organic Solutions</button>
        <button (click)="setTab('references')" [class.active]="viewMode() === 'references'" class="nav-button flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all">📚 References</button>
      </nav>

      <main>
        <!-- Soils Section -->
        @if (viewMode() === 'soils') {
          <section class="animate-fade-in">
            <div class="text-center mb-8">
              <h2 class="text-3xl font-bold text-[#6A5A4F]">Soil Explorer</h2>
              <p class="mt-2 text-stone-600 max-w-2xl mx-auto">Select a soil type to explore its unique characteristics, nutrient profile, and the crops that thrive in it.</p>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              @for (soil of dataService.soils; track soil.id) {
                <button 
                  (click)="selectedSoil.set(soil)"
                  [class.border-[#A47E3B]]="selectedSoil().id === soil.id"
                  [class.shadow-md]="selectedSoil().id === soil.id"
                  class="p-4 rounded-lg border-2 border-[#DCD0C0] bg-white text-center hover:bg-[#FDFBF5] transition-all">
                  {{ soil.name }}
                </button>
              }
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-6 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 class="text-2xl font-bold text-[#A47E3B] mb-3">{{ selectedSoil().name }}</h3>
                <p class="mb-4 text-stone-700">{{ selectedSoil().characteristics }}</p>
                <div class="mb-4">
                  <h4 class="font-semibold text-lg mb-2">Nutrient Profile:</h4>
                  <div class="text-stone-600 text-sm" [innerHTML]="selectedSoil().profileText"></div>
                </div>
                <div>
                  <h4 class="font-semibold text-lg mb-2">Suitable Crops:</h4>
                  <p class="text-stone-600">{{ selectedSoil().crops }}</p>
                </div>
              </div>
              <div class="h-64 relative w-full">
                <canvas #soilChart></canvas>
              </div>
            </div>
          </section>
        }

        <!-- Crops Section -->
        @if (viewMode() === 'crops') {
          <section class="animate-fade-in">
            <div class="text-center mb-8">
              <h2 class="text-3xl font-bold text-[#6A5A4F]">Crop Nutrition Guide</h2>
              <p class="mt-2 text-stone-600 max-w-2xl mx-auto">Choose a crop to understand its specific nutritional needs. Use the 'Calculate' button to generate a fertilizer mix.</p>
            </div>

            <div class="flex justify-center mb-8">
              <select 
                (change)="onCropSelect($event)"
                class="p-3 border-2 border-[#DCD0C0] rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-[#A47E3B] focus:border-[#A47E3B] w-full max-w-xs outline-none font-medium">
                @for (crop of dataService.crops; track crop.name) {
                  <option [value]="crop.name" [selected]="selectedCrop().name === crop.name">{{ crop.name }}</option>
                }
              </select>
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-6 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <div class="flex justify-between items-start mb-3">
                   <h3 class="text-2xl font-bold text-[#A47E3B]">{{ selectedCrop().name }}</h3>
                   <button 
                     (click)="goToCalculator()"
                     class="bg-stone-800 hover:bg-[#A47E3B] text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2">
                     <span>🧪</span> Calculate Fertilizer Mix
                   </button>
                </div>
                
                <div class="mb-4">
                  <h4 class="font-semibold text-lg mb-2">Macronutrient Requirements:</h4>
                  <div class="text-stone-600 text-sm" [innerHTML]="selectedCrop().macro"></div>
                </div>
                <div>
                  <h4 class="font-semibold text-lg mb-2">Micronutrient Requirements:</h4>
                  <div class="text-stone-600 text-sm" [innerHTML]="selectedCrop().micro"></div>
                </div>
              </div>
              <div class="h-64 relative w-full">
                <canvas #cropChart></canvas>
              </div>
            </div>
          </section>
        }

        <!-- Organics Section -->
        @if (viewMode() === 'organics') {
          <section class="animate-fade-in">
            <div class="text-center mb-8">
              <h2 class="text-3xl font-bold text-[#6A5A4F]">Organic Solutions Composer</h2>
              <p class="mt-2 text-stone-600 max-w-2xl mx-auto">Start with a cow dung base and select an additive to create a custom organic fertilizer.</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              @for (additive of dataService.organicAdditives; track additive.id) {
                <button 
                  (click)="selectedAdditive.set(additive)"
                  [class.border-[#A47E3B]]="selectedAdditive().id === additive.id"
                  [class.shadow-md]="selectedAdditive().id === additive.id"
                  class="p-4 rounded-lg border-2 border-[#DCD0C0] bg-white text-center hover:bg-[#FDFBF5] transition-all min-h-[80px] flex flex-col items-center justify-center">
                  <span class="font-bold text-stone-700 block">{{ additive.name }}</span>
                  @if(additive.id !== 'reset') {
                    <span class="text-xs text-[#A47E3B] mt-1">+{{ additive.boosts }}</span>
                  }
                </button>
              }
            </div>

            <div class="bg-white rounded-2xl shadow-lg p-6 grid md:grid-cols-2 gap-6 items-center min-h-[400px]">
              <div>
                <h3 class="text-2xl font-bold text-[#A47E3B] mb-3">Result: {{ selectedAdditive().boosts }} Mix</h3>
                <p class="mb-4 text-stone-700">{{ selectedAdditive().description }}</p>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-stone-50 p-3 rounded-lg border border-stone-100">
                    <h4 class="font-semibold text-sm mb-1 text-stone-500">Base Material</h4>
                    <p class="text-stone-800 font-bold">Cow Dung</p>
                  </div>
                  <div class="bg-[#FDFBF5] p-3 rounded-lg border border-[#A47E3B]/20">
                    <h4 class="font-semibold text-sm mb-1 text-[#A47E3B]">Additive</h4>
                    <p class="text-stone-800 font-bold">{{ selectedAdditive().name.replace('Add ', '') }}</p>
                  </div>
                </div>
              </div>
              <div class="h-64 relative w-full">
                <canvas #organicChart></canvas>
              </div>
            </div>
          </section>
        }

        <!-- References Section -->
        @if (viewMode() === 'references') {
          <section class="animate-fade-in">
            <div class="text-center mb-8">
              <h2 class="text-3xl font-bold text-[#6A5A4F]">References</h2>
              <p class="mt-2 text-stone-600 max-w-2xl mx-auto">The data in this guide is supported by agricultural research from reputable institutions.</p>
            </div>
            <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
              <div>
                <h3 class="text-xl font-bold text-[#A47E3B] mb-2">Soil Nutrition & Types</h3>
                <ul class="list-disc list-inside space-y-2 text-stone-700">
                  <li><strong>"Soils of South India"</strong> by the Indian Council of Agricultural Research (ICAR).</li>
                  <li>Wani, S. P., et al. (2012). <strong>"Soil Fertility Atlas for Southern India."</strong> ICRISAT.</li>
                  <li>Tamil Nadu Agricultural University (TNAU) Agritech Portal. <strong>"Nutrient Management"</strong> section.</li>
                </ul>
              </div>
              <div>
                <h3 class="text-xl font-bold text-[#A47E3B] mb-2">Organic Amendments & Waste Utilization</h3>
                <ul class="list-disc list-inside space-y-2 text-stone-700">
                  <li>Garg, A., & Gupta, R. (2011). <strong>"Nutrient dynamics during composting."</strong> Journal of Environmental Management.</li>
                  <li>Reddy, D. D. (2013). <strong>"Integrated Nutrient Management for Sustainable Crop Production."</strong> IISS.</li>
                  <li>Mahimairaja, S., & Bolan, N. S. (2004). <strong>"Nutrient Value of Wood Ash."</strong> Journal of Plant Nutrition.</li>
                </ul>
              </div>
            </div>
          </section>
        }
      </main>
    </div>
  `
})
export class SoilGuideComponent {
  dataService = inject(DataService);
  
  viewMode = signal<'soils' | 'crops' | 'organics' | 'references'>('soils');
  
  selectedSoil = signal<SoilType>(this.dataService.soils[0]);
  selectedCrop = signal<Crop>(this.dataService.crops[0]);
  selectedAdditive = signal<OrganicAdditive>(this.dataService.organicAdditives[0]);

  // View Queries
  soilCanvas = viewChild<ElementRef>('soilChart');
  cropCanvas = viewChild<ElementRef>('cropChart');
  organicCanvas = viewChild<ElementRef>('organicChart');

  activeChart: any = null;

  constructor() {
    // Effect to render Soil Chart
    effect(() => {
      const mode = this.viewMode();
      const soil = this.selectedSoil();
      
      // Use setTimeout to allow DOM to settle after tab switch
      if (mode === 'soils') {
        setTimeout(() => this.renderSoilChart(soil), 0);
      }
    });

    // Effect to render Crop Chart
    effect(() => {
      const mode = this.viewMode();
      const crop = this.selectedCrop();
      
      if (mode === 'crops') {
        setTimeout(() => this.renderCropChart(crop), 0);
      }
    });

    // Effect to render Organic Chart
    effect(() => {
      const mode = this.viewMode();
      const additive = this.selectedAdditive();
      
      if (mode === 'organics') {
        setTimeout(() => this.renderOrganicChart(additive), 0);
      }
    });
  }

  setTab(tab: 'soils' | 'crops' | 'organics' | 'references') {
    this.viewMode.set(tab);
  }

  onCropSelect(event: Event) {
    const name = (event.target as HTMLSelectElement).value;
    const crop = this.dataService.crops.find(c => c.name === name);
    if (crop) this.selectedCrop.set(crop);
  }

  goToCalculator() {
    this.dataService.selectedCrop.set(this.selectedCrop());
    // Clear any AI findings so they don't pollute the manual crop calculation
    this.dataService.detectedDeficiencies.set([]);
    this.dataService.currentTab.set('ratio');
  }

  // --- Chart Rendering Logic ---

  private destroyChart() {
    if (this.activeChart) {
      this.activeChart.destroy();
      this.activeChart = null;
    }
  }

  private renderSoilChart(soil: SoilType) {
    const canvas = this.soilCanvas()?.nativeElement;
    if (!canvas) return;

    this.destroyChart();

    this.activeChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: Object.keys(soil.profile),
        datasets: [{
          label: `${soil.name} Levels`,
          data: Object.values(soil.profile),
          backgroundColor: 'rgba(164, 126, 59, 0.2)',
          borderColor: 'rgba(164, 126, 59, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(164, 126, 59, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: '#E5E7EB' },
            grid: { color: '#E5E7EB' },
            pointLabels: { font: { size: 12 }, color: '#4F4A45' },
            ticks: { display: false, stepSize: 1, max: 3, min: 0 }
          }
        }
      }
    });
  }

  private renderCropChart(crop: Crop) {
    const canvas = this.cropCanvas()?.nativeElement;
    if (!canvas) return;

    this.destroyChart();

    this.activeChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: Object.keys(crop.needs),
        datasets: [{
          label: 'Relative Requirement',
          data: Object.values(crop.needs),
          backgroundColor: ['#A47E3B', '#C8A572', '#E5D3B3'],
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { display: false, max: 3, min: 0 } },
          y: { grid: { display: false }, ticks: { color: '#4F4A45', font: { size: 14 } } }
        }
      }
    });
  }

  private renderOrganicChart(additive: OrganicAdditive) {
    const canvas = this.organicCanvas()?.nativeElement;
    if (!canvas) return;

    this.destroyChart();

    // Merge base + boost
    const finalNutrients: Record<string, number> = { ...this.dataService.organicBaseProfile };
    for (const [key, val] of Object.entries(additive.nutrientBoost)) {
      finalNutrients[key] = (finalNutrients[key] || 0) + val;
    }

    this.activeChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: Object.keys(finalNutrients),
        datasets: [{
          label: 'Nutrient Profile',
          data: Object.values(finalNutrients),
          backgroundColor: 'rgba(164, 126, 59, 0.2)',
          borderColor: 'rgba(164, 126, 59, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(164, 126, 59, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: '#E5E7EB' },
            grid: { color: '#E5E7EB' },
            pointLabels: { font: { size: 12 }, color: '#4F4A45' },
            ticks: { display: false, stepSize: 1, max: 4, min: 0 }
          }
        }
      }
    });
  }
}