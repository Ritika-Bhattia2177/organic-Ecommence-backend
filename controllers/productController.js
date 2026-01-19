const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { fetchExternalProducts, combineResults } = require('../utils/searchService');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, sort, page, limit } = req.query;

  let query = {};

  // Filter by category
  if (category && category !== 'All') {
    query.category = category;
  }

  // Search by name or description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sorting
  let sortOption = {};
  if (sort === 'price-asc') sortOption.price = 1;
  if (sort === 'price-desc') sortOption.price = -1;
  if (sort === 'rating') sortOption.rating = -1;
  if (sort === 'newest') sortOption.createdAt = -1;
  else sortOption.createdAt = -1; // default sort by newest

  // Pagination
  const pageNumber = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 12;
  const skip = (pageNumber - 1) * pageSize;

  // Get total count for pagination
  const totalProducts = await Product.countDocuments(query);

  // Fetch products with pagination
  const products = await Product.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(pageSize)
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    count: products.length,
    total: totalProducts,
    page: pageNumber,
    pages: Math.ceil(totalProducts / pageSize),
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('reviews.user', 'name');

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  // Add the admin user as createdBy
  const productData = {
    ...req.body,
    createdBy: req.user._id
  };

  const product = await Product.create(productData);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// @desc    Create product review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    const error = new Error('Product already reviewed');
    error.statusCode = 400;
    throw error;
  }

  const review = {
    name: req.user.name,
    rating: Number(rating),
    comment,
    user: req.user._id
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added successfully'
  });
});

// @desc    Search products (local + external)
// @route   GET /api/products/search
// @access  Public
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q, category, limit = 10, includeExternal = true } = req.query;

  // Validate search query
  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }

  const searchTerm = q.trim();
  const pageLimit = Math.min(parseInt(limit, 10) || 10, 50); // Max 50 results per page

  try {
    // 🔍 Search in local database
    const localQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $regex: searchTerm, $options: 'i' } },
        { benefits: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // Add category filter if specified
    if (category && category !== 'All') {
      localQuery.category = category;
    }

    const localProducts = await Product.find(localQuery)
      .limit(pageLimit)
      .sort({ rating: -1, createdAt: -1 })
      .populate('createdBy', 'name email');

    console.log(`✅ Found ${localProducts.length} local products for: "${searchTerm}"`);

    let externalProducts = [];

    // 🌐 If no local products found or includeExternal is true, fetch from external API
    if (includeExternal === 'true' && localProducts.length < pageLimit) {
      externalProducts = await fetchExternalProducts(searchTerm);
      console.log(`✅ Found ${externalProducts.length} external products for: "${searchTerm}"`);
    }

    // Combine results
    const combinedResults = combineResults(localProducts, externalProducts);

    // Return response
    res.status(200).json({
      success: true,
      query: searchTerm,
      totalResults: combinedResults.total,
      localCount: combinedResults.local.count,
      externalCount: combinedResults.external.count,
      data: combinedResults.combinedData.slice(0, pageLimit),
      message: combinedResults.total === 0 
        ? 'No products found. Would you like to request this product?' 
        : `Found ${combinedResults.total} products`
    });

  } catch (error) {
    console.error('❌ Search Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Error during search',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
