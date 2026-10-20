import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  sku: string;
  imageUrl?: string | null;
  unitSymbol: string;
  primaryUnit: string | null;
  conversionFactor: number;
  unitType: 'SECONDARY' | 'PRIMARY';
  quantity: number;
  publicPrice: number | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, quantity?: number, unitType?: 'SECONDARY' | 'PRIMARY') => void;
  removeFromCart: (productId: string, unitType: string) => void;
  updateQuantity: (productId: string, unitType: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  estimatedTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'rafiq_public_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (product: any, quantity = 1, unitType: 'SECONDARY' | 'PRIMARY' = 'SECONDARY') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.unitType === unitType
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        brand: product.brand || 'Rafiq Lubricants',
        sku: product.sku || '',
        imageUrl: product.imageUrl || null,
        unitSymbol: product.unitSymbol || product.unit?.symbol || 'Piece',
        primaryUnit: product.primaryUnit || product.primaryUnit?.name || null,
        conversionFactor: Number(product.conversionFactor || 1),
        unitType,
        quantity: Math.max(1, quantity),
        publicPrice: product.publicPrice ?? (product.showPublicPrice ? Number(product.salePrice) : null),
      };

      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, unitType: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.unitType === unitType)));
  };

  const updateQuantity = (productId: string, unitType: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.unitType === unitType) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const estimatedTotal = cart.reduce((sum, item) => {
    const basePrice = item.publicPrice || 0;
    const itemPrice = item.unitType === 'PRIMARY' && item.conversionFactor > 1 
      ? basePrice * item.conversionFactor 
      : basePrice;
    return sum + itemPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        estimatedTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
