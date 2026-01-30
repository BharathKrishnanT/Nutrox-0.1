import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NpkMonitorComponent } from './components/npk-monitor.component';
import { TankMonitorComponent } from './components/tank-monitor.component';
import { RatioGeneratorComponent } from './components/ratio-generator.component';
import { SoilGuideComponent } from './components/soil-guide.component';
import { MotorControlComponent } from './components/motor-control.component';
import { PlantAnalyserComponent } from './components/plant-analyser.component';
import { DataService, Tab } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    NpkMonitorComponent, 
    TankMonitorComponent, 
    RatioGeneratorComponent, 
    SoilGuideComponent, 
    MotorControlComponent,
    PlantAnalyserComponent
  ],
  template: `
    <div class="min-h-screen pb-12">
      <!-- Header -->
      <header class="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div class="container mx-auto px-4 h-20 flex items-center justify-between">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 bg-[#A47E3B] rounded-lg flex items-center justify-center text-white text-xl font-bold">🌱</div>
             <h1 class="text-xl md:text-2xl font-bold text-[#6A5A4F]">AgriSense</h1>
          </div>
          <nav class="hidden md:flex gap-1 overflow-x-auto">
            <button (click)="dataService.currentTab.set('readings')" [class]="getTabClass('readings')">NPK Readings</button>
            <button (click)="dataService.currentTab.set('tank')" [class]="getTabClass('tank')">Tank Monitor</button>
            <button (click)="dataService.currentTab.set('analyser')" [class]="getTabClass('analyser')">Plant AI</button>
            <button (click)="dataService.currentTab.set('motor')" [class]="getTabClass('motor')">Motor Control</button>
            <button (click)="dataService.currentTab.set('ratio')" [class]="getTabClass('ratio')">Ratio Calc</button>
            <button (click)="dataService.currentTab.set('guide')" [class]="getTabClass('guide')">Crop Guide</button>
          </nav>
        </div>
        
        <!-- Mobile Nav -->
        <div class="md:hidden flex overflow-x-auto gap-2 p-2 border-t border-stone-100 bg-stone-50">
           <button (click)="dataService.currentTab.set('readings')" [class]="getMobileTabClass('readings')">NPK</button>
           <button (click)="dataService.currentTab.set('tank')" [class]="getMobileTabClass('tank')">Tank</button>
           <button (click)="dataService.currentTab.set('analyser')" [class]="getMobileTabClass('analyser')">AI Scan</button>
           <button (click)="dataService.currentTab.set('motor')" [class]="getMobileTabClass('motor')">Motors</button>
           <button (click)="dataService.currentTab.set('ratio')" [class]="getMobileTabClass('ratio')">Calc</button>
           <button (click)="dataService.currentTab.set('guide')" [class]="getMobileTabClass('guide')">Guide</button>
        </div>
      </header>

      <!-- Content Area -->
      <main class="container mx-auto px-4 py-8">
        @switch (dataService.currentTab()) {
          @case ('readings') {
            <app-npk-monitor />
          }
          @case ('tank') {
            <app-tank-monitor />
          }
          @case ('analyser') {
            <app-plant-analyser />
          }
          @case ('motor') {
            <app-motor-control />
          }
          @case ('ratio') {
            <app-ratio-generator />
          }
          @case ('guide') {
            <app-soil-guide />
          }
        }
      </main>
    </div>
  `
})
export class AppComponent {
  dataService = inject(DataService);

  getTabClass(tab: Tab): string {
    const base = "px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ";
    return this.dataService.currentTab() === tab
      ? base + "bg-[#A47E3B] text-white shadow-md"
      : base + "text-stone-600 hover:bg-stone-100";
  }

  getMobileTabClass(tab: Tab): string {
    const base = "flex-1 px-3 py-2 rounded-md font-medium text-xs whitespace-nowrap ";
    return this.dataService.currentTab() === tab
      ? base + "bg-[#A47E3B] text-white"
      : base + "bg-white text-stone-600 border border-stone-200";
  }
}