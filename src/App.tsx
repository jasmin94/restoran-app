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
  Settings,
  LogOut,
  User,
  LogIn,
  Globe
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
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { MenuItem, CartItem, Reservation, Order, Worker, UserProfile, INITIAL_MENU_ITEMS } from './types';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { Language, translations } from './translations';

export default function App() {
  const [lang, setLang] = useState<Language>('bs');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'reserve' | 'order' | 'admin' | 'my-orders'>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth & User State
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [clientReservations, setClientReservations] = useState<Reservation[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Firebase Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === 'jasminhalilovic122@gmail.com') {
          setUserRole('admin');
        } else {
          const savedRole = localStorage.getItem('userRole');
          if (savedRole === 'worker') setUserRole('worker');
          else setUserRole(null);
        }

        // Handle Client Profile
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || t.common.guest,
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setCurrentUserProfile(newProfile);
          } else {
            setCurrentUserProfile(userDoc.data() as UserProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUserRole(null);
        setCurrentUserProfile(null);
        localStorage.removeItem('userRole');
      }
      setIsAuthReady(true);
    });

    const qMenu = query(collection(db, 'menu'), orderBy('category'));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem));
      setMenuItems(items.length > 0 ? items : INITIAL_MENU_ITEMS);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'menu'));

    const qWorkers = query(collection(db, 'workers'), orderBy('name'));
    const unsubscribeWorkers = onSnapshot(qWorkers, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Worker)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'workers'));

    return () => {
      unsubscribeAuth();
      unsubscribeMenu();
      unsubscribeWorkers();
    };
  }, []);

  // Protected & Client Listeners
  useEffect(() => {
    if (!isAuthReady) return;
    
    let unsubscribeRes: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeClientOrders: (() => void) | undefined;
    let unsubscribeClientRes: (() => void) | undefined;

    if (userRole === 'admin' || userRole === 'worker') {
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

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

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
      items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
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
    // Check Admin via Google Login (handled in AdminLogin)
    // But for simple email/pass check for workers:
    const worker = workers.find(w => w.email === email && w.password === pass);
    if (worker) {
      setUserRole('worker');
      localStorage.setItem('userRole', 'worker');
      return true;
    }

    // Fallback for admin email/pass (for testing, but Google is preferred)
    if (email === 'admin@gourmethaven.com' && pass === 'admin') {
      setUserRole('admin');
      return true;
    }

    return false;
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
    localStorage.removeItem('userRole');
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
      const { id, ...data } = worker;
      await addDoc(collection(db, 'workers'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'workers');
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workers/${id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setActiveTab('home')}
          >
            <UtensilsCrossed className="w-8 h-8 text-emerald-600" />
            <span className="serif text-2xl font-bold tracking-tight">Gourmet Haven</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('menu')}
              className={`text-sm font-medium transition-colors ${activeTab === 'menu' ? 'text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.menu}
            </button>
            <button 
              onClick={() => setActiveTab('reserve')}
              className={`text-sm font-medium transition-colors ${activeTab === 'reserve' ? 'text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.reservations}
            </button>
            <button 
              onClick={() => setActiveTab('order')}
              className={`text-sm font-medium transition-colors ${activeTab === 'order' ? 'text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {t.nav.order}
            </button>
            {auth.currentUser && !userRole && (
              <button 
                onClick={() => setActiveTab('my-orders')}
                className={`text-sm font-medium transition-colors ${activeTab === 'my-orders' ? 'text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                {t.nav.myOrders}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <Globe className="w-4 h-4 text-zinc-400" />
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setLang('bs')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-all ${lang === 'bs' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  {t.common.bosnian}
                </button>
                <button 
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-all ${lang === 'en' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
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
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all"
              >
                <LogIn className="w-4 h-4" /> {t.nav.login}
              </button>
            )}
            {userRole && activeTab === 'admin' ? (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
              >
                <LogOut className="w-4 h-4" /> {t.nav.logout}
              </button>
            ) : (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`p-2 rounded-full transition-colors ${activeTab === 'admin' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-zinc-100 text-zinc-500'}`}
                title={t.nav.admin}
              >
                <Settings className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
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
                  <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
                  <span className="serif text-xl font-bold">Gourmet Haven</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                <button 
                  onClick={() => { setActiveTab('menu'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'menu' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.menu}
                </button>
                <button 
                  onClick={() => { setActiveTab('reserve'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'reserve' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.reservations}
                </button>
                <button 
                  onClick={() => { setActiveTab('order'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'order' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.order}
                </button>
                {auth.currentUser && !userRole && (
                  <button 
                    onClick={() => { setActiveTab('my-orders'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'my-orders' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    {t.nav.myOrders}
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {t.nav.admin}
                </button>
              </div>

              <div className="p-6 border-t border-black/5 space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-4">{t.common.language}</div>
                  <div className="flex p-1 bg-zinc-100 rounded-xl">
                    <button 
                      onClick={() => setLang('bs')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'bs' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}
                    >
                      {t.common.bosnian}
                    </button>
                    <button 
                      onClick={() => setLang('en')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'en' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold transition-colors"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-semibold transition-all transform hover:scale-105"
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
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-2xl font-bold mb-3">{t.common.workingHours}</h3>
                  <p className="text-zinc-500">{t.common.hours}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-2xl font-bold mb-3">{t.common.location}</h3>
                  <p className="text-zinc-500">{t.common.address}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
              <div className="text-center mb-16">
                <h2 className="serif text-4xl md:text-5xl font-bold mb-4">{t.menu.title}</h2>
                <div className="w-24 h-1 bg-emerald-600 mx-auto"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    className="bg-white rounded-3xl overflow-hidden border border-black/5 hover:shadow-xl transition-all group"
                  >
                    <div className="h-64 overflow-hidden relative">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-emerald-600">
                        {item.price.toFixed(2)} {t.common.currency}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">{item.category}</div>
                      <h3 className="serif text-2xl font-bold mb-2">{item.name}</h3>
                      <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{item.description}</p>
                      <button 
                        onClick={() => addToCart(item)}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> {t.menu.addToCart}
                      </button>
                    </div>
                  </motion.div>
                ))}
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
                  <Calendar className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                  <h2 className="serif text-4xl font-bold mb-2">{t.reserve.title}</h2>
                  <p className="text-zinc-500">{t.reserve.subtitle}</p>
                </div>

                {!auth.currentUser && (
                  <div className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <LogIn className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{t.reserve.loginPrompt}</div>
                        <div className="text-xs text-zinc-500">{t.reserve.loginSub}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleGoogleLogin()}
                      className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold text-sm border border-emerald-200 hover:bg-emerald-50 transition-all whitespace-nowrap"
                    >
                      {t.reserve.googleLogin}
                    </button>
                  </div>
                )}

                {orderStatus === 'success' ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
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
                        <input name="name" required type="text" defaultValue={currentUserProfile?.displayName || ''} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder={t.reserve.name} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.email}</label>
                        <input name="email" required type="email" defaultValue={currentUserProfile?.email || ''} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.date}</label>
                        <input name="date" required type="date" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.time}</label>
                        <input name="time" required type="time" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">{t.reserve.guests}</label>
                        <select name="guests" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? t.reserve.person : t.reserve.people}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">{t.reserve.note}</label>
                      <textarea name="note" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-32" placeholder={t.reserve.notePlaceholder}></textarea>
                    </div>
                    <button 
                      disabled={orderStatus === 'submitting'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
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
                      <div className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <LogIn className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-900">{t.order.loginPrompt}</div>
                            <div className="text-xs text-zinc-500">{t.order.loginSub}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleGoogleLogin()}
                          className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold text-sm border border-emerald-200 hover:bg-emerald-50 transition-all whitespace-nowrap"
                        >
                          {t.reserve.googleLogin}
                        </button>
                      </div>
                    )}

                    <div className="flex p-1 bg-zinc-100 rounded-xl mb-8">
                      <button 
                        onClick={() => setDeliveryType('delivery')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}
                      >
                        {t.order.delivery}
                      </button>
                      <button 
                        onClick={() => setDeliveryType('pickup')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}
                      >
                        {t.order.pickup}
                      </button>
                    </div>

                    <form onSubmit={handleOrder} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.name}</label>
                          <input name="name" required type="text" defaultValue={currentUserProfile?.displayName || ''} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.phone}</label>
                          <input name="phone" required type="tel" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" />
                        </div>
                      </div>
                      
                      {deliveryType === 'delivery' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.address}</label>
                          <input name="address" required type="text" className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" placeholder={t.order.addressPlaceholder} />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t.order.paymentMethod}</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all">
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
                          className="text-emerald-600 font-bold mt-4 hover:underline"
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
                              <p className="text-xs text-zinc-500">{item.price.toFixed(2)} {t.common.currency}</p>
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
                            <span className="text-emerald-600">{(cartTotal + (deliveryType === 'delivery' ? 5 : 0)).toFixed(2)} {t.common.currency}</span>
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
                    <img src={currentUserProfile.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-emerald-100" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <div className="font-bold text-zinc-900">{currentUserProfile?.displayName}</div>
                    <div className="text-sm text-zinc-500">{currentUserProfile?.email}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Orders Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <h3 className="serif text-2xl font-bold">{t.myOrders.orders}</h3>
                  </div>

                  {clientOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-zinc-200">
                      <p className="text-zinc-400">{t.myOrders.emptyOrders}</p>
                      <button 
                        onClick={() => setActiveTab('menu')}
                        className="mt-4 text-emerald-600 font-bold hover:underline"
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
                                order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
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
                          <div className="text-xl font-bold text-emerald-600">{order.total.toFixed(2)} {t.common.currency}</div>
                        </div>
                        <div className="space-y-2 border-t border-zinc-50 pt-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-zinc-600">{item.quantity}x {item.name}</span>
                              <span className="font-medium">{(item.price * item.quantity).toFixed(2)} {t.common.currency}</span>
                            </div>
                          ))}
                        </div>
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
                            res.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
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
                  userRole={userRole}
                  onUpdateReservation={updateReservationStatus}
                  onUpdateOrder={updateOrderStatus}
                  onAddMenuItem={addMenuItem}
                  onDeleteMenuItem={deleteMenuItem}
                  onAddWorker={addWorker}
                  onDeleteWorker={deleteWorker}
                  t={t}
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
                          <p className="text-sm text-zinc-500 mt-1">{item.price.toFixed(2)} {t.common.currency}</p>
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
                    <span className="text-2xl font-bold text-emerald-600">{cartTotal.toFixed(2)} {t.common.currency}</span>
                  </div>
                  <button 
                    onClick={() => { setIsCartOpen(false); setActiveTab('order'); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
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
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <UtensilsCrossed className="w-8 h-8 text-emerald-500" />
                <span className="serif text-2xl font-bold">Gourmet Haven</span>
              </div>
              <p className="text-zinc-400 max-w-md mb-8">
                {t.footer.about}
              </p>
              <div className="flex gap-4">
                {['Instagram', 'Facebook', 'Twitter'].map(social => (
                  <a key={social} href="#" className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-emerald-600 transition-colors">
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 bg-zinc-400 rounded-sm"></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">{t.footer.quickLinks}</h4>
              <ul className="space-y-4 text-zinc-400">
                <li><button onClick={() => setActiveTab('menu')} className="hover:text-emerald-500 transition-colors">{t.nav.menu}</button></li>
                <li><button onClick={() => setActiveTab('reserve')} className="hover:text-emerald-500 transition-colors">{t.nav.reservations}</button></li>
                <li><button onClick={() => setActiveTab('order')} className="hover:text-emerald-500 transition-colors">{t.nav.order}</button></li>
                <li><button className="hover:text-emerald-500 transition-colors">{t.footer.aboutUs}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">{t.footer.newsletter}</h4>
              <p className="text-zinc-400 text-sm mb-4">{t.footer.newsletterSub}</p>
              <div className="flex gap-2">
                <input type="email" placeholder={t.footer.emailPlaceholder} className="bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-grow" />
                <button className="bg-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors">OK</button>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
            © 2026 Gourmet Haven. {t.footer.rights}
          </div>
        </footer>
      </div>
    );
  }
