'use client';

import { useRef, useState } from 'react';
import { Download, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useBulkCreateTeachers, BulkTeacherRow, BulkResult } from '../hooks/use-teachers';

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Email', 'Phone'],
    ['John Smith', 'john@school.com', '9876543210'],
    ['Jane Doe', 'jane@school.com', '9123456789'],
  ]);
  ws['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  XLSX.writeFile(wb, 'teachers_template.xlsx');
}

function parseExcel(file: File): Promise<BulkTeacherRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = sheetName ? wb.Sheets[sheetName] : undefined;
        if (!ws) {
          resolve([]);
          return;
        }
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed: BulkTeacherRow[] = rows
          .map((r) => ({
            name: String(r['Name'] || r['name'] || '').trim(),
            email: String(r['Email'] || r['email'] || '').trim(),
            phone: String(r['Phone'] || r['phone'] || '').trim() || undefined,
          }))
          .filter((r) => r.name || r.email);
        resolve(parsed);
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BulkImportTeachersDialog({ open, onOpenChange }: Props) {
  const [preview, setPreview] = useState<BulkTeacherRow[]>([]);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkMutation = useBulkCreateTeachers();

  function reset() {
    setPreview([]);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setParsing(true);
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        alert('No valid rows found');
        return;
      }
      if (rows.length > 100) {
        alert('Maximum 100 teachers per import');
        return;
      }
      setPreview(rows);
      setResults(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setParsing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">Bulk Import Teachers</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Download the template, fill it in, then upload to import multiple teachers at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Step 1 */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Step 1 — Download template</p>
                <p className="text-slate-500 mt-0.5 text-xs">
                  Columns: <span className="font-mono text-slate-700">Name · Email · Phone</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate} className="shrink-0 rounded-xl">
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>

          {/* Step 2 — upload or preview */}
          {!results && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Step 2 — Upload filled Excel</p>
              {preview.length === 0 ? (
                <label
                  className="border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <Upload className="text-slate-400 mb-2 h-8 w-8" />
                  <p className="text-slate-500 text-sm">
                    {parsing ? 'Parsing...' : 'Click or drag & drop Excel file here'}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-slate-500 text-sm">
                      {preview.length} teacher{preview.length > 1 ? 's' : ''} ready to import
                    </p>
                    <Button size="sm" variant="ghost" onClick={reset} className="rounded-lg">
                      <X className="mr-1 h-3 w-3" /> Clear
                    </Button>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0 text-xs border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="text-slate-400 px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {row.name || <span className="text-destructive">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {row.email || <span className="text-destructive">—</span>}
                            </td>
                            <td className="text-slate-400 px-3 py-2">{row.phone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Import results</p>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 text-xs border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                        <td className="text-slate-500 px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">
                          {r.success ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" /> Imported
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100">
          {results ? (
            <Button className="w-full rounded-xl" variant="outline" onClick={() => handleClose(false)}>
              Done
            </Button>
          ) : preview.length > 0 ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={reset}
                disabled={bulkMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate(preview, {
                    onSuccess: (data) => setResults(data.results),
                  })
                }
              >
                {bulkMutation.isPending
                  ? `Importing ${preview.length} teachers...`
                  : `Import ${preview.length} teachers`}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full rounded-xl" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
