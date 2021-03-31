import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get<Stock[]>('/stock');
      if ( data[productId].amount <= 0){
        toast.error('Quantidade solicitada fora de estoque');
      }
      let flag = false;
      let newCart = cart.map(product => {
        if (product.id === productId) {
          flag = true;
          return Object.assign({...product}, product.amount + 1);
        } 
        return product;
      });
      const products: Product[] = await api.get('/products').then(response => response.data);
      if (!flag) {
        newCart.push({
          amount: 1,
          id: productId,
          image:  products[productId].image,
          price: products[productId].price,
          title: products[productId].title
        });
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let newCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const { data } = await api.get<Stock[]>('/stock');
      if (data[productId].amount > 0) {
        let newCart = cart.map(product => {
          if (productId === product.id) {
            return Object.assign({...product}, product.amount = amount);
          }
          return product;
        })
        await api.post(`/stock/${productId}`, {
          productId,
          amount
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
