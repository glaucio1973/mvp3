import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
export declare const upload: multer.Multer;
export declare const getProducts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProductById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const adjustStock: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCategories: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPriceHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStockMovements: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=productController.d.ts.map