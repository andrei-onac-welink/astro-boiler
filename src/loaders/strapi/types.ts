export type StrapiStatus = "published" | "unpublished";

export type StrapiRecord = {
  id: number;
  documentId: string;
  publishedAt: string | null;
  updatedAt: string;
  strapiStatus?: StrapiStatus;
  [key: string]: unknown;
};

export type StrapiPagination = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
};

export type StrapiResponse<T> = {
  data: T[];
  meta?: {
    pagination?: StrapiPagination;
  };
};
