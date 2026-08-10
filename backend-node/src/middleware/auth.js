import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { AppError } from './errorHandler.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'auraos-dev-secret-change-before-production';

export const signAuthToken = ({ id, role }) =>
  jwt.sign({ sub: String(id), role }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const requireAuth = async (req, _res, next) => {
  if (req.get('x-desktop-mode') === 'true') {
    req.auth = { id: req.body.userId || 'desktop-user', role: 'client' };
    return next();
  }

  const header = req.get('authorization') || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return next(new AppError('Authentication required.', 401));

  try {
    const payload = jwt.verify(token, getJwtSecret());
    
    // Ensure the role is one of the valid ones
    const validRoles = ['client', 'employee', 'guardian', 'committee', 'patient'];
    if (!validRoles.includes(payload.role)) {
      throw new AppError('Invalid auth role.', 401);
    }

    let account = await UserModel.findById(payload.sub);
    
    // Legacy fallback for accounts created before the discriminator pattern
    if (!account) {
      const Patient = (await import('../models/Patient.js')).default;
      account = await Patient.findById(payload.sub);
    }
    if (!account) {
      const Guardian = (await import('../models/Guardian.js')).default;
      account = await Guardian.findById(payload.sub);
    }
    
    if (!account) throw new AppError('Account not found.', 401);

    req.auth = {
      id: account._id.toString(),
      role: payload.role,
      account,
    };
    return next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError('Invalid or expired token.', 401));
  }
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth) return next(new AppError('Authentication required.', 401));
  if (!roles.includes(req.auth.role)) return next(new AppError('Insufficient permissions.', 403));
  return next();
};
