import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getDashboard: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSalesReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStockReport: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCashReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getWeeklyReport: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAbcReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCashDailyReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=reportController.d.ts.map