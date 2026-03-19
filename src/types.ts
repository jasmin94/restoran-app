export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isSpecial?: boolean;
  promotionPrice?: number;
  promotionText?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface AboutContent {
  bs: {
    storyTitle: string;
    storyText: string;
    missionTitle: string;
    missionText: string;
    teamTitle: string;
    teamText: string;
  };
  en: {
    storyTitle: string;
    storyText: string;
    missionTitle: string;
    missionText: string;
    teamTitle: string;
    teamText: string;
  };
}

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  createdAt: string;
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
  role?: 'admin' | 'worker' | 'user';
  loyaltyPoints?: number;
  workerRole?: 'Konobar' | 'Kuhar' | 'Dostavljač' | 'Menadžer';
  permissions?: WorkerPermissions;
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

export interface Review {
  id: string;
  customerUid: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  orderId?: string;
}

export interface AppSettings {
  loyaltyProgramEnabled: boolean;
  loyaltyPointsPerKM: number;
  restaurantName?: string;
  logoUrl?: string;
  brandColor?: string;
}

export interface WorkerPermissions {
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageReservations: boolean;
  canManageWorkers: boolean;
}

export interface Worker {
  id: string;
  name: string;
  role: 'Konobar' | 'Kuhar' | 'Dostavljač' | 'Menadžer';
  email: string;
  phone: string;
  password: string;
  joinedAt: string;
  permissions?: WorkerPermissions;
}

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Biftek sa tartufima',
    description: 'Vrhunski juneći biftek sa sosom od crnih tartufa i pireom od celera.',
    price: 32.00,
    category: 'glavna jela',
    image: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    name: 'Rižoto sa plodovima mora',
    description: 'Kremasti rižoto sa svježim kozicama, dagnjama i lignjama.',
    price: 24.00,
    category: 'glavna jela',
    image: 'https://images.unsplash.com/photo-1595908129746-57ca1a63dd4d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    name: 'Brusketi sa paradajzom',
    description: 'Tostirani hljeb sa svježim paradajzom, bosiljkom i maslinovim uljem.',
    price: 8.50,
    category: 'hladna predjela',
    image: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    name: 'Čokoladni fondant',
    description: 'Topli čokoladni kolač sa tečnim srcem i sladoledom od vanilije.',
    price: 9.00,
    category: 'slatki program',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    name: 'Domaća Limunada',
    description: 'Svježe cijeđeni limun sa namam i medom.',
    price: 4.50,
    category: 'piće',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '6',
    name: 'Pasta Carbonara',
    description: 'Tradicionalna pasta sa pančetom, jajima i pecorino sirom.',
    price: 18.00,
    category: 'glavna jela',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '7',
    name: 'Grilovani Losos',
    description: 'Filet lososa sa grilovanim povrćem i limun sosom.',
    price: 28.50,
    category: 'sa roštilja',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '8',
    name: 'Cezar Salata',
    description: 'Hrskava zelena salata sa piletinom, krutonima i originalnim dresingom.',
    price: 14.00,
    category: 'hladna predjela',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '9',
    name: 'Tiramisu',
    description: 'Klasični italijanski desert sa maskarpone sirom i kafom.',
    price: 8.00,
    category: 'slatki program',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '10',
    name: 'Vino Blatina',
    description: 'Vrhunsko crno vino hercegovačkog kraja.',
    price: 35.00,
    category: 'piće',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '11',
    name: 'Espresso',
    description: 'Jaka i aromatična kafa vrhunskog kvaliteta.',
    price: 2.50,
    category: 'piće',
    image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '12',
    name: 'Begova Čorba',
    description: 'Tradicionalna bosanska čorba sa piletinom i bamijom.',
    price: 7.00,
    category: 'kuhana jela',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '13',
    name: 'Teleći sač',
    description: 'Lagano pečena teletina pod sačem sa krompirom.',
    price: 22.00,
    category: 'kuhana jela',
    image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '14',
    name: 'Miješano meso',
    description: 'Izbor najboljeg mesa sa roštilja: ćevapi, sudžukice, piletina.',
    price: 25.00,
    category: 'sa roštilja',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '15',
    name: 'Baklava',
    description: 'Domaća baklava sa orasima i agdom.',
    price: 6.00,
    category: 'slatki program',
    image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&q=80&w=800'
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
