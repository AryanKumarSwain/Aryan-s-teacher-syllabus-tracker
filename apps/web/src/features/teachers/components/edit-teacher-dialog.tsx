'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api-client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    id: string;
    user: { name: string; email: string; phone: string | null };
  } | null;
}

export function EditTeacherDialog({ open, onOpenChange, teacher }: EditTeacherDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (teacher && open) {
      reset({
        name: teacher.user.name,
        email: teacher.user.email,
        phone: teacher.user.phone || '',
      });
    }
  }, [teacher, open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!teacher) return;

    try {
      await api.patch(`/teachers/${teacher.id}`, data);
      toast.success('Teacher updated successfully');
      if (data.email !== teacher.user.email) {
        toast.success('New credentials sent to updated email');
      }
      onOpenChange(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update teacher');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">Edit Teacher</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Update teacher information. Changing the email will send new login credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Name</Label>
              <Input {...register('name')} className="rounded-xl" />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Email</Label>
              <Input type="email" {...register('email')} className="rounded-xl" />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              <p className="text-muted-foreground text-xs">
                Changing email will send new login credentials to the new address.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Phone</Label>
              <Input {...register('phone')} className="rounded-xl" />
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
