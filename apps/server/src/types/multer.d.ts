declare module 'multer' {
  import { RequestHandler } from 'express';

  namespace multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }

    interface StorageEngine {
      _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): void;
      _removeFile(req: any, file: any, cb: (error: any) => void): void;
    }

    interface Options {
      dest?: string;
      storage?: StorageEngine;
      limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
      };
      preservePath?: boolean;
    }

    interface Instance {
      single(fieldName?: string): RequestHandler;
      array(fieldName?: string, maxCount?: number): RequestHandler;
      fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
      none(): RequestHandler;
      any(): RequestHandler;
    }

    function memoryStorage(): StorageEngine;
    function diskStorage(options?: any): StorageEngine;
  }

  function multer(options?: multer.Options): multer.Instance;

  export = multer;
}
