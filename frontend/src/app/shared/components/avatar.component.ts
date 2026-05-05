import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ============================================================
      EDITABLE MODE
      Strategy: <input type="file"> is INSIDE the <label>.
      Clicking the label (the avatar) natively opens the file picker
      without any JavaScript .click() — works on ALL browsers.
    ============================================================ -->
    <label *ngIf="editable"
      class="relative group block cursor-pointer"
      [style.width]="sizeStyle"
      [style.height]="sizeStyle"
      (click)="$event.stopPropagation()">

      <!-- Invisible file input INSIDE the label (most reliable pattern) -->
      <input
        type="file"
        accept="image/*"
        style="position:absolute;width:0;height:0;opacity:0;overflow:hidden;pointer-events:none;"
        (change)="onFileSelected($event)"
      >

      <!-- Avatar container -->
      <div class="w-full h-full rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200/50 relative">

        <!-- Photo -->
        <img *ngIf="url && !imageError"
          [src]="url"
          (error)="onImageError()"
          alt="Avatar"
          class="w-full h-full object-cover"
        >

        <!-- Initiales (fallback) -->
        <span *ngIf="!url || imageError"
          class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black select-none"
          [style.fontSize]="initFontSize">
          {{ initials }}
        </span>

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    flex flex-col items-center justify-center gap-1 rounded-2xl z-10">
          <i class="fas fa-camera text-white text-xl"></i>
          <span class="text-[10px] text-white font-bold uppercase tracking-wider">Changer</span>
        </div>
      </div>

      <!-- Delete button — preventDefault stops the label from opening file picker -->
      <button *ngIf="url && !imageError"
        type="button"
        (click)="$event.preventDefault(); $event.stopPropagation(); onDeleteClick()"
        class="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600
               text-white rounded-full flex items-center justify-center shadow-md z-20
               transition-colors duration-200"
        title="Supprimer la photo">
        <i class="fas fa-times text-[10px]"></i>
      </button>
    </label>

    <!-- ============================================================
      READ-ONLY MODE
    ============================================================ -->
    <div *ngIf="!editable"
      class="rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center
             border-2 border-white shadow-sm ring-1 ring-slate-200/50"
      [style.width]="sizeStyle"
      [style.height]="sizeStyle">

      <img *ngIf="url && !imageError"
        [src]="url"
        (error)="onImageError()"
        alt="Avatar"
        class="w-full h-full object-cover"
      >
      <span *ngIf="!url || imageError"
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black select-none"
        [style.fontSize]="initFontSize">
        {{ initials }}
      </span>
    </div>
  `,
  styles: [`:host { display: inline-block; position: relative; }`]
})
export class AvatarComponent implements OnChanges {
  @Input() url: string | undefined;
  @Input() name: string = '';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() editable: boolean = false;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() avatarRemoved = new EventEmitter<void>();
  @Output() onError = new EventEmitter<string>();

  imageError = false;

  private readonly sizeMap: Record<string, { px: string; font: string }> = {
    xs:  { px: '24px',   font: '10px' },
    sm:  { px: '40px',   font: '14px' },
    md:  { px: '64px',   font: '18px' },
    lg:  { px: '96px',   font: '24px' },
    xl:  { px: '128px',  font: '36px' },
  };

  get sizeStyle(): string { return this.sizeMap[this.size]?.px ?? this.sizeMap['md'].px; }
  get initFontSize(): string { return this.sizeMap[this.size]?.font ?? this.sizeMap['md'].font; }

  get initials(): string {
    if (!this.name?.trim()) return '?';
    const parts = this.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['url']) this.imageError = false;
  }

  onImageError() { this.imageError = true; }

  onDeleteClick() {
    this.avatarRemoved.emit();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Reset so same file can be selected again
    input.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.onError.emit('Le fichier doit être une image (JPG, PNG, WEBP…).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.onError.emit('La taille de l\'image ne doit pas dépasser 5 Mo.');
      return;
    }

    this.imageError = false;
    this.fileSelected.emit(file);
  }
}
