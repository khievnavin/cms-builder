import {
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

/**
 * Two-way `contenteditable` binding for on-page (WordPress-style) inline
 * editing. Writes the model into the DOM only when it actually differs and
 * the element isn't focused, so typing never loses the caret. Emits the
 * element's innerHTML on blur.
 *
 *   <h2 [(appEditable)]="block.text" [appEditableEnabled]="editing"></h2>
 */
@Directive({
  selector: '[appEditable]',
  standalone: true,
})
export class EditableDirective implements OnChanges {
  @Input('appEditable') model = '';
  @Input('appEditableEnabled') enabled = false;
  /** When true, Enter commits (blurs) instead of inserting a newline. */
  @Input() singleLine = false;
  @Output() appEditableChange = new EventEmitter<string>();

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostBinding('attr.contenteditable') get ce(): string | null {
    return this.enabled ? 'plaintext-only' : null;
  }
  @HostBinding('class.is-editable') get flag(): boolean {
    return this.enabled;
  }

  ngOnChanges(): void {
    const el = this.el.nativeElement;
    if (document.activeElement !== el && el.innerHTML !== (this.model ?? '')) {
      el.innerHTML = this.model ?? '';
    }
  }

  @HostListener('blur')
  onBlur(): void {
    const html = this.el.nativeElement.innerHTML;
    if (html !== this.model) {
      this.model = html;
      this.appEditableChange.emit(html);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (this.singleLine && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.el.nativeElement.blur();
    }
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent): void {
    // While editing, clicks are for placing the caret — don't let the block
    // wrapper treat them as a (re)select / navigation.
    if (this.enabled) e.stopPropagation();
  }
}
