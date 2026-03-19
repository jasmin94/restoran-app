import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Calendar, 
  Menu as MenuIcon, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogOut,
  User,
  LogIn,
  Globe,
  Star,
  Users,
  Heart
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  writeBatch,
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { APIProvider } from '@vis.gl/react-google-maps';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { MenuItem, CartItem, Reservation, Order, Worker, UserProfile, WorkerPermissions, INITIAL_MENU_ITEMS, AppSettings, Review, Category, AboutContent, GalleryImage } from './types';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { Language, translations } from './translations';

export default function App() {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const hasValidMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

  const [lang, setLang] = useState<Language>('bs');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'reserve' | 'order' | 'admin' | 'my-orders'>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auth & User State
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [clientReservations, setClientReservations] = useState<Reservation[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [adminTriggerCount, setAdminTriggerCount] = useState(0);

  // Firebase Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Handle Client Profile
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          let profile: UserProfile;
          if (!userDoc.exists()) {
            const isDefaultAdmin = user.email === 'jasminhalilovic122@gmail.com';
            profile = {
              uid: user.uid,
              name: user.displayName || t.common.guest,
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
              role: isDefaultAdmin ? 'admin' : 'user'
            };
            await setDoc(userDocRef, profile);
          } else {
            profile = userDoc.data() as UserProfile;
            // Ensure default admin always has admin role
            if (user.email === 'jasminhalilovic122@gmail.com' && profile.role !== 'admin') {
              profile.role = 'admin';
              await updateDoc(userDocRef, { role: 'admin' });
            }
          }
          
          setCurrentUserProfile(profile);
          setUserRole(profile.role === 'admin' ? 'admin' : profile.role === 'worker' ? 'worker' : null);
          
          // If worker, set permissions
          if (profile.role === 'worker') {
            setCurrentWorker({
              id: profile.uid,
              name: profile.name,
              role: profile.workerRole || 'waiter',
              email: profile.email,
              phone: profile.phone || '',
              password: '', // Not stored client-side
              joinedAt: profile.createdAt,
              permissions: profile.permissions
            });
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUserRole(null);
        setCurrentUserProfile(null);
        setCurrentWorker(null);
      }
      setIsAuthReady(true);
    });

    const qMenu = query(collection(db, 'menu'), orderBy('category'));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem));
      setMenuItems(items.length > 0 ? items : INITIAL_MENU_ITEMS);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'menu'));

    const qUsers = query(collection(db, 'users'), where('role', '==', 'worker'));
    const unsubscribeWorkers = onSnapshot(qUsers, (snapshot) => {
      const fetchedWorkers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          role: data.workerRole || 'waiter',
          email: data.email,
          phone: data.phone || '',
          password: '••••••••',
          joinedAt: data.joinedAt || data.createdAt,
          permissions: data.permissions
        } as Worker;
      });
      setWorkers(fetchedWorkers);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const qCategories = query(collection(db, 'categories'), orderBy('name'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      if (fetchedCategories.length === 0) {
        // Use default categories from translations if none exist in Firestore
        const defaultCats = Object.values(t.adminPanel.categories).map((name, index) => ({
          id: `default-${index}`,
          name: name as string
        }));
        setCategories(defaultCats);
      } else {
        setCategories(fetchedCategories);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as AppSettings;
        setAppSettings(settings);
        
        // Apply brand color
        if (settings.brandColor) {
          document.documentElement.style.setProperty('--brand-color', settings.brandColor);
        } else {
          document.documentElement.style.setProperty('--brand-color', '#10b981'); // Default brand color
        }
      } else {
        const defaultSettings: AppSettings = {
          loyaltyProgramEnabled: true,
          loyaltyPointsPerKM: 10,
          restaurantName: 'Gourmet Haven',
          brandColor: '#10b981'
        };
        setDoc(doc(db, 'settings', 'global'), defaultSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));

    const unsubscribeReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(reviewsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reviews'));

    const unsubscribeAbout = onSnapshot(doc(db, 'about', 'content'), (snapshot) => {
      if (snapshot.exists()) {
        setAboutContent(snapshot.data() as AboutContent);
      } else {
        const defaultAbout: AboutContent = {
          bs: {
            storyTitle: translations.bs.about.storyTitle,
            storyText: translations.bs.about.storyText,
            missionTitle: translations.bs.about.missionTitle,
            missionText: translations.bs.about.missionText,
            teamTitle: translations.bs.about.teamTitle,
            teamText: translations.bs.about.teamText
          },
          en: {
            storyTitle: translations.en.about.storyTitle,
            storyText: translations.en.about.storyText,
            missionTitle: translations.en.about.missionTitle,
            missionText: translations.en.about.missionText,
            teamTitle: translations.en.about.teamTitle,
            teamText: translations.en.about.teamText
          }
        };
        setDoc(doc(db, 'about', 'content'), defaultAbout);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'about/content'));

    const unsubscribeGallery = onSnapshot(collection(db, 'gallery'), (snapshot) => {
      const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
      setGalleryImages(images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'gallery'));

    return () => {
      unsubscribeAuth();
      unsubscribeMenu();
      unsubscribeWorkers();
      unsubscribeCategories();
      unsubscribeSettings();
      unsubscribeReviews();
      unsubscribeAbout();
      unsubscribeGallery();
    };
  }, []);

  // Toast Auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Protected & Client Listeners
  useEffect(() => {
    if (!isAuthReady) return;
    
    let unsubscribeRes: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeClientOrders: (() => void) | undefined;
    let unsubscribeClientRes: (() => void) | undefined;

    if (isAuthReady && auth.currentUser && (userRole === 'admin' || userRole === 'worker')) {
      const qRes = query(collection(db, 'reservations'), orderBy('date', 'desc'));
      unsubscribeRes = onSnapshot(qRes, (snapshot) => {
        setReservations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation)));
      }, (err) => {
        if (userRole === 'admin') handleFirestoreError(err, OperationType.LIST, 'reservations');
      });

      const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      });
    } else {
      setReservations([]);
      setOrders([]);
    }

    // Client Listeners
    if (auth.currentUser && !userRole) {
      const qClientOrders = query(
        collection(db, 'orders'),
        where('customerUid', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      unsubscribeClientOrders = onSnapshot(qClientOrders, (snapshot) => {
        setClientOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

      const qClientRes = query(
        collection(db, 'reservations'),
        where('customerUid', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );
      unsubscribeClientRes = onSnapshot(qClientRes, (snapshot) => {
        setClientReservations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'reservations'));
    } else {
      setClientOrders([]);
      setClientReservations([]);
    }

    return () => {
      unsubscribeRes?.();
      unsubscribeOrders?.();
      unsubscribeClientOrders?.();
      unsubscribeClientRes?.();
    };
  }, [userRole, isAuthReady, currentUserProfile]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    
    // Visual feedback
    setLastAddedId(item.id);
    setShowCartAnimation(true);
    setToast({ 
      message: lang === 'bs' 
        ? `${item.name} dodan u korpu` 
        : `${item.name} added to cart`, 
      type: 'success' 
    });
    
    setTimeout(() => {
      setLastAddedId(null);
    }, 2000);
    
    setTimeout(() => {
      setShowCartAnimation(false);
    }, 500);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => {
    const price = item.promotionPrice || item.price;
    return sum + price * item.quantity;
  }, 0), [cart]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    setOrderStatus('submitting');
    
    const newOrder = {
      customerName: formData.get('name') as string || t.common.guest,
      phone: formData.get('phone') as string || '',
      address: formData.get('address') as string || '',
      type: deliveryType,
      items: cart.map(item => ({ 
        id: item.id, 
        name: item.name, 
        quantity: item.quantity, 
        price: item.promotionPrice || item.price 
      })),
      total: cartTotal + (deliveryType === 'delivery' ? 5 : 0),
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerUid: auth.currentUser?.uid || null
    };

    try {
      await addDoc(collection(db, 'orders'), newOrder);
      setOrderStatus('success');
      setCart([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    setOrderStatus('submitting');

    const newRes = {
      name: formData.get('name') as string || t.common.guest,
      email: formData.get('email') as string || '',
      date: formData.get('date') as string || '',
      time: formData.get('time') as string || '',
      guests: parseInt(formData.get('guests') as string) || 1,
      note: formData.get('note') as string || '',
      status: 'pending',
      customerUid: auth.currentUser?.uid || null
    };

    try {
      await addDoc(collection(db, 'reservations'), newRes);
      setOrderStatus('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reservations');
    }
  };

  // Admin Handlers
  const handleLogin = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'jasminhalilovic122@gmail.com') {
        setUserRole('admin');
        localStorage.setItem('userRole', 'admin');
      } else {
        setUserRole(null);
        localStorage.removeItem('userRole');
      }
      return { success: true };
    } catch (err: any) {
      console.error(err);
      let message = t.common.errorLogin;
      if (err.code === 'auth/popup-closed-by-user') {
        message = t.common.errorPopupClosed;
      } else if (err.code === 'auth/unauthorized-domain') {
        message = t.common.errorUnauthorized;
      }
      return { success: false, error: message };
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null);
    setCurrentWorker(null);
    setCurrentUserProfile(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('workerId');
    setActiveTab('home');
  };

  const updateReservationStatus = async (id: string, status: Reservation['status']) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    console.log('Attempting to delete order:', id);
    try {
      await deleteDoc(doc(db, 'orders', id));
      console.log('Order deleted successfully:', id);
      setToast({ message: lang === 'bs' ? 'Narudžba obrisana' : 'Order deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting order:', err);
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const clearOldOrders = async () => {
    console.log('Attempting to clear old orders');
    try {
      const batch = writeBatch(db);
      const oldOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
      
      console.log('Found old orders to clear:', oldOrders.length);
      
      if (oldOrders.length === 0) {
        setToast({ message: lang === 'bs' ? 'Nema starih narudžbi za čišćenje' : 'No old orders to clear', type: 'info' });
        return;
      }

      oldOrders.forEach(order => {
        batch.delete(doc(db, 'orders', order.id));
      });

      await batch.commit();
      console.log('Old orders cleared successfully');
      setToast({ message: lang === 'bs' ? 'Stare narudžbe očišćene' : 'Old orders cleared', type: 'success' });
    } catch (error) {
      console.error('Error clearing old orders:', error);
      handleFirestoreError(error, OperationType.DELETE, 'orders/bulk');
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    try {
      const { id, ...data } = item;
      await addDoc(collection(db, 'menu'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'menu');
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `menu/${id}`);
    }
  };

  const addWorker = async (worker: Worker) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: worker.email,
          password: worker.password,
          name: worker.name,
          role: worker.role,
          phone: worker.phone
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create worker');
      }

      setToast({ 
        message: lang === 'bs' ? 'Radnik uspješno dodan' : 'Worker added successfully', 
        type: 'success' 
      });
    } catch (err: any) {
      console.error("Error adding worker:", err);
      setToast({ message: err.message, type: 'error' });
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/workers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete worker');
      }

      setToast({ 
        message: lang === 'bs' ? 'Radnik uspješno obrisan' : 'Worker deleted successfully', 
        type: 'success' 
      });
    } catch (err: any) {
      console.error("Error deleting worker:", err);
      setToast({ message: err.message, type: 'error' });
    }
  };

  const updateWorkerPermissions = async (id: string, permissions: WorkerPermissions) => {
    try {
      await updateDoc(doc(db, 'users', id), { permissions });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${id}`);
    }
  };

  const addCategory = async (name: string) => {
    try {
      await addDoc(collection(db, 'categories'), { name });
      setToast({ message: lang === 'bs' ? 'Kategorija dodana' : 'Category added', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setToast({ message: lang === 'bs' ? 'Kategorija obrisana' : 'Category deleted', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const updateAppSettings = async (settings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      setToast({ message: lang === 'bs' ? 'Postavke ažurirane' : 'Settings updated', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'reviews'), {
        ...review,
        createdAt: new Date().toISOString()
      });
      setToast({ message: lang === 'bs' ? 'Hvala na recenziji!' : 'Thanks for your review!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    }
  };

  const updateAboutContent = async (content: AboutContent) => {
    try {
      await setDoc(doc(db, 'about', 'content'), content);
      setToast({ message: lang === 'bs' ? 'Sadržaj ažuriran' : 'Content updated', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'about/content');
    }
  };

  const addGalleryImage = async (url: string, alt?: string) => {
    try {
      await addDoc(collection(db, 'gallery'), {
        url,
        alt: alt || '',
        createdAt: new Date().toISOString()
      });
      setToast({ message: lang === 'bs' ? 'Slika dodana' : 'Image added', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'gallery');
    }
  };

  const deleteGalleryImage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
      setToast({ message: lang === 'bs' ? 'Slika obrisana' : 'Image deleted', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `gallery/${id}`);
    }
  };

  if (!hasValidMapsKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 p-4 font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-zinc-100">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Google Maps API Key Required</h2>
          <p className="text-zinc-600 mb-8">
            Za prikaz mape dostavljačima, potrebno je podesiti Google Maps API ključ.
          </p>
          
          <div className="space-y-4 text-left bg-zinc-50 p-6 rounded-2xl border border-zinc-100 mb-8">
            <p className="text-sm font-semibold text-zinc-900">Koraci za podešavanje:</p>
            <ol className="text-sm text-zinc-600 space-y-3 list-decimal list-inside">
              <li>Nabavite API ključ na <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-brand hover:underline font-medium">Google Cloud Konzoli</a></li>
              <li><strong>Važno:</strong> Omogućite <strong>Geocoding API</strong> u biblioteci API-ja</li>
              <li>Otvorite <strong>Settings</strong> (⚙️ ikona u gornjem desnom uglu)</li>
              <li>Idite na <strong>Secrets</strong></li>
              <li>Dodajte <code>GOOGLE_MAPS_PLATFORM_KEY</code> kao naziv, pritisnite <strong>Enter</strong></li>
              <li>Zalijepite vaš ključ kao vrijednost i pritisnite <strong>Enter</strong></li>
            </ol>
          </div>
          
          <p className="text-xs text-zinc-400">
            Aplikacija će se automatski ponovo izgraditi nakon što dodate ključ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      <div className="min-h-screen flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className={`flex items-center justify-center p-4 rounded-2xl shadow-2xl border ${
              toast.type === 'success' 
                ? 'bg-brand border-brand/20 text-white' 
                : 'bg-red-600 border-red-500 text-white'
            }`}>
              <p className="font-bold text-sm text-center">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => {
              if (activeTab === 'home') {
                setAdminTriggerCount(prev => {
                  const next = prev + 1;
                  if (next >= 5) {
                    setActiveTab('admin');
                    window.scrollTo(0, 0);
                    return 0;
                  }
                  return next;
                });
                // Reset count after 2 seconds of inactivity
                setTimeout(() => setAdminTriggerCount(0), 2000);
              } else {
                setActiveTab('home');
              }
            }}
          >
            {appSettings?.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <UtensilsCrossed className="w-8 h-8 text-brand" />
            )}
            <span className="serif text-2xl font-bold tracking-tight" style={{ color: appSettings?.brandColor }}>
              {appSettings?.restaurantName || 'Gourmet Haven'}
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('menu')}
              className={`text-sm font-medium transition-colors ${activeTab === 'menu' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.menu}
            </button>
            <button 
              onClick={() => setActiveTab('reserve')}
              className={`text-sm font-medium transition-colors ${activeTab === 'reserve' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.reservations}
            </button>
            <button 
              onClick={() => setActiveTab('order')}
              className={`text-sm font-medium transition-colors ${activeTab === 'order' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.order}
            </button>
            {auth.currentUser && !userRole && (
              <button 
                onClick={() => setActiveTab('my-orders')}
                className={`text-sm font-medium transition-colors ${activeTab === 'my-orders' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                {t.nav.myOrders}
              </button>
            )}
            <button 
              onClick={() => setActiveTab('about')}
              className={`text-sm font-medium transition-colors ${activeTab === 'about' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.aboutUs}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <Globe className="w-4 h-4 text-zinc-400" />
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setLang('bs')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-all ${lang === 'bs' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  {t.common.bosnian}
                </button>
                <button 
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-all ${lang === 'en' ? 'bg-white text-brand shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  {t.common.english}
                </button>
              </div>
            </div>

            {auth.currentUser && !userRole && (
              <div className="flex items-center gap-3 px-3 py-1 bg-zinc-100 rounded-full">
                {currentUserProfile?.photoURL ? (
                  <img src={currentUserProfile.photoURL} alt="Profile" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-6 h-6 text-zinc-400" />
                )}
                <span className="text-sm font-medium text-zinc-700 hidden lg:block">{currentUserProfile?.displayName || t.common.guest}</span>
                <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            {!auth.currentUser && (
              <button 
                onClick={() => handleGoogleLogin()}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand rounded-xl font-bold text-sm hover:bg-brand/20 transition-all"
              >
                <LogIn className="w-4 h-4" /> {t.nav.login}
              </button>
            )}
            {userRole ? (
              activeTab === 'admin' ? (
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
                >
                  <LogOut className="w-4 h-4" /> {t.nav.logout}
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`p-2 rounded-full transition-colors ${activeTab === 'admin' ? 'bg-brand/10 text-brand' : 'hover:bg-zinc-100 text-zinc-500'}`}
                  title={t.nav.admin}
                >
                  <Settings className="w-6 h-6" />
                </button>
              )
            ) : null}
            <motion.button 
              onClick={() => setIsCartOpen(true)}
              animate={showCartAnimation ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-brand text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </motion.button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-xs bg-white z-50 shadow-2xl flex flex-col md:hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {appSettings?.logoUrl ? (
                    <img src={appSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <UtensilsCrossed className="w-6 h-6 text-brand" />
                  )}
                  <span className="serif text-xl font-bold" style={{ color: appSettings?.brandColor }}>
                    {appSettings?.restaurantName || 'Gourmet Haven'}
                  </span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                <button 
                  onClick={() => { setActiveTab('menu'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'menu' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.menu}
                </button>
                <button 
                  onClick={() => { setActiveTab('reserve'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'reserve' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.reservations}
                </button>
                <button 
                  onClick={() => { setActiveTab('order'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'order' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.order}
                </button>
                {auth.currentUser && !userRole && (
                  <button 
                    onClick={() => { setActiveTab('my-orders'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'my-orders' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    {t.nav.myOrders}
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab('about'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'about' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.aboutUs}
                </button>
                {userRole && (
                  <button 
                    onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'admin' ? 'bg-brand/10 text-brand' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    {t.nav.admin}
                  </button>
                )}
              </div>

              <div className="p-6 border-t border-black/5 space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-4">{t.common.language}</div>
                  <div className="flex p-1 bg-zinc-100 rounded-xl">
                    <button 
                      onClick={() => setLang('bs')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'bs' ? 'bg-white shadow-sm text-brand' : 'text-zinc-500'}`}
                    >
                      {t.common.bosnian}
                    </button>
                    <button 
                      onClick={() => setLang('en')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'en' ? 'bg-white shadow-sm text-brand' : 'text-zinc-500'}`}
                    >
                      {t.common.english}
                    </button>
                  </div>
                </div>

                {auth.currentUser ? (
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      {currentUserProfile?.photoURL ? (
                        <img src={currentUserProfile.photoURL} alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div className="font-bold text-sm text-zinc-900">{currentUserProfile?.displayName || t.common.guest}</div>
                    </div>
                    <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { handleGoogleLogin(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-xl font-bold transition-colors"
                  >
                    <LogIn className="w-5 h-5" /> {t.nav.login}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {activeTab === 'about' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto px-4 py-16"
            >
              <div className="text-center mb-16">
                <h1 className="serif text-5xl md:text-6xl font-black mb-6">{aboutContent?.[lang].storyTitle || t.about.title}</h1>
                <div className="w-24 h-1 bg-brand mx-auto rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
                <div>
                  <h2 className="serif text-3xl font-bold mb-6">{aboutContent?.[lang].storyTitle || t.about.storyTitle}</h2>
                  <p className="text-zinc-600 leading-relaxed mb-6 whitespace-pre-wrap">
                    {aboutContent?.[lang].storyText || t.about.storyText}
                  </p>
                </div>
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800" 
                    alt="Restaurant interior" 
                    className="rounded-3xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand rounded-2xl -z-10 rotate-12"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                <div className="p-8 bg-zinc-50 rounded-3xl border border-black/5 text-center">
                  <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold mb-4">{aboutContent?.[lang].missionTitle || t.about.missionTitle}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {aboutContent?.[lang].missionText || t.about.missionText}
                  </p>
                </div>
                <div className="p-8 bg-zinc-50 rounded-3xl border border-black/5 text-center">
                  <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold mb-4">{aboutContent?.[lang].teamTitle || t.about.teamTitle}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {aboutContent?.[lang].teamText || t.about.teamText}
                  </p>
                </div>
                <div className="p-8 bg-zinc-50 rounded-3xl border border-black/5 text-center">
                  <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold mb-4">{lang === 'bs' ? 'Naša Strast' : 'Our Passion'}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {lang === 'bs' ? 'Svako jelo pripremamo s ljubavlju i pažnjom koju zaslužujete.' : 'We prepare every dish with the love and care you deserve.'}
                  </p>
                </div>
              </div>

              <div className="mb-24">
                <h2 className="serif text-3xl font-bold mb-12 text-center">{t.about.galleryTitle}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.length > 0 ? (
                    galleryImages.map((img, idx) => (
                      <div key={img.id} className={`${idx % 3 === 0 ? 'h-64' : 'h-48'} overflow-hidden rounded-3xl`}>
                        <img 
                          src={img.url} 
                          alt={img.alt || `Gallery ${idx}`} 
                          className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))
                  ) : (
                    // Fallback to static images if gallery is empty
                    <>
                      <div className="space-y-4">
                        <img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=600" alt="G1" className="w-full h-64 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                        <img src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=600" alt="G2" className="w-full h-48 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-4">
                        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600" alt="G3" className="w-full h-48 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600" alt="G4" className="w-full h-64 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                      </div>
                      <div className="hidden md:block space-y-4">
                        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600" alt="G5" className="w-full h-64 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                        <img src="https://images.unsplash.com/photo-1550966842-2849a28c0a60?auto=format&fit=crop&q=80&w=600" alt="G6" className="w-full h-48 object-cover rounded-3xl" referrerPolicy="no-referrer" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 text-white p-12 rounded-[3rem] text-center">
                <h2 className="serif text-3xl font-bold mb-6">{lang === 'bs' ? 'Posjetite Nas' : 'Visit Us'}</h2>
                <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                  {t.home.heroSubtitle}
                </p>
                <button 
                  onClick={() => setActiveTab('reserve')}
                  className="bg-brand text-white px-8 py-4 rounded-2xl font-black hover:bg-brand/90 transition-all shadow-xl shadow-brand/20"
                >
                  {t.home.bookTable}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              <div className="h-[80vh] relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000" 
                  alt="Hero"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center px-4">
                  <div className="max-w-3xl">
                    <motion.h1 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="serif text-5xl md:text-7xl text-white font-bold mb-6"
                    >
                      {t.home.heroTitle}
                    </motion.h1>
                    <p className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                      {t.home.heroSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={() => setActiveTab('menu')}
                        className="bg-brand hover:bg-brand/90 text-white px-8 py-4 rounded-full font-semibold transition-all transform hover:scale-105"
                      >
                        {t.home.exploreMenu}
                      </button>
                      <button 
                        onClick={() => setActiveTab('reserve')}
                        className="bg-white hover:bg-zinc-100 text-zinc-900 px-8 py-4 rounded-full font-semibold transition-all transform hover:scale-105"
                      >
                        {t.home.bookTable}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <section className="max-w-7xl mx-auto px-4 py-24 grid md:grid-cols-3 gap-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-2xl font-bold mb-3">{t.common.workingHours}</h3>
                  <p className="text-zinc-500">{t.common.hours}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-2xl font-bold mb-3">{t.common.location}</h3>
                  <p className="text-zinc-500">{t.common.address}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Phone className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-2xl font-bold mb-3">{t.common.contact}</h3>
                  <p className="text-zinc-500">+387 33 123 456</p>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <div className="text-center mb-12">
                <h2 className="serif text-4xl md:text-5xl font-bold mb-4">{t.menu.title}</h2>
                <div className="w-24 h-1 bg-brand mx-auto mb-8"></div>
                
                {/* Daily Specials Section */}
                {menuItems.some(item => item.isSpecial) && (
                  <div className="mb-16">
                    <h3 className="serif text-2xl font-bold mb-6 text-zinc-800 flex items-center justify-center gap-2">
                      <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                      {lang === 'bs' ? 'Dnevni Specijali' : 'Daily Specials'}
                      <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {menuItems.filter(item => item.isSpecial).map(item => (
                        <motion.div 
                          key={`special-${item.id}`}
                          whileHover={{ y: -5 }}
                          className="bg-amber-50 rounded-3xl overflow-hidden border border-amber-200 shadow-sm hover:shadow-xl transition-all group relative"
                        >
                          <div className="absolute top-4 left-4 z-10 bg-amber-400 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                            {lang === 'bs' ? 'SPECIJAL' : 'SPECIAL'}
                          </div>
                          <div className="h-48 overflow-hidden relative">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                                <UtensilsCrossed className="w-12 h-12 text-amber-300" />
                              </div>
                            )}
                          </div>
                          <div className="p-6">
                            <h4 className="serif text-xl font-bold mb-2">{item.name}</h4>
                            <p className="text-zinc-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex flex-col">
                                {item.promotionPrice ? (
                                  <>
                                    <span className="text-zinc-400 line-through text-xs">{item.price.toFixed(2)} {t.common.currency}</span>
                                    <span className="text-brand font-bold text-lg">{item.promotionPrice.toFixed(2)} {t.common.currency}</span>
                                  </>
                                ) : (
                                  <span className="text-brand font-bold text-lg">{item.price.toFixed(2)} {t.common.currency}</span>
                                )}
                              </div>
                              <button 
                                onClick={() => addToCart(item)}
                                className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  <button 
                    onClick={() => setSelectedCategory('all')}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === 'all' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                  >
                    {lang === 'bs' ? 'Sve' : 'All'}
                  </button>
                  {categories.map((cat) => (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat.name ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems
                  .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
                  .map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    className="bg-white rounded-3xl overflow-hidden border border-black/5 hover:shadow-xl transition-all group"
                  >
                    <div className="h-64 overflow-hidden relative">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                          <UtensilsCrossed className="w-12 h-12 text-zinc-300" />
                        </div>
                      )}
                      
                      {item.promotionPrice && (
                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          {lang === 'bs' ? 'PROMOCIJA' : 'PROMOTION'}
                        </div>
                      )}

                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-brand shadow-sm">
                        {item.promotionPrice ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-400 line-through leading-none mb-1">{item.price.toFixed(2)}</span>
                            <span>{item.promotionPrice.toFixed(2)} {t.common.currency}</span>
                          </div>
                        ) : (
                          <span>{item.price.toFixed(2)} {t.common.currency}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-bold text-brand uppercase tracking-widest">{item.category}</div>
                        {item.isSpecial && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {lang === 'bs' ? 'Specijal' : 'Special'}
                          </span>
                        )}
                      </div>
                      <h3 className="serif text-2xl font-bold mb-2">{item.name}</h3>
                      {item.promotionText && (
                        <p className="text-red-600 text-xs font-bold mb-2 italic">"{item.promotionText}"</p>
                      )}
                      <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{item.description}</p>
                      <button 
                        onClick={() => addToCart(item)}
                        className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                          lastAddedId === item.id 
                            ? 'bg-brand text-white' 
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                        }`}
                      >
                        {lastAddedId === item.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> {lang === 'bs' ? 'Dodano!' : 'Added!'}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> {t.menu.addToCart}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Reviews Section */}
              <div className="mt-24">
                <div className="text-center mb-12">
                  <h2 className="serif text-4xl font-bold mb-4">{lang === 'bs' ? 'Recenzije naših gostiju' : 'Guest Reviews'}</h2>
                  <div className="w-16 h-1 bg-brand mx-auto"></div>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center text-zinc-400 py-12">
                    {lang === 'bs' ? 'Još nema recenzija. Budite prvi koji će ostaviti utisak!' : 'No reviews yet. Be the first to leave an impression!'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reviews.map((review) => (
                      <motion.div 
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-zinc-600 italic mb-6">"{review.comment}"</p>
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-zinc-900">{review.customerName}</div>
                          <div className="text-xs text-zinc-400">
                            {new Date(review.createdAt).toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-US')}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'reserve' && (
            <motion.div 
              key="reserve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto px-4 py-12"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-black/5 shadow-2xl">
                <div className="text-center mb-10">
                  <Calendar className="w-12 h-12 text-brand mx-auto mb-4" />
                  <h2 className="serif text-4xl font-bold mb-2">{t.reserve.title}</h2>
                  <p className="text-zinc-500">{t.reserve.subtitle}</p>
                </div>

                {!auth.currentUser && (
                  <div className="mb-8 p-4 bg-brand/10 rounded-2xl border border-brand/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand/20 text-brand rounded-xl flex items-center justify-center">
                        <LogIn className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{t.reserve.loginPrompt}</div>
                        <div className="text-xs text-zinc-500">{t.reserve.loginSub}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleGoogleLogin()}
                      className="px-4 py-2 bg-white text-brand rounded-xl font-bold text-sm border border-brand/20 hover:bg-brand/10 transition-all whitespace-nowrap"
                    >
                      {t.reserve.googleLogin}
                    </button>
                  </div>
                )}

                {orderStatus === 'success' ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-brand/20 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="serif text-3xl font-bold mb-4">{t.reserve.successTitle}</h3>
                    <p className="text-zinc-500 mb-8">{t.reserve.successSubtitle}</p>
                    <button 
                      onClick={() => { setOrderStatus('idle'); setActiveTab('home'); }}
                      className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium"
                    >
                      {t.reserve.backHome}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReservation} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.name}</label>
                        <input name="name" required type="text" defaultValue={currentUserProfile?.displayName || ''} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all" placeholder={t.reserve.name} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.email}</label>
                        <input name="email" required type="email" defaultValue={currentUserProfile?.email || ''} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all" placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.date}</label>
                        <input name="date" required type="date" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.time}</label>
                        <input name="time" required type="time" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.guests}</label>
                        <select name="guests" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all">
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? t.reserve.person : t.reserve.people}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">{t.reserve.note}</label>
                      <textarea name="note" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none transition-all h-32" placeholder={t.reserve.notePlaceholder}></textarea>
                    </div>
                    <button 
                      disabled={orderStatus === 'submitting'}
                      className="w-full bg-brand hover:bg-brand/90 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
                    >
                      {orderStatus === 'submitting' ? t.reserve.sending : t.reserve.submit}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'order' && (
            <motion.div 
              key="order"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-xl">
                    <h2 className="serif text-3xl font-bold mb-8">{t.order.title}</h2>
                    
                    {!auth.currentUser && (
                      <div className="mb-8 p-4 bg-brand/10 rounded-2xl border border-brand/20 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand/20 text-brand rounded-xl flex items-center justify-center">
                            <LogIn className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-900">{t.order.loginPrompt}</div>
                            <div className="text-xs text-zinc-500">{t.order.loginSub}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleGoogleLogin()}
                          className="px-4 py-2 bg-white text-brand rounded-xl font-bold text-sm border border-brand/20 hover:bg-brand/10 transition-all whitespace-nowrap"
                        >
                          {t.reserve.googleLogin}
                        </button>
                      </div>
                    )}

                    <div className="flex p-1 bg-zinc-100 rounded-xl mb-8">
                      <button 
                        onClick={() => setDeliveryType('delivery')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-white shadow-sm text-brand' : 'text-zinc-500'}`}
                      >
                        {t.order.delivery}
                      </button>
                      <button 
                        onClick={() => setDeliveryType('pickup')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-white shadow-sm text-brand' : 'text-zinc-500'}`}
                      >
                        {t.order.pickup}
                      </button>
                    </div>

                    <form onSubmit={handleOrder} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.name}</label>
                          <input name="name" required type="text" defaultValue={currentUserProfile?.displayName || ''} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.phone}</label>
                          <input name="phone" required type="tel" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" />
                        </div>
                      </div>
                      
                      {deliveryType === 'delivery' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.address}</label>
                          <input name="address" required type="text" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" placeholder={t.order.addressPlaceholder} />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.paymentMethod}</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all">
                          <option>{t.order.cash}</option>
                          <option>{t.order.card}</option>
                        </select>
                      </div>

                      <button 
                        disabled={cart.length === 0 || orderStatus === 'submitting'}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {orderStatus === 'submitting' ? t.order.processing : `${t.order.submit} - ${cartTotal.toFixed(2)} ${t.common.currency}`}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-zinc-50 rounded-3xl p-6 border border-black/5 sticky top-24">
                    <h3 className="serif text-2xl font-bold mb-6">{t.order.cartTitle}</h3>
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-zinc-400">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>{t.order.emptyCart}</p>
                        <button 
                          onClick={() => setActiveTab('menu')}
                          className="text-brand font-bold mt-4 hover:underline"
                        >
                          {t.order.exploreMenu}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map(item => (
                          <div key={item.id} className="flex gap-4 items-center">
                            <img src={item.image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                            <div className="flex-grow">
                              <h4 className="font-bold text-sm">{item.name}</h4>
                              <p className="text-xs text-zinc-500">
                                {(item.promotionPrice || item.price).toFixed(2)} {t.common.currency}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-black/5">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-zinc-100 rounded"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-zinc-100 rounded"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-6 border-t border-zinc-200 mt-6 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.common.subtotal}</span>
                            <span>{cartTotal.toFixed(2)} {t.common.currency}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.common.delivery}</span>
                            <span>{deliveryType === 'delivery' ? `5.00 ${t.common.currency}` : t.common.free}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2">
                            <span>{t.common.total}</span>
                            <span className="text-brand">{(cartTotal + (deliveryType === 'delivery' ? 5 : 0)).toFixed(2)} {t.common.currency}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'my-orders' && (
            <motion.div 
              key="my-orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-4 py-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                  <h2 className="serif text-4xl font-bold mb-2">{t.myOrders.title}</h2>
                  <p className="text-zinc-500">{t.myOrders.subtitle}</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                  {currentUserProfile?.photoURL && (
                    <img src={currentUserProfile.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-brand/20" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <div className="font-bold text-zinc-900">{currentUserProfile?.displayName}</div>
                    <div className="text-sm text-zinc-500">{currentUserProfile?.email}</div>
                  </div>
                </div>
                {appSettings?.loyaltyProgramEnabled && (
                  <div className="flex items-center gap-4 bg-brand p-4 rounded-2xl text-white shadow-lg shadow-brand/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 fill-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest opacity-80">{lang === 'bs' ? 'Loyalty Bodovi' : 'Loyalty Points'}</div>
                      <div className="text-2xl font-bold">{currentUserProfile?.loyaltyPoints || 0}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Orders Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-brand/20 text-brand rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <h3 className="serif text-2xl font-bold">{t.myOrders.orders}</h3>
                  </div>

                  {clientOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-zinc-200">
                      <p className="text-zinc-400">{t.myOrders.emptyOrders}</p>
                      <button 
                        onClick={() => setActiveTab('menu')}
                        className="mt-4 text-brand font-bold hover:underline"
                      >
                        {t.myOrders.orderNow}
                      </button>
                    </div>
                  ) : (
                    clientOrders.map(order => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              {new Date(order.createdAt).toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-US')} {t.myOrders.at} {new Date(order.createdAt).toLocaleTimeString(lang === 'bs' ? 'bs-BA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                order.status === 'completed' ? 'bg-brand/20 text-brand' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {t.myOrders.status[order.status as keyof typeof t.myOrders.status]}
                              </span>
                              <span className="text-xs font-medium text-zinc-500">
                                {order.type === 'delivery' ? t.order.delivery : t.order.pickup}
                              </span>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-brand">{order.total.toFixed(2)} {t.common.currency}</div>
                        </div>
                        <div className="space-y-2 border-t border-zinc-50 pt-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-zinc-600">{item.quantity}x {item.name}</span>
                              <span className="font-medium">{(item.price * item.quantity).toFixed(2)} {t.common.currency}</span>
                            </div>
                          ))}
                        </div>
                        {order.status === 'completed' && !reviews.find(r => r.orderId === order.id) && (
                          <div className="mt-6 pt-6 border-t border-zinc-50">
                            <button 
                              onClick={() => setReviewModalOrder(order)}
                              className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                            >
                              <Star className="w-4 h-4" /> {lang === 'bs' ? 'Ostavi recenziju' : 'Leave a review'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Reservations Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="serif text-2xl font-bold">{t.myOrders.reservations}</h3>
                  </div>

                  {clientReservations.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-zinc-200">
                      <p className="text-zinc-400">{t.myOrders.emptyRes}</p>
                      <button 
                        onClick={() => setActiveTab('reserve')}
                        className="mt-4 text-blue-600 font-bold hover:underline"
                      >
                        {t.myOrders.reserveNow}
                      </button>
                    </div>
                  ) : (
                    clientReservations.map(res => (
                      <div key={res.id} className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-lg font-bold text-zinc-900">
                              {new Date(res.date).toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <div className="text-zinc-500 font-medium">{res.time} h · {res.guests} {res.guests === 1 ? t.reserve.person : t.reserve.people}</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            res.status === 'confirmed' ? 'bg-brand/20 text-brand' :
                            res.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {t.myOrders.status[res.status as keyof typeof t.myOrders.status]}
                          </span>
                        </div>
                        {res.note && (
                          <div className="text-sm text-zinc-500 bg-zinc-50 p-3 rounded-xl italic">
                            "{res.note}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {userRole ? (
                <AdminPanel 
                  menuItems={menuItems}
                  reservations={reservations}
                  orders={orders}
                  workers={workers}
                  categories={categories}
                  userRole={userRole}
                  workerPermissions={currentWorker?.permissions}
                  appSettings={appSettings}
                  onUpdateReservation={updateReservationStatus}
                  onUpdateOrder={updateOrderStatus}
                  onDeleteOrder={deleteOrder}
                  onClearOldOrders={clearOldOrders}
                  onAddMenuItem={addMenuItem}
                  onDeleteMenuItem={deleteMenuItem}
                  onAddWorker={addWorker}
                  onDeleteWorker={deleteWorker}
                  onUpdateWorkerPermissions={updateWorkerPermissions}
                  onUpdateAppSettings={updateAppSettings}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                  aboutContent={aboutContent}
                  galleryImages={galleryImages}
                  onUpdateAboutContent={updateAboutContent}
                  onAddGalleryImage={addGalleryImage}
                  onDeleteGalleryImage={deleteGalleryImage}
                  t={t}
                  lang={lang}
                />
              ) : (
                <AdminLogin onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} t={t} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h2 className="serif text-2xl font-bold">{t.cart.title}</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                    <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">{t.cart.empty}</p>
                    <button 
                      onClick={() => { setIsCartOpen(false); setActiveTab('menu'); }}
                      className="mt-6 bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium"
                    >
                      {t.cart.explore}
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-zinc-900">{item.name}</h3>
                            <button onClick={() => removeFromCart(item.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-zinc-500 mt-1">
                            {(item.promotionPrice || item.price).toFixed(2)} {t.common.currency}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-black/5 bg-zinc-50">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-zinc-500 font-medium">{t.cart.total}</span>
                    <span className="text-2xl font-bold text-brand">{cartTotal.toFixed(2)} {t.common.currency}</span>
                  </div>
                  <button 
                    onClick={() => { setIsCartOpen(false); setActiveTab('order'); }}
                    className="w-full bg-brand hover:bg-brand/90 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20"
                  >
                    {t.cart.checkout} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

        <footer className="bg-zinc-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <UtensilsCrossed className="w-8 h-8 text-brand" />
                <span className="serif text-2xl font-bold">Gourmet Haven</span>
              </div>
              <p className="text-zinc-400 max-w-md mb-8">
                {t.footer.about}
              </p>
              <div className="flex gap-4">
                {['Instagram', 'Facebook', 'Twitter'].map(social => (
                  <a key={social} href="#" className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-brand transition-colors">
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 bg-zinc-400 rounded-sm"></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">{t.footer.quickLinks}</h4>
              <ul className="space-y-4 text-zinc-400">
                <li><button onClick={() => setActiveTab('menu')} className="hover:text-brand transition-colors">{t.nav.menu}</button></li>
                <li><button onClick={() => setActiveTab('reserve')} className="hover:text-brand transition-colors">{t.nav.reservations}</button></li>
                <li><button onClick={() => setActiveTab('order')} className="hover:text-brand transition-colors">{t.nav.order}</button></li>
                <li><button onClick={() => setActiveTab('about')} className="hover:text-brand transition-colors">{t.footer.aboutUs}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">{t.footer.newsletter}</h4>
              <p className="text-zinc-400 text-sm mb-4">{t.footer.newsletterSub}</p>
              <div className="flex gap-2 max-w-sm">
                <input 
                  type="email" 
                  placeholder={t.footer.emailPlaceholder} 
                  className="bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand outline-none flex-1 min-w-0" 
                />
                <button className="bg-brand px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand/90 transition-colors whitespace-nowrap shrink-0">
                  OK
                </button>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-zinc-800 flex justify-between items-center text-zinc-500 text-sm">
            <div>© 2026 {appSettings?.restaurantName || 'Gourmet Haven'}. {t.footer.rights}</div>
            {userRole && (
              <button 
                onClick={() => { setActiveTab('admin'); window.scrollTo(0, 0); }}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest"
              >
                {t.nav.admin}
              </button>
            )}
          </div>
        </footer>

        {/* Review Modal */}
        <AnimatePresence>
          {reviewModalOrder && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              >
                <h3 className="serif text-2xl font-bold mb-2">
                  {lang === 'bs' ? 'Ostavite recenziju' : 'Leave a review'}
                </h3>
                <p className="text-zinc-500 mb-6">
                  {lang === 'bs' ? 'Podijelite svoje iskustvo s nama.' : 'Share your experience with us.'}
                </p>

                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`p-1 transition-all ${reviewRating >= star ? 'text-yellow-400 scale-110' : 'text-zinc-200 hover:text-yellow-200'}`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={lang === 'bs' ? 'Vaš komentar...' : 'Your comment...'}
                  className="w-full h-32 bg-zinc-50 border border-black/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand outline-none resize-none mb-6"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setReviewModalOrder(null);
                      setReviewComment('');
                      setReviewRating(5);
                    }}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
                  >
                    {lang === 'bs' ? 'Odustani' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      if (reviewComment.trim()) {
                        addReview({
                          customerUid: auth.currentUser!.uid,
                          customerName: currentUserProfile?.displayName || 'Guest',
                          rating: reviewRating,
                          comment: reviewComment,
                          orderId: reviewModalOrder.id
                        });
                        setReviewModalOrder(null);
                        setReviewComment('');
                        setReviewRating(5);
                      }
                    }}
                    className="flex-1 py-3 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                  >
                    {lang === 'bs' ? 'Pošalji' : 'Submit'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </APIProvider>
  );
}
