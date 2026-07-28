import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createSale: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSales: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSaleById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelSale: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDailySummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=saleController.d.ts.map