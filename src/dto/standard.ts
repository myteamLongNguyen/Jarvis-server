export class ValidationErrorDetail {
  isEmail?: string;
}

export class ErrorItem {
  id?: string;
  message?: string;
  error?: ValidationErrorDetail;
}

export class StandardMultipleErrorsResponse {
  success: false;
  errorList?: ErrorItem[];
}

export class StandardPaginatedResponse<T> {
  offset: number;
  limit: number;
  total: number;
  items: T[];
}

export class StandardResponse {
  success: boolean;
  message: string;
}

export class StandardDataResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
