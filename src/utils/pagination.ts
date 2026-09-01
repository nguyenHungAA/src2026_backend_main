import type { Request } from 'express';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export type Pagination = {
    page: number;
    limit: number;
    skip: number;
};

export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

type PaginationResult =
    | { pagination: null; error: null }
    | { pagination: Pagination; error: null }
    | { pagination: null; error: string };

const readPositiveInteger = (value: unknown, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parsePagination = (query: Request['query']): PaginationResult => {
    const requested = query.page !== undefined || query.limit !== undefined;
    if (!requested) return { pagination: null, error: null };

    const page = readPositiveInteger(query.page, 1);
    const limit = readPositiveInteger(query.limit, DEFAULT_PAGE_SIZE);
    if (page === null || limit === null) {
        return { pagination: null, error: 'page and limit must be positive integers' };
    }

    if (limit > MAX_PAGE_SIZE) {
        return { pagination: null, error: `limit must not exceed ${MAX_PAGE_SIZE}` };
    }

    return {
        pagination: { page, limit, skip: (page - 1) * limit },
        error: null,
    };
};

export const createPaginationMeta = (
    total: number,
    pagination: Pagination,
): PaginationMeta => ({
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
});
