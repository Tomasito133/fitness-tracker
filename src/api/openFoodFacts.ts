const API_BASE = 'https://world.openfoodfacts.org';

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
  image_front_small_url?: string;
}

export interface SearchResult {
  count: number;
  page: number;
  page_size: number;
  products: OpenFoodFactsProduct[];
}

export async function searchProducts(query: string, page = 1): Promise<SearchResult> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page: String(page),
    page_size: '20',
    fields: 'code,product_name,product_name_ru,brands,nutriments,serving_size,serving_quantity,image_front_small_url',
  });

  const response = await fetch(`${API_BASE}/cgi/search.pl?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to search products');
  }

  return response.json();
}

export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(
    `${API_BASE}/api/v0/product/${barcode}.json?fields=code,product_name,product_name_ru,brands,nutriments,serving_size,serving_quantity,image_front_small_url`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }

  const data = await response.json();
  
  if (data.status === 0) {
    return null;
  }

  return data.product;
}

export function normalizeProduct(product: OpenFoodFactsProduct) {
  const name = product.product_name_ru || product.product_name || 'Без названия';
  const nutriments = product.nutriments || {};

  return {
    barcode: product.code,
    name,
    brand: product.brands,
    calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
    protein: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
    fat: Math.round((nutriments.fat_100g || 0) * 10) / 10,
    fiber: nutriments.fiber_100g ? Math.round(nutriments.fiber_100g * 10) / 10 : undefined,
    servingSize: product.serving_quantity || 100,
    servingUnit: 'г',
    imageUrl: product.image_front_small_url,
  };
}
