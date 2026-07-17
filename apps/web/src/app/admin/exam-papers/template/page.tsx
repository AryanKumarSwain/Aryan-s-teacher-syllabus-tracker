'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api-client';
import { env } from '@/config/env';

export default function ExamPaperTemplatePage() {
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [instructions, setInstructions] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get<any>('/exam-papers/template').then((template) => {
      setHeaderHtml(template?.headerHtml ?? '');
      setFooterHtml(template?.footerHtml ?? '');
      setInstructions(template?.instructions ?? '');
      setLogoUrl(template?.logoUrl ?? '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await api.post('/exam-papers/template', { headerHtml, footerHtml, instructions, logoUrl });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`${env.apiUrl}/exam-papers/template/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setLogoUrl(data.data.logoUrl);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardShell title="Exam Paper Template">
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <Label>School Logo</Label>
          {logoUrl && (
            <div className="mt-2">
              <img src={logoUrl} alt="School Logo" className="h-20 w-20 object-contain rounded border border-gray-200" />
            </div>
          )}
          <div className="mt-2">
            <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
            {uploading && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
          </div>
        </div>
        <div>
          <Label>Header HTML</Label>
          <Input value={headerHtml} onChange={(e) => setHeaderHtml(e.target.value)} />
        </div>
        <div>
          <Label>Footer HTML</Label>
          <Input value={footerHtml} onChange={(e) => setFooterHtml(e.target.value)} />
        </div>
        <div>
          <Label>Exam Instructions</Label>
          <Textarea 
            value={instructions} 
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)} 
            placeholder="Enter instructions for the exam paper..."
            rows={4}
          />
        </div>
        <Button onClick={handleSave}>Save Template</Button>
      </div>
    </DashboardShell>
  );
}
