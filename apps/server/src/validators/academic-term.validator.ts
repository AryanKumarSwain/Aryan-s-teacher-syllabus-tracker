import { z } from 'zod';

export const createAcademicTermSchema = z
  .object({
    schoolId: z.string().uuid('Invalid school ID format'),
    academicSessionId: z.string().uuid('Invalid academic session ID'),
    name: z.string().min(1, 'Term name is required'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    weeklyHolidays: z.array(z.number().int().min(0).max(6)).default([0]),
    vacationDays: z
      .array(
        z.object({
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
          reason: z.string().optional(),
        }),
      )
      .optional(),
    terms: z
      .array(
        z.object({
          name: z.string().optional(),
          startDate: z.coerce.date().optional(),
          endDate: z.coerce.date().optional(),
        }),
      )
      .optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
  })
  .refine(
    (data) => {
      const diffDays = Math.round(
        (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays <= 380;
    },
    {
      message: 'Academic session date range cannot exceed 380 days (~1 academic year). For subsequent years, please create a separate academic session.',
    },
  )
  .refine(
    (data) => {
      const diffDays = Math.round(
        (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays >= 30;
    },
    {
      message: 'Academic session date range must be at least 30 days.',
    },
  );

export const updateAcademicTermSchema = z
  .object({
    name: z.string().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    weeklyHolidays: z.array(z.number().int().min(0).max(6)).optional(),
    status: z.enum(['ACTIVE', 'UPCOMING', 'COMPLETED', 'ARCHIVED']).optional(),
    terms: z
      .array(
        z.object({
          name: z.string().optional(),
          startDate: z.coerce.date().optional(),
          endDate: z.coerce.date().optional(),
        }),
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const diffDays = Math.round(
          (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diffDays <= 380;
      }
      return true;
    },
    {
      message: 'Academic session date range cannot exceed 380 days (~1 academic year). For subsequent years, please create a separate academic session.',
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const diffDays = Math.round(
          (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diffDays >= 30;
      }
      return true;
    },
    {
      message: 'Academic session date range must be at least 30 days.',
    },
  );

export const addVacationDaySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
  });
