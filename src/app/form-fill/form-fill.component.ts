import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { FormInstance } from '../shared/schema.types';
import { FormRendererComponent } from '../renderer/form-renderer.component';

@Component({
  selector: 'app-form-fill',
  standalone: true,
  imports: [CommonModule, RouterModule, FormRendererComponent],
  template: `
    <div class="wrap" *ngIf="instance">
      <div *ngIf="!submitted; else thanks">
        <app-form-renderer
          [schema]="instance.schema"
          mode="fill"
          (formReady)="onFormReady($event)"
        ></app-form-renderer>
        <button (click)="submit()" [disabled]="form?.invalid">Submit</button>
        <p class="error" *ngIf="error">{{ error }}</p>
      </div>
      <ng-template #thanks>
        <p>Thanks — your response has been submitted.</p>
        <!-- Internal-use link: the submissions list has no auth of its own,
             so this is a deliberate click, not something every submitter is
             auto-routed into (see README's known-shortcuts note). -->
        <a [routerLink]="['/templates', instance.templateId, 'submissions']">View all submissions</a>
      </ng-template>
    </div>
    <p *ngIf="notFound">This form is no longer available.</p>
  `,
  styles: [`
    .wrap { max-width: 600px; margin: 40px auto; padding: 16px; }
    button { margin-top: 16px; padding: 8px 20px; }
    .error { color: #c00; }
    a { display: inline-block; margin-top: 12px; color: #4a7dff; text-decoration: none; font-size: 14px; }
    a:hover { text-decoration: underline; }
  `],
})
export class FormFillComponent implements OnInit {
  instance: FormInstance | null = null;
  form: FormGroup | null = null;
  submitted = false;
  notFound = false;
  error = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getFormInstance(id).subscribe({
      next: (instance) => (this.instance = instance),
      error: () => (this.notFound = true),
    });
  }

  onFormReady(form: FormGroup): void {
    this.form = form;
  }

  submit(): void {
    if (!this.instance || !this.form) return;
    this.error = '';
    this.api.submitForm(this.instance.id, this.form.value).subscribe({
      next: () => (this.submitted = true),
      error: (err) => (this.error = err?.error?.message ?? 'Submission failed'),
    });
  }
}
