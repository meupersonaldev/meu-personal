"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPaginationHeaders = exports.buildFilterClauses = exports.buildOrderClause = exports.buildPaginatedResponse = exports.extractFilters = exports.extractPagination = void 0;
const extractPagination = (req, res, next) => {
    const { page = '1', limit = '20', sortBy, sortOrder = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const allowedSortOrders = ['asc', 'desc'];
    const finalSortOrder = allowedSortOrders.includes(sortOrder)
        ? sortOrder
        : 'desc';
    req.pagination = {
        page: pageNum,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
        sortBy: sortBy,
        sortOrder: finalSortOrder
    };
    next();
};
exports.extractPagination = extractPagination;
const extractFilters = (allowedFilters) => {
    return (req, res, next) => {
        const filters = {};
        allowedFilters.forEach(filter => {
            if (req.query[filter] !== undefined && req.query[filter] !== '') {
                filters[filter] = req.query[filter];
            }
        });
        if (req.query.startDate) {
            filters.startDate = req.query.startDate;
        }
        if (req.query.endDate) {
            filters.endDate = req.query.endDate;
        }
        if (req.query.search) {
            filters.search = req.query.search;
        }
        ;
        req.filters = filters;
        next();
    };
};
exports.extractFilters = extractFilters;
const buildPaginatedResponse = (data, total, pagination, filters) => {
    const totalPages = Math.ceil(total / pagination.limit);
    return {
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1
        },
        filters
    };
};
exports.buildPaginatedResponse = buildPaginatedResponse;
const buildOrderClause = (sortBy, sortOrder = 'desc') => {
    if (!sortBy) {
        return { created_at: { ascending: sortOrder === 'asc' } };
    }
    const fieldMap = {
        'name': 'name',
        'email': 'email',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'status': 'status',
        'amount': 'amount',
        'date': 'date'
    };
    const columnName = fieldMap[sortBy] || sortBy;
    return { [columnName]: { ascending: sortOrder === 'asc' } };
};
exports.buildOrderClause = buildOrderClause;
const buildFilterClauses = (filters, query) => {
    if (!filters)
        return query;
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '')
            return;
        switch (key) {
            case 'search':
                query = query.or(`name.ilike.%${value}%,email.ilike.%${value}%`);
                break;
            case 'status':
                query = query.eq('status', value);
                break;
            case 'startDate':
                query = query.gte('created_at', value);
                break;
            case 'endDate':
                query = query.lte('created_at', value);
                break;
            case 'franqueadora_id':
                query = query.eq('franqueadora_id', value);
                break;
            case 'academy_id':
                query = query.eq('academy_id', value);
                break;
            case 'is_active':
                query = query.eq('is_active', value === 'true');
                break;
            default:
                query = query.eq(key, value);
                break;
        }
    });
    return query;
};
exports.buildFilterClauses = buildFilterClauses;
const addPaginationHeaders = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && data.pagination) {
            const { pagination } = data;
            res.set({
                'X-Total-Count': pagination.total.toString(),
                'X-Page': pagination.page.toString(),
                'X-Per-Page': pagination.limit.toString(),
                'X-Total-Pages': pagination.totalPages.toString(),
                'X-Has-Next': pagination.hasNext.toString(),
                'X-Has-Prev': pagination.hasPrev.toString()
            });
        }
        return originalJson.call(this, data);
    };
    next();
};
exports.addPaginationHeaders = addPaginationHeaders;
//# sourceMappingURL=pagination.js.map