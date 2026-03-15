import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { StrengthIndicator } from './StrengthIndicator';
import TastingMenus from './TastingMenus';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  bottle_price: number | null;
  image_url: string | null;
  menu_type: string;
  show_price: boolean;
  show_description: boolean;
  ingredients: string[] | null;
  allergens: string[] | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  alcohol_content: number | null;
  garnish: string | null;
  category_id: string | null;
  category: {
    name: string;
    display_order: number;
    parent_id: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  menu_type: string;
  display_order: number;
  parent_id: string | null;
  subcategories?: Category[];
}

// Categories where we don't show alcohol content
const HIDE_ALCOHOL_CONTENT_CATEGORIES = [
  'Flights',
  'Beer',
  'Wine',
  'Tiki Classic Flight',
  'Spoonbill Signature Flights',
  'Tropical Fruit Flight',
  'Craft Beer',
  'Wine'
];

const MenuContent: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeType, setActiveType] = useState<'cocktails' | 'spirits' | 'cuisine' | 'tasting'>('cocktails');
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const shouldShowAlcoholContent = (category: Category | null) => {
    if (!category) return true;
    
    // Check if current category or any parent category is in the hide list
    let currentCat = category;
    while (currentCat) {
      if (HIDE_ALCOHOL_CONTENT_CATEGORIES.includes(currentCat.name)) {
        return false;
      }
      currentCat = categories.find(cat => cat.id === currentCat.parent_id) || null;
    }
    return true;
  };

  const renderDietaryInfo = (item: MenuItem) => {
    if (!item.is_vegetarian && !item.is_vegan && !item.is_gluten_free) return null;
    
    return (
      <div className="flex gap-2">
        {item.is_vegetarian && !item.is_vegan && (
          <span className="text-xs font-medium text-ocean-600">V</span>
        )}
        {item.is_vegan && (
          <span className="text-xs font-medium text-ocean-600">VG</span>
        )}
        {item.is_gluten_free && (
          <span className="text-xs font-medium text-ocean-600">GF</span>
        )}
      </div>
    );
  };

  const renderAllergens = (item: MenuItem) => {
    if (!item.allergens?.length) return null;
    
    return (
      <span className="text-xs text-red-600 font-medium">
        Contains: {item.allergens.join(', ')}
      </span>
    );
  };

  const fetchData = async () => {
    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('menu_items')
          .select(`
            *,
            category:category_id (
              name,
              display_order,
              parent_id
            )
          `)
          .eq('active', true)
          .order('name'),
        supabase
          .from('menu_categories')
          .select('*')
          .eq('active', true)
          .order('display_order')
      ]);

      if (itemsResponse.error) throw itemsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      // Organize categories into a tree structure
      const categoriesMap = new Map<string, Category>();
      const rootCategories: Category[] = [];

      // First pass: Create category objects
      categoriesResponse.data?.forEach(category => {
        categoriesMap.set(category.id, { ...category, subcategories: [] });
      });

      // Second pass: Build tree structure
      categoriesResponse.data?.forEach(category => {
        const categoryWithSubs = categoriesMap.get(category.id)!;
        if (category.parent_id) {
          const parent = categoriesMap.get(category.parent_id);
          if (parent) {
            parent.subcategories?.push(categoryWithSubs);
          }
        } else {
          rootCategories.push(categoryWithSubs);
        }
      });

      // Sort subcategories by display_order
      const sortSubcategories = (categories: Category[]) => {
        categories.sort((a, b) => a.display_order - b.display_order);
        categories.forEach(category => {
          if (category.subcategories?.length) {
            sortSubcategories(category.subcategories);
          }
        });
      };

      sortSubcategories(rootCategories);

      setMenuItems(itemsResponse.data || []);
      setCategories(rootCategories);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRootCategory = (categoryId: string | null) => {
    if (!categoryId) return null;

    let current = categories.find((category) => category.id === categoryId) || null;
    while (current?.parent_id) {
      current = categories.find((category) => category.id === current?.parent_id) || null;
    }

    return current;
  };

  const isSpiritCategory = (item: MenuItem) => {
    const root = getRootCategory(item.category_id);
    return root?.name.toLowerCase().includes('spirit');
  };

  const isSpiritRootCategory = (category: Category) => {
    const root = getRootCategory(category.id) || category;
    return root.name.toLowerCase().includes('spirit');
  };

  const filteredItems = menuItems.filter((item) => {
    if (activeType === 'tasting') return false;
    if (activeType === 'cuisine') return item.menu_type === 'food';
    if (activeType === 'cocktails') {
      return item.menu_type === 'drinks' && !isSpiritCategory(item);
    }
    return item.menu_type === 'drinks' && isSpiritCategory(item);
  });

  const filteredCategories = categories.filter((category) => {
    if (activeType === 'tasting') return false;
    if (activeType === 'cuisine') return category.menu_type === 'food';
    if (activeType === 'cocktails') {
      return category.menu_type === 'drinks' && !isSpiritRootCategory(category);
    }
    return category.menu_type === 'drinks' && isSpiritRootCategory(category);
  });

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (!element) return;

    const scrollContainer = element.closest('.overflow-y-auto');
    if (!scrollContainer) return;

    const headerHeight = headerRef.current?.offsetHeight || 0;
    const elementTop = element.offsetTop;
    
    scrollContainer.scrollTo({
      top: elementTop - headerHeight - 16,
      behavior: 'smooth'
    });
  };

  const isWineItem = (item: MenuItem) => {
    // Check if the item is in a wine category or subcategory
    let currentCat = item.category;
    while (currentCat) {
      if (currentCat.name === 'Wine') {
        return true;
      }
      currentCat = categories.find(cat => cat.id === currentCat?.parent_id) || null;
    }
    return false;
  };

  const renderPrices = (item: MenuItem) => {
    if (!item.show_price) return null;

    if (isWineItem(item)) {
      return (
        <div className="font-garamond text-lg text-gray-700 text-right">
          {item.price && (
            <span>Glass ${item.price.toFixed(2)}</span>
          )}
          {item.bottle_price && (
            <div>Bottle ${item.bottle_price.toFixed(2)}</div>
          )}
        </div>
      );
    }

    return item.price && (
      <span className="font-garamond text-lg text-gray-700">
        ${item.price.toFixed(2)}
      </span>
    );
  };

  const renderCategoryContent = (category: Category) => {
    const categoryItems = filteredItems.filter(item => {
      if (!category.subcategories?.length) {
        // For categories without subcategories, show items directly assigned to this category
        return item.category_id === category.id;
      } else {
        // For categories with subcategories, show items assigned to any of its subcategories
        return category.subcategories.some(sub => item.category_id === sub.id);
      }
    });

    if (!categoryItems.length && !category.subcategories?.length) return null;

    return (
      <div key={category.id} id={`category-${category.id}`} className="space-y-8">
        <div className="relative">
          <h3 className="text-2xl font-display font-bold text-ocean-800 pb-3 border-b-2 border-ocean-200">
            {category.name}
          </h3>
          <div className="absolute bottom-0 left-0 w-24 h-0.5 bg-ocean-600"></div>
        </div>

        {category.subcategories?.map(subcategory => {
          const subcategoryItems = filteredItems.filter(item => 
            item.category_id === subcategory.id
          );

          if (!subcategoryItems.length) return null;

          return (
            <div key={subcategory.id} className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-ocean-600 text-white font-display font-bold px-8 py-2 rounded-full shadow-md">
                  {subcategory.name}
                </div>
              </div>
              <div className="grid gap-8">
                {subcategoryItems.map(item => (
                  <div key={item.id} className="group">
                    {item.image_url && (
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-48 object-cover"
                        />
                        {item.show_description && item.description && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <p className="text-white font-garamond text-center px-6">
                              {item.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-start mt-4">
                      <div>
                        <h4 className="text-xl font-garamond font-medium text-gray-900 mb-1">
                          {item.name}
                        </h4>
                        {isWineItem(item) && item.description && (
                          <p className="text-sm text-gray-600 font-garamond">
                            {item.description}
                          </p>
                        )}
                        {item.alcohol_content && shouldShowAlcoholContent(item.category) && (
                          <div className="mt-1">
                            <StrengthIndicator
                              strength={item.alcohol_content}
                              className="h-6 w-6"
                            />
                          </div>
                        )}
                      </div>
                      {renderPrices(item)}
                    </div>
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-sm text-gray-500 font-garamond">
                          {item.ingredients.join(' • ')}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          {renderDietaryInfo(item)}
                          {renderAllergens(item)}
                        </div>
                      </div>
                    )}
                    {(activeType === 'cocktails' || activeType === 'spirits') && !isWineItem(item) && item.garnish && (
                      <p className="text-sm text-gray-500 font-garamond italic mt-1">
                        Garnished with {item.garnish}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render items directly assigned to this category (if no subcategories) */}
        {!category.subcategories?.length && (
          <div className="grid gap-8">
            {categoryItems.map(item => (
              <div key={item.id} className="group">
                {item.image_url && (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                    {item.show_description && item.description && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-white font-garamond text-center px-6">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-start mt-4">
                  <div>
                    <h4 className="text-xl font-garamond font-medium text-gray-900">
                      {item.name}
                    </h4>
                    {item.alcohol_content && shouldShowAlcoholContent(item.category) && (
                      <div className="mt-1">
                        <StrengthIndicator
                          strength={item.alcohol_content}
                          className="h-6 w-6"
                        />
                      </div>
                    )}
                  </div>
                  {renderPrices(item)}
                </div>
                {item.ingredients && item.ingredients.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="text-sm text-gray-500 font-garamond">
                      {item.ingredients.join(' • ')}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      {renderDietaryInfo(item)}
                      {renderAllergens(item)}
                    </div>
                  </div>
                )}
                {(activeType === 'cocktails' || activeType === 'spirits') && item.garnish && (
                  <p className="text-sm text-gray-500 font-garamond italic mt-1">
                    Garnished with {item.garnish}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sticky Header */}
      <div ref={headerRef} className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 -mx-6 px-6 pt-4 pb-4">
        {/* Menu Type Selector */}
        <div className="grid grid-cols-4 gap-px bg-gray-200 rounded-lg overflow-hidden mb-4">
          <button
            onClick={() => setActiveType('spirits')}
            className={`py-4 text-lg font-garamond transition-colors ${
              activeType === 'spirits'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Spirits
          </button>
          <button
            onClick={() => setActiveType('cocktails')}
            className={`py-4 text-lg font-garamond transition-colors ${
              activeType === 'cocktails'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cocktails
          </button>
          <button
            onClick={() => setActiveType('cuisine')}
            className={`py-4 text-lg font-garamond transition-colors ${
              activeType === 'cuisine'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cuisine
          </button>
          <button
            onClick={() => setActiveType('tasting')}
            className={`py-4 text-lg font-garamond transition-colors ${
              activeType === 'tasting'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tastings
          </button>
        </div>

        {/* Category Navigation - Only show main categories */}
        <div className="flex flex-wrap justify-center gap-2">
          {filteredCategories
            .filter(category => !category.parent_id)
            .sort((a, b) => a.display_order - b.display_order)
            .map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className="px-4 py-2 text-sm font-garamond text-gray-600 hover:text-ocean-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                {category.name}
              </button>
            ))}
        </div>
      </div>

      {/* Menu Content */}
      {activeType === 'tasting' ? (
        <div className="pt-4">
          <TastingMenus />
        </div>
      ) : (
        <div ref={contentRef} className="space-y-12 pt-4">
          {filteredCategories
            .filter(category => !category.parent_id)
            .sort((a, b) => a.display_order - b.display_order)
            .map(category => renderCategoryContent(category))}
        </div>
      )}
    </div>
  );
};

export default MenuContent;
