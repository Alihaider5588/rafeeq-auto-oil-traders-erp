import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown, Package } from 'lucide-react';

export interface ProductItem {
  id: string;
  name: string;
  sku?: string;
  code?: string;
  brand?: string;
  categoryId?: string;
  unitId?: string;
  purchasePrice?: number | string;
  costPrice?: number | string;
  salePrice?: number | string;
  sellingPrice?: number | string;
  currentStock?: number | string;
  stockQty?: number | string;
  conversionFactor?: number | string;
  primaryUnitId?: string;
  primaryUnit?: { id?: string; name?: string; symbol?: string };
  unit?: string | { id?: string; name?: string; symbol?: string };
  category?: string | { id?: string; name?: string };
  [key: string]: any;
}

interface SearchableProductSelectProps {
  products: ProductItem[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products = [],
  value,
  onChange,
  placeholder = 'Type to search product (name, SKU, brand)...',
  required = false,
  disabled = false,
  style,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search term
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    const words = term.split(/\s+/).filter(Boolean);

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || p.code || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const cat = typeof p.category === 'string' ? p.category.toLowerCase() : (p.category?.name || '').toLowerCase();
      const textToSearch = `${name} ${sku} ${brand} ${cat}`;

      return words.every((w) => textToSearch.includes(w));
    });
  }, [products, searchTerm]);

  // Adjust highlight index when filtered products change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts.length, searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      scrollToHighlighted(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollToHighlighted(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const scrollToHighlighted = (index: number) => {
    if (!dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('.product-select-item');
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (productId: string) => {
    onChange(productId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
    setIsOpen(true);
  };

  const formatPackaging = (p: ProductItem) => {
    const conv = Number(p.conversionFactor) || 1;
    const hasPrimary = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
    const primarySym = p.primaryUnit?.symbol || 'Ctn';
    const secSym = typeof p.unit === 'string' ? p.unit : p.unit?.symbol || 'Pcs';
    if (hasPrimary) {
      return `1 ${primarySym} = ${conv} ${secSym}`;
    }
    return secSym;
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-product-select ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            top: '50%',
            left: '50%',
            width: 1,
            height: 1,
          }}
        />
      )}

      {/* Trigger & Search Input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          border: `1.5px solid ${isOpen ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: '7px',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          cursor: disabled ? 'not-allowed' : 'text',
          minHeight: '38px',
          transition: 'all 0.15s ease',
        }}
      >
        <Search size={15} style={{ color: isOpen ? '#2563eb' : '#94a3b8', flexShrink: 0 }} />

        {/* Input box */}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : selectedProduct ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ''}` : ''}
          placeholder={selectedProduct ? selectedProduct.name : placeholder}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '0.84rem',
            fontWeight: selectedProduct && !isOpen ? 700 : 500,
            color: selectedProduct && !isOpen ? '#0f172a' : '#334155',
            padding: 0,
            width: '100%',
          }}
        />

        {/* Selected packaging badge indicator (if not actively typing search) */}
        {selectedProduct && !isOpen && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {formatPackaging(selectedProduct)}
          </span>
        )}

        {/* Action icons (Clear & Chevron) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {selectedProduct && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          )}
          <ChevronDown
            size={15}
            style={{
              color: '#94a3b8',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu List */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {/* Header count info */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {searchTerm ? `Searching "${searchTerm}"` : 'All Products'} ({filteredProducts.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Use ↑↓ and Enter</span>
          </div>

          {/* List items */}
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
              <Package size={24} style={{ color: '#cbd5e1', marginBottom: '6px', margin: '0 auto' }} />
              <div style={{ fontWeight: 600, color: '#334155' }}>Koi product nahi mili</div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                Please check product spelling or item code
              </div>
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const isSelected = p.id === value;
              const isHighlighted = index === highlightedIndex;
              const stock = Number(p.currentStock ?? p.stockQty ?? 0);
              const cost = Number(p.purchasePrice ?? p.costPrice ?? 0);
              const conv = Number(p.conversionFactor) || 1;
              const pSym = p.primaryUnit?.symbol || 'Ctn';
              const sSym = typeof p.unit === 'string' ? p.unit : p.unit?.symbol || 'Pcs';
              const hasPrimary = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;

              return (
                <div
                  key={p.id}
                  className="product-select-item"
                  onClick={() => handleSelect(p.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: isHighlighted ? '#f1f5f9' : isSelected ? '#eff6ff' : '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          color: isSelected ? '#1d4ed8' : '#0f172a',
                        }}
                      >
                        {p.name}
                      </span>
                      {p.sku && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            backgroundColor: '#e2e8f0',
                            color: '#334155',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          #{p.sku}
                        </span>
                      )}
                      {p.brand && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#64748b',
                          }}
                        >
                          • {p.brand}
                        </span>
                      )}
                    </div>

                    {/* Packaging & details subtitle */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '3px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                      }}
                    >
                      {hasPrimary ? (
                        <span style={{ color: '#b45309', fontWeight: 600 }}>
                          📦 1 {pSym} = {conv} {sSym}
                        </span>
                      ) : (
                        <span>🧴 Unit: {sSym}</span>
                      )}
                      <span>|</span>
                      <span>
                        Stock:{' '}
                        <b style={{ color: stock <= 0 ? '#dc2626' : '#166534' }}>
                          {stock} {sSym}
                        </b>
                      </span>
                      {cost > 0 && (
                        <>
                          <span>|</span>
                          <span>Cost: Rs. {cost.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;
