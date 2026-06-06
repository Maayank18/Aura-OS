import { z } from 'zod';

export const RegistrationValidationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  accountType: z.enum(['CLIENT', 'EMPLOYEE', 'GUARDIAN', 'COMMITTEE']),
  
  // Conditional payload fields validated entirely at the edge router layer
  employeeId: z.string().regex(/^[A-Za-z0-9]+$/).optional(),
  cohort: z.enum(['ENGINEERING', 'MARKETING', 'OPERATIONS', 'PRODUCT', 'HR']).optional(),
  inviteCode: z.string().optional(),
  password: z.string().min(8) // Adding password validation as it's typically required
}).refine((data) => {
  if (data.accountType === 'EMPLOYEE') {
    return !!data.employeeId && !!data.cohort; // Force error if fields are blank during employee registration
  }
  return true;
}, {
  message: "Employee registrations require a valid Employee ID and department cohort declaration.",
  path: ["employeeId"]
});

export const CommitteeAuditSchema = z.object({
  name: z.string().min(2),
  targetEmployeeId: z.string().regex(/^[A-Za-z0-9]+$/),
  password: z.string().min(8)
});

export const validateRegistration = (req, res, next) => {
  try {
    req.body = RegistrationValidationSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors
      });
    }
    next(error);
  }
};

export const validateCommitteeAudit = (req, res, next) => {
  try {
    req.body = CommitteeAuditSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Secure audit validation failed. All 3 security keys must match perfectly.",
        errors: error.errors
      });
    }
    next(error);
  }
};
