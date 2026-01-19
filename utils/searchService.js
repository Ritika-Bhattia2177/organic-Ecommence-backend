const axios = require('axios');

/**
 * OpenFoodFacts API Service
 * Fetches external products from OpenFoodFacts database
 */

const OPENFOODFACTS_API = 'https://world.openfoodfacts.org/cgi/search.pl';
const API_TIMEOUT = 8000; // 8 seconds timeout
const MAX_EXTERNAL_RESULTS = 10;

/**
 * Fetch products from OpenFoodFacts API
 * @param {string} searchTerm - Product name or keyword to search
 * @returns {Promise<Array>} - Array of formatted products
 */
exports.fetchExternalProducts = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const response = await axios.get(OPENFOODFACTS_API, {
      params: {
        search_terms: searchTerm.trim(),
        json: true,
        page_size: MAX_EXTERNAL_RESULTS
      },
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'OrganicMart-Ecommerce/1.0 (+https://organicmart.com)'
      }
    });

    if (!response.data || !response.data.products) {
      return [];
    }

    // Transform OpenFoodFacts products to our format
    const products = response.data.products
      .filter(product => product.product_name) // Only products with names
      .slice(0, MAX_EXTERNAL_RESULTS)
      .map(product => ({
        _id: product.code || product.id || `external-${Math.random()}`,
        name: product.product_name,
        description: product.generic_name || product.brands || 'Product from OpenFoodFacts',
        price: product.price ? parseFloat(product.price) : Math.floor(Math.random() * 50) + 5, // Fallback price
        category: mapToCategory(product.categories || product.pnns_groups_1 || 'Farm Products'),
        image: product.image_url || product.image_front_url || '/images/no-image.png',
        rating: 0,
        numReviews: 0,
        unit: product.serving_size_unit || product.quantity || 'piece',
        isOrganic: checkIfOrganic(product.labels || product.product_name || ''),
        nutrition: formatNutrition(product),
        inStock: true,
        stock: 100,
        source: 'external',
        externalSource: 'OpenFoodFacts',
        externalCode: product.code,
        externalUrl: product.url
      }));

    return products;
  } catch (error) {
    console.error('❌ External API Error:', error.message);
    
    // Log error details for debugging
    if (error.response) {
      console.error('API Response Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received from API');
    }
    
    return []; // Return empty array on error
  }
};

/**
 * Map external categories to our categories
 * @param {string} externalCategory - Category from external API
 * @returns {string} - Mapped category
 */
const mapToCategory = (externalCategory) => {
  if (!externalCategory) return 'Farm Products';

  const categoryLower = externalCategory.toLowerCase();
  
  if (categoryLower.includes('dairy') || categoryLower.includes('milk') || categoryLower.includes('cheese')) {
    return 'Dairy';
  }
  if (categoryLower.includes('vegetable') || categoryLower.includes('carrot') || categoryLower.includes('potato')) {
    return 'Vegetables';
  }
  if (categoryLower.includes('fruit') || categoryLower.includes('apple') || categoryLower.includes('banana')) {
    return 'Fruits';
  }
  if (categoryLower.includes('medicine') || categoryLower.includes('supplement') || categoryLower.includes('vitamin')) {
    return 'Organic Medicines';
  }
  
  return 'Farm Products';
};

/**
 * Check if product is organic based on labels
 * @param {string} labels - Product labels
 * @returns {boolean} - Is organic
 */
const checkIfOrganic = (labels) => {
  if (!labels) return false;
  
  const organicKeywords = ['organic', 'bio', 'ecologic', 'certified', 'natural'];
  const labelsLower = labels.toLowerCase();
  
  return organicKeywords.some(keyword => labelsLower.includes(keyword));
};

/**
 * Format nutrition information
 * @param {object} product - Product object from API
 * @returns {string} - Formatted nutrition info
 */
const formatNutrition = (product) => {
  const nutrition = [];
  
  if (product.energy_value) {
    nutrition.push(`Energy: ${product.energy_value} kcal`);
  }
  if (product.carbohydrates_value) {
    nutrition.push(`Carbs: ${product.carbohydrates_value}g`);
  }
  if (product.fat_value) {
    nutrition.push(`Fat: ${product.fat_value}g`);
  }
  if (product.proteins_value) {
    nutrition.push(`Protein: ${product.proteins_value}g`);
  }
  
  return nutrition.length > 0 ? nutrition.join(', ') : 'Nutrition info not available';
};

/**
 * Search and combine local + external products
 * @param {Array} localProducts - Products from MongoDB
 * @param {Array} externalProducts - Products from external API
 * @returns {object} - Combined search results
 */
exports.combineResults = (localProducts, externalProducts) => {
  return {
    local: {
      count: localProducts.length,
      data: localProducts
    },
    external: {
      count: externalProducts.length,
      data: externalProducts
    },
    total: localProducts.length + externalProducts.length,
    combinedData: [
      ...localProducts.map(p => ({ ...p.toObject?.() || p, source: 'local' })),
      ...externalProducts
    ]
  };
};
