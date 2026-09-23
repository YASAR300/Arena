/**
 * Standard Pagination Helper
 * Ensures no unbounded arrays are returned across list endpoints.
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10)); // max 50 items per page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const formatPaginatedResponse = ({ data, total, page, limit }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = {
  parsePagination,
  formatPaginatedResponse,
};
