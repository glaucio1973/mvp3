import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const openCashRegister: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const closeCashRegister: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCurrentCashRegister: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCashHistory: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCashRegisterById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addCashMovement: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=cashController.d.ts.map