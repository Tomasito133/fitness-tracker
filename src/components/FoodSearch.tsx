import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, X } from 'lucide-react';
import { searchProducts, normalizeProduct, type OpenFoodFactsProduct } from '../api/openFoodFacts';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from './ui';
import { cn } from '../lib/utils';

interface NormalizedFood {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  servingSize: number;
  servingUnit: string;
  imageUrl?: string;
}

interface FoodSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (food: NormalizedFood, grams: number) => void;
}

export function FoodSearch({ open, onOpenChange, onSelect }: FoodSearchProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<NormalizedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NormalizedFood | null>(null);
  const [grams, setGrams] = useState(100);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchProducts(search);
      const normalized = data.products
        .filter((p: OpenFoodFactsProduct) => p.nutriments?.['energy-kcal_100g'] || p.nutriments?.proteins_100g)
        .map(normalizeProduct);
      setResults(normalized);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.length >= 2) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [search, handleSearch]);

  const handleSelectFood = (food: NormalizedFood) => {
    setSelectedFood(food);
    setGrams(food.servingSize || 100);
  };

  const handleConfirm = () => {
    if (selectedFood) {
      onSelect(selectedFood, grams);
      setSelectedFood(null);
      setSearch('');
      setResults([]);
      onOpenChange(false);
    }
  };

  const calculateNutrients = (food: NormalizedFood, amount: number) => {
    const multiplier = amount / 100;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
    };
  };

  if (selectedFood) {
    const nutrients = calculateNutrients(selectedFood, grams);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить продукт</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedFood.name}</p>
              {selectedFood.brand && (
                <p className="text-sm text-muted-foreground">{selectedFood.brand}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Количество (г)</label>
              <Input
                type="number"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="mt-1"
                inputMode="numeric"
              />
              <div className="flex gap-2 mt-2">
                {[50, 100, 150, 200].map((g) => (
                  <Button
                    key={g}
                    variant={grams === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGrams(g)}
                  >
                    {g}г
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-3 bg-secondary/50 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-bold">{nutrients.calories}</p>
                <p className="text-xs text-muted-foreground">ккал</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{nutrients.protein}</p>
                <p className="text-xs text-muted-foreground">белки</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{nutrients.carbs}</p>
                <p className="text-xs text-muted-foreground">углев</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{nutrients.fat}</p>
                <p className="text-xs text-muted-foreground">жиры</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedFood(null)}>
                Назад
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Поиск продуктов</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Введите название продукта..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
            autoFocus
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-4 -mx-2 px-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((food, idx) => (
                <button
                  key={`${food.barcode}-${idx}`}
                  onClick={() => handleSelectFood(food)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors hover:bg-accent'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{food.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {food.calories} ккал · Б {food.protein} · У {food.carbs} · Ж {food.fat}
                    </p>
                    {food.brand && (
                      <p className="text-xs text-muted-foreground truncate">{food.brand}</p>
                    )}
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}

          {!loading && search.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Продукты не найдены</p>
              <p className="text-sm mt-1">Попробуйте другой запрос</p>
            </div>
          )}

          {!loading && search.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Введите название продукта</p>
              <p className="text-sm mt-1">Минимум 2 символа</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
