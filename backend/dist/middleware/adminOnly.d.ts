import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const adminOnly: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=adminOnly.d.ts.map