import { Request, Response } from "express";
export declare function createProduct(req: Request, res: Response): Promise<void>;
export declare function getAllProducts(req: Request, res: Response): Promise<void>;
export declare function getProductById(req: Request, res: Response): Promise<void>;
export declare function getAssignedProducts(_req: Request, res: Response): Promise<void>;
export declare function updateProduct(req: Request, res: Response): Promise<void>;
export declare function deleteProduct(req: Request, res: Response): Promise<void>;
export declare function generateProductQr(req: Request, res: Response): Promise<void>;
