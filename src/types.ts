export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Predjela' | 'Glavna jela' | 'Deserti' | 'Pića';
  image: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  customerUid?: string;
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  note?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Order {
  id: string;
  customerUid?: string;
  customerName: string;
  phone: string;
  address?: string;
  type: 'delivery' | 'pickup';
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  role: 'Konobar' | 'Kuhar' | 'Dostavljač' | 'Menadžer';
  email: string;
  phone: string;
  password: string;
  joinedAt: string;
}

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Biftek sa tartufima',
    description: 'Vrhunski juneći biftek sa sosom od crnih tartufa i pireom od celera.',
    price: 32.00,
    category: 'Glavna jela',
    image: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    name: 'Rižoto sa plodovima mora',
    description: 'Kremasti rižoto sa svježim kozicama, dagnjama i lignjama.',
    price: 24.00,
    category: 'Glavna jela',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db06?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    name: 'Brusketi sa paradajzom',
    description: 'Tostirani hljeb sa svježim paradajzom, bosiljkom i maslinovim uljem.',
    price: 8.50,
    category: 'Predjela',
    image: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    name: 'Čokoladni fondant',
    description: 'Topli čokoladni kolač sa tečnim srcem i sladoledom od vanilije.',
    price: 9.00,
    category: 'Deserti',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    name: 'Domaća Limunada',
    description: 'Svježe cijeđeni limun sa nanom i medom.',
    price: 4.50,
    category: 'Pića',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '6',
    name: 'Pasta Carbonara',
    description: 'Tradicionalna pasta sa pančetom, jajima i pecorino sirom.',
    price: 18.00,
    category: 'Glavna jela',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=800'
  }
];

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'res-1',
    name: 'Marko Marković',
    email: 'marko@example.com',
    date: '2026-03-20',
    time: '19:00',
    guests: 4,
    status: 'pending'
  },
  {
    id: 'res-2',
    name: 'Emina Softić',
    email: 'emina@example.com',
    date: '2026-03-21',
    time: '20:30',
    guests: 2,
    status: 'confirmed'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    customerName: 'Ivan Ivić',
    phone: '061 111 222',
    address: 'Zmaja od Bosne 4',
    type: 'delivery',
    items: [
      { ...INITIAL_MENU_ITEMS[0], quantity: 1 },
      { ...INITIAL_MENU_ITEMS[4], quantity: 2 }
    ],
    total: 41.00,
    status: 'pending',
    createdAt: '2026-03-18T14:30:00Z'
  }
];

export const MOCK_WORKERS: Worker[] = [
  {
    id: 'w-1',
    name: 'Adnan Hadžić',
    role: 'Konobar',
    email: 'adnan@gourmethaven.com',
    phone: '061 555 666',
    password: 'worker123',
    joinedAt: '2025-01-10'
  },
  {
    id: 'w-2',
    name: 'Selma Karić',
    role: 'Kuhar',
    email: 'selma@gourmethaven.com',
    phone: '062 777 888',
    password: 'worker456',
    joinedAt: '2024-11-15'
  }
];
