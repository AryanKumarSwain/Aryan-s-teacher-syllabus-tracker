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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher information. If you change the email, new login credentials will be sent to the new email address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            <p className="text-muted-foreground text-xs">
              Changing email will send new login credentials to the new address.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register('phone')} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
