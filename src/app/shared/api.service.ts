import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FormInstance,
  Page,
  PageContent,
  PageStyleConfig,
  PublishedPage,
  Submission,
  Template,
  TemplateSchema,
} from './schema.types';

const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Templates (builder — requires auth once Keycloak guard is enabled)
  listTemplates(): Observable<Template[]> {
    return this.http.get<Template[]>(`${API_BASE}/templates`);
  }

  getTemplate(id: string): Observable<Template> {
    return this.http.get<Template>(`${API_BASE}/templates/${id}`);
  }

  createTemplate(name: string, description?: string): Observable<Template> {
    return this.http.post<Template>(`${API_BASE}/templates`, { name, description });
  }

  updateTemplate(id: string, updates: { name?: string; description?: string }): Observable<Template> {
    return this.http.put<Template>(`${API_BASE}/templates/${id}`, updates);
  }

  saveTemplateSchema(id: string, schema: TemplateSchema): Observable<Template> {
    return this.http.put<Template>(`${API_BASE}/templates/${id}/schema`, schema);
  }

  publishTemplate(id: string): Observable<FormInstance> {
    return this.http.post<FormInstance>(`${API_BASE}/templates/${id}/publish`, {});
  }

  listTemplateSubmissions(templateId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${API_BASE}/templates/${templateId}/submissions`);
  }

  // Form instances (client-facing — public read)
  getFormInstance(id: string): Observable<FormInstance> {
    return this.http.get<FormInstance>(`${API_BASE}/form-instances/${id}`);
  }

  listFormInstances(templateId: string): Observable<FormInstance[]> {
    return this.http.get<FormInstance[]>(`${API_BASE}/form-instances`, {
      params: { templateId },
    });
  }

  // Submissions
  submitForm(formInstanceId: string, data: Record<string, unknown>): Observable<Submission> {
    return this.http.post<Submission>(
      `${API_BASE}/form-instances/${formInstanceId}/submissions`,
      data,
    );
  }

  listSubmissions(formInstanceId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(
      `${API_BASE}/form-instances/${formInstanceId}/submissions`,
    );
  }

  // Pages (website CMS — builder side)
  listPages(): Observable<Page[]> {
    return this.http.get<Page[]>(`${API_BASE}/pages`);
  }

  getPage(id: string): Observable<Page> {
    return this.http.get<Page>(`${API_BASE}/pages/${id}`);
  }

  createPage(title: string): Observable<Page> {
    return this.http.post<Page>(`${API_BASE}/pages`, { title });
  }

  updatePage(id: string, updates: { title?: string; slug?: string }): Observable<Page> {
    return this.http.put<Page>(`${API_BASE}/pages/${id}`, updates);
  }

  savePageContent(
    id: string,
    content: PageContent,
    pageStyle: PageStyleConfig,
  ): Observable<Page> {
    return this.http.put<Page>(`${API_BASE}/pages/${id}/content`, { content, pageStyle });
  }

  publishPage(id: string): Observable<PublishedPage> {
    return this.http.post<PublishedPage>(`${API_BASE}/pages/${id}/publish`, {});
  }

  // Public: the live website
  getLivePage(slug: string): Observable<PublishedPage> {
    return this.http.get<PublishedPage>(`${API_BASE}/site/${slug}`);
  }
}
