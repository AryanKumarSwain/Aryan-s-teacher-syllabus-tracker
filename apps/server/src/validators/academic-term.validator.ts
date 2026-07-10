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
  });

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
