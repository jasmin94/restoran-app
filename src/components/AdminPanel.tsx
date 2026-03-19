import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  X, 
  Package, 
  Plus, 
  LayoutDashboard, 
  ClipboardList, 
  Utensils,
  Trash2,
  Image as ImageIcon,
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Palette,
  MapPin,
  Navigation
} from 'lucide-react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { QRCodeSVG } from 'qrcode.react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { MenuItem, Reservation, Order, Worker, UserProfile, WorkerPermissions, AppSettings, Category, AboutContent, GalleryImage } from '../types';

interface AdminPanelProps {
  menuItems: MenuItem[];
  reservations: Reservation[];
  orders: Order[];
  workers: Worker[];
  categories: Category[];
  userRole: 'admin' | 'worker';
  workerPermissions?: WorkerPermissions;
  appSettings: AppSettings | null;
  onUpdateReservation: (id: string, status: Reservation['status']) => void;
  onUpdateOrder: (id: string, status: Order['status']) => void;
  onDeleteOrder: (id: string) => void;
  onClearOldOrders: () => void;
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onAddWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onUpdateWorkerPermissions: (id: string, permissions: WorkerPermissions) => void;
  onUpdateAppSettings: (settings: AppSettings) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  aboutContent: AboutContent | null;
  galleryImages: GalleryImage[];
  onUpdateAboutContent: (content: AboutContent) => void;
  onAddGalleryImage: (url: string) => void;
  onDeleteGalleryImage: (id: string) => void;
  t: any;
  lang: string;
}

function OrderMap({ address, brandColor }: { address: string; brandColor: string }) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [position, setPosition] = React.useState<google.maps.LatLngLiteral | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!geocodingLib || !address) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const pos = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        setPosition(pos);
        map?.setCenter(pos);
        map?.setZoom(15);
        setError(null);
      } else {
        console.error('Geocoding failed:', status);
        setError(status);
      }
    });
  }, [geocodingLib, address, map]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 p-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold">Geocoding Error: {error}</span>
          <p className="text-xs">
            {error === 'REQUEST_DENIED' 
              ? 'The Geocoding API is not activated. Please enable it in your Google Cloud Console.' 
              : 'Could not find the address on the map.'}
          </p>
          <a 
            href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline mt-2"
          >
            Enable Geocoding API
          </a>
        </div>
      </div>
    );
  }

  if (!position) return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Geocoding address...</span>
      </div>
    </div>
  );

  return (
    <AdvancedMarker position={position}>
      <Pin background={brandColor} glyphColor="#fff" />
    </AdvancedMarker>
  );
}

export default function AdminPanel({ 
  menuItems, 
  reservations, 
  orders, 
  workers,
  categories,
  userRole,
  workerPermissions,
  appSettings,
  onUpdateReservation, 
  onUpdateOrder, 
  onDeleteOrder,
  onClearOldOrders,
  onAddMenuItem,
  onDeleteMenuItem,
  onAddWorker,
  onDeleteWorker,
  onUpdateWorkerPermissions,
  onUpdateAppSettings,
  onAddCategory,
  onDeleteCategory,
  aboutContent,
  galleryImages,
  onUpdateAboutContent,
  onAddGalleryImage,
  onDeleteGalleryImage,
  t,
  lang
}: AdminPanelProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canManageReservations = userRole === 'admin' || workerPermissions?.canManageReservations;
  const canManageOrders = userRole === 'admin' || workerPermissions?.canManageOrders;
  const canManageMenu = userRole === 'admin' || workerPermissions?.canManageMenu;
  const canManageWorkers = userRole === 'admin' || workerPermissions?.canManageWorkers;

  const [activeTab, setActiveTab] = useState<'reservations' | 'orders' | 'menu' | 'workers' | 'settings'>(
    canManageReservations ? 'reservations' : (canManageOrders ? 'orders' : 'menu')
  );
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branding' | 'about' | 'gallery'>('general');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    category: '',
    price: 0,
    name: '',
    description: '',
    image: '',
    isSpecial: false,
    promotionPrice: undefined,
    promotionText: ''
  });

  const [editAbout, setEditAbout] = useState<AboutContent | null>(null);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    restaurantName: appSettings?.restaurantName || 'Gourmet Haven',
    brandColor: appSettings?.brandColor || '#10b981',
    logoUrl: appSettings?.logoUrl || ''
  });

  const [mapOrder, setMapOrder] = useState<Order | null>(null);

  React.useEffect(() => {
    if (appSettings) {
      setBrandingForm({
        restaurantName: appSettings.restaurantName || 'Gourmet Haven',
        brandColor: appSettings.brandColor || '#10b981',
        logoUrl: appSettings.logoUrl || ''
      });
    }
  }, [appSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `branding/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBrandingForm(prev => ({ ...prev, logoUrl: url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBranding = () => {
    if (appSettings) {
      onUpdateAppSettings({
        ...appSettings,
        ...brandingForm
      });
    }
  };

  React.useEffect(() => {
    if (aboutContent && !editAbout) {
      setEditAbout(aboutContent);
    }
  }, [aboutContent]);

  // Update default category when categories are loaded
  React.useEffect(() => {
    if (!newItem.category && categories.length > 0) {
      setNewItem(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, newItem.category]);

  const [newWorker, setNewWorker] = useState<Partial<Worker>>({
    name: '',
    role: t.adminPanel.roles.waiter,
    email: '',
    phone: '',
    password: ''
  });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewWorker(prev => ({ ...prev, password: pass }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.price && newItem.image) {
      onAddMenuItem({
        ...newItem as MenuItem,
        id: Math.random().toString(36).substr(2, 9)
      });
      setShowAddForm(false);
      setNewItem({ 
        category: categories[0]?.name || '', 
        price: 0, 
        name: '', 
        description: '', 
        image: '',
        isSpecial: false,
        promotionPrice: undefined,
        promotionText: ''
      });
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowCategoryForm(false);
    }
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorker.name && newWorker.email && newWorker.phone && newWorker.password) {
      onAddWorker({
        ...newWorker as Worker,
        id: `w-${Math.random().toString(36).substr(2, 9)}`,
        joinedAt: new Date().toISOString().split('T')[0],
        permissions: {
          canManageMenu: false,
          canManageOrders: true,
          canManageReservations: true,
          canManageWorkers: false
        }
      });
      setShowWorkerForm(false);
      setNewWorker({ name: '', role: t.adminPanel.roles.waiter, email: '', phone: '', password: '' });
    }
  };

  const togglePermission = (worker: Worker, key: keyof WorkerPermissions) => {
    const currentPerms = worker.permissions || {
      canManageMenu: false,
      canManageOrders: true,
      canManageReservations: true,
      canManageWorkers: false
    };
    onUpdateWorkerPermissions(worker.id, {
      ...currentPerms,
      [key]: !currentPerms[key]
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          {canManageReservations && (
            <button 
              onClick={() => setActiveTab('reservations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'reservations' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <ClipboardList className="w-5 h-5" /> {t.adminPanel.reservations}
            </button>
          )}
          {canManageOrders && (
            <button 
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'orders' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Package className="w-5 h-5" /> {t.adminPanel.orders}
            </button>
          )}
          {canManageMenu && (
            <button 
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'menu' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Utensils className="w-5 h-5" /> {t.adminPanel.menuManagement}
            </button>
          )}
          {canManageWorkers && (
            <button 
              onClick={() => setActiveTab('workers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'workers' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Users className="w-5 h-5" /> {t.adminPanel.workers}
            </button>
          )}
          {userRole === 'admin' && (
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
              >
                <ShieldCheck className="w-5 h-5" /> {lang === 'bs' ? 'Postavke' : 'Settings'}
              </button>
              
              {activeTab === 'settings' && (
                <div className="pl-12 space-y-1">
                  <button 
                    onClick={() => setSettingsSubTab('general')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${settingsSubTab === 'general' ? 'text-brand font-bold bg-brand/10' : 'text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    {lang === 'bs' ? 'Opšte' : 'General'}
                  </button>
                  <button 
                    onClick={() => setSettingsSubTab('branding')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${settingsSubTab === 'branding' ? 'text-brand font-bold bg-brand/10' : 'text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    {t.adminPanel.branding}
                  </button>
                  <button 
                    onClick={() => setSettingsSubTab('about')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${settingsSubTab === 'about' ? 'text-brand font-bold bg-brand/10' : 'text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    {t.adminPanel.manageAbout}
                  </button>
                  <button 
                    onClick={() => setSettingsSubTab('gallery')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${settingsSubTab === 'gallery' ? 'text-brand font-bold bg-brand/10' : 'text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    {t.adminPanel.manageGallery}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow">
          {activeTab === 'reservations' && userRole === 'admin' && (
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-black/5">
                <h2 className="serif text-2xl font-bold">{t.adminPanel.overviewRes}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.guest}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.dateTime}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.people}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.status}</th>
                      <th className="px-6 py-4 font-bold text-right">{t.adminPanel.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {reservations.map(res => (
                      <tr key={res.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900">{res.name}</div>
                          <div className="text-xs text-zinc-500">{res.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {res.date} {t.myOrders.at} {res.time}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {res.guests}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            res.status === 'confirmed' ? 'bg-brand/20 text-brand' :
                            res.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {res.status === 'confirmed' ? t.adminPanel.confirmed : res.status === 'cancelled' ? t.adminPanel.cancelled : t.adminPanel.pending}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {res.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => onUpdateReservation(res.id, 'confirmed')}
                                  className="p-2 bg-brand/10 text-brand rounded-lg hover:bg-brand/20 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => onUpdateReservation(res.id, 'cancelled')}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h2 className="serif text-2xl font-bold">{t.adminPanel.overviewOrders}</h2>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> {lang === 'bs' ? 'Očisti stare narudžbe' : 'Clear old orders'}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.customer}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.items}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.total}</th>
                      <th className="px-6 py-4 font-bold">{t.adminPanel.status}</th>
                      <th className="px-6 py-4 font-bold text-right">{t.adminPanel.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900">{order.customerName}</div>
                          <div className="text-xs text-zinc-500">{order.phone}</div>
                          <div className="text-[10px] text-zinc-400 mt-1">{order.type === 'delivery' ? `${t.adminPanel.delivery}: ${order.address}` : t.adminPanel.pickup}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-zinc-600">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-brand">
                          {order.total.toFixed(2)} {t.common.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'confirmed' ? 'bg-brand/20 text-brand' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status === 'delivered' ? t.adminPanel.delivered : order.status === 'confirmed' ? t.adminPanel.preparing : order.status === 'cancelled' ? t.adminPanel.cancelled : t.adminPanel.new}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => onUpdateOrder(order.id, 'confirmed')}
                                className="p-2 bg-brand/10 text-brand rounded-lg hover:bg-brand/20 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'confirmed' && (
                              <button 
                                onClick={() => onUpdateOrder(order.id, 'delivered')}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                <Package className="w-4 h-4" />
                              </button>
                            )}
                            {(order.status === 'pending' || order.status === 'confirmed') && (
                              <button 
                                onClick={() => onUpdateOrder(order.id, 'cancelled')}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {order.type === 'delivery' && order.address && (
                              <button 
                                onClick={() => setMapOrder(order)}
                                className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                                title={lang === 'bs' ? 'Prikaži na mapi' : 'Show on map'}
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                            )}
                            {userRole === 'admin' && (
                              <button 
                                onClick={() => setDeleteConfirmId(order.id)}
                                className="p-2 text-zinc-300 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="serif text-3xl font-bold">{t.adminPanel.menuManagement}</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                    className="bg-zinc-100 text-zinc-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all"
                  >
                    <ClipboardList className="w-5 h-5" /> {t.adminPanel.manageCategories}
                  </button>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
                  >
                    <Plus className="w-5 h-5" /> {t.adminPanel.newItem}
                  </button>
                </div>
              </div>

              {showCategoryForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-zinc-900 mb-4">{t.adminPanel.addCategory}</h3>
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                          required 
                          type="text" 
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder={t.adminPanel.categoryName}
                          className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                        />
                        <button 
                          type="submit"
                          className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 mb-4">{lang === 'bs' ? 'Postojeće Kategorije' : 'Existing Categories'}</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {categories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                            <span className="font-medium text-zinc-700">{cat.name}</span>
                            <button 
                              onClick={() => onDeleteCategory(cat.id)}
                              className="text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {showAddForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl border border-brand/10 shadow-xl shadow-brand/5"
                >
                  <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.itemName}</label>
                      <input 
                        required 
                        type="text" 
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.category}</label>
                      <select 
                        required
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all"
                      >
                        <option value="" disabled>{lang === 'bs' ? 'Odaberite kategoriju' : 'Select category'}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.price}</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01"
                        value={newItem.price}
                        onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.imageUrl}</label>
                      <input 
                        required 
                        type="url" 
                        value={newItem.image}
                        onChange={e => setNewItem({...newItem, image: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.description}</label>
                      <textarea 
                        required 
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-24"
                      ></textarea>
                    </div>

                    {/* Specials & Promotions Section */}
                    <div className="md:col-span-2 p-4 bg-brand/10 rounded-2xl border border-brand/20 space-y-4">
                      <h4 className="font-bold text-brand text-sm">{lang === 'bs' ? 'Specijali i Promocije' : 'Specials & Promotions'}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setNewItem({ ...newItem, isSpecial: !newItem.isSpecial })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newItem.isSpecial ? 'bg-brand' : 'bg-zinc-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newItem.isSpecial ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-sm font-medium text-zinc-700">{lang === 'bs' ? 'Dnevni specijal' : 'Daily Special'}</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'bs' ? 'Akcijska cijena' : 'Promotion Price'}</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={newItem.promotionPrice || ''}
                            onChange={e => setNewItem({...newItem, promotionPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                            className="w-full px-3 py-2 rounded-lg bg-white border-transparent focus:border-brand outline-none transition-all text-sm" 
                            placeholder="0.00"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'bs' ? 'Tekst promocije (npr. -20%)' : 'Promotion Text (e.g. -20%)'}</label>
                          <input 
                            type="text" 
                            value={newItem.promotionText || ''}
                            onChange={e => setNewItem({...newItem, promotionText: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg bg-white border-transparent focus:border-brand outline-none transition-all text-sm" 
                            placeholder={lang === 'bs' ? 'Akcija!' : 'Sale!'}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-4">
                      <button 
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                      >
                        {t.adminPanel.cancel}
                      </button>
                      <button 
                        type="submit"
                        className="bg-brand text-white px-8 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all"
                      >
                        {t.adminPanel.add}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-black/5 p-4 flex gap-4 items-center group">
                    {item.image ? (
                      <img src={item.image} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-20 h-20 bg-zinc-100 rounded-xl flex items-center justify-center">
                        <Utensils className="w-8 h-8 text-zinc-300" />
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900">{item.name}</h4>
                        {item.isSpecial && (
                          <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {lang === 'bs' ? 'Specijal' : 'Special'}
                          </span>
                        )}
                        {item.promotionPrice && (
                          <span className="bg-red-100 text-red-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {item.promotionText || (lang === 'bs' ? 'Akcija' : 'Sale')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{item.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-sm font-bold ${item.promotionPrice ? 'text-zinc-400 line-through' : 'text-brand'}`}>
                          {item.price.toFixed(2)} {t.common.currency}
                        </p>
                        {item.promotionPrice && (
                          <p className="text-sm font-bold text-red-600">
                            {item.promotionPrice.toFixed(2)} {t.common.currency}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteMenuItem(item.id)}
                      className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workers' && userRole === 'admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="serif text-3xl font-bold">{t.adminPanel.workers}</h2>
                <button 
                  onClick={() => setShowWorkerForm(!showWorkerForm)}
                  className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
                >
                  <UserPlus className="w-5 h-5" /> {t.adminPanel.newWorker}
                </button>
              </div>

              {showWorkerForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl border border-brand/10 shadow-xl shadow-brand/5"
                >
                  <form onSubmit={handleAddWorker} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.workerName}</label>
                      <input 
                        required 
                        type="text" 
                        value={newWorker.name}
                        onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.position}</label>
                      <select 
                        value={newWorker.role}
                        onChange={e => setNewWorker({...newWorker, role: e.target.value as any})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all"
                      >
                        <option value={t.adminPanel.roles.waiter}>{t.adminPanel.roles.waiter}</option>
                        <option value={t.adminPanel.roles.chef}>{t.adminPanel.roles.chef}</option>
                        <option value={t.adminPanel.roles.delivery}>{t.adminPanel.roles.delivery}</option>
                        <option value={t.adminPanel.roles.manager}>{t.adminPanel.roles.manager}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.email}</label>
                      <input 
                        required 
                        type="email" 
                        value={newWorker.email}
                        onChange={e => setNewWorker({...newWorker, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.phone}</label>
                      <input 
                        required 
                        type="text" 
                        value={newWorker.phone}
                        onChange={e => setNewWorker({...newWorker, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.password}</label>
                      <div className="flex gap-2">
                        <input 
                          required 
                          type="text" 
                          value={newWorker.password}
                          onChange={e => setNewWorker({...newWorker, password: e.target.value})}
                          className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all" 
                        />
                        <button 
                          type="button"
                          onClick={generatePassword}
                          className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all"
                        >
                          {t.adminPanel.generate}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-4">
                      <button 
                        type="button"
                        onClick={() => setShowWorkerForm(false)}
                        className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                      >
                        {t.adminPanel.cancel}
                      </button>
                      <button 
                        type="submit"
                        className="bg-brand text-white px-8 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all"
                      >
                        {t.adminPanel.addWorker}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">{t.adminPanel.worker}</th>
                        <th className="px-6 py-4 font-bold">{t.adminPanel.position}</th>
                        <th className="px-6 py-4 font-bold">{t.adminPanel.contact}</th>
                        <th className="px-6 py-4 font-bold">{t.adminPanel.password}</th>
                        <th className="px-6 py-4 font-bold text-right">{t.adminPanel.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {workers.map(worker => (
                        <React.Fragment key={worker.id}>
                          <tr className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4">
                            <div className="font-bold text-zinc-900">{worker.name}</div>
                            <div className="text-xs text-zinc-400">ID: {worker.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              worker.role === t.adminPanel.roles.manager ? 'bg-purple-100 text-purple-700' :
                              worker.role === t.adminPanel.roles.chef ? 'bg-orange-100 text-orange-700' :
                              worker.role === t.adminPanel.roles.delivery ? 'bg-blue-100 text-blue-700' :
                              'bg-zinc-100 text-zinc-700'
                            }`}>
                              {worker.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div>{worker.email}</div>
                            <div className="text-zinc-400">{worker.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-zinc-400">
                            {worker.password}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingWorkerId(editingWorkerId === worker.id ? null : worker.id)}
                                className={`p-2 rounded-lg transition-colors ${editingWorkerId === worker.id ? 'bg-brand/10 text-brand' : 'text-zinc-300 hover:text-brand'}`}
                                title={lang === 'bs' ? 'Privilegije' : 'Permissions'}
                              >
                                <ShieldCheck className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => onDeleteWorker(worker.id)}
                                className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingWorkerId === worker.id && (
                          <tr className="bg-zinc-50/50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="flex flex-wrap gap-4 items-center">
                                <span className="text-xs font-bold text-zinc-500 uppercase mr-2">
                                  {lang === 'bs' ? 'Privilegije:' : 'Permissions:'}
                                </span>
                                {[
                                  { key: 'canManageMenu', label: lang === 'bs' ? 'Meni' : 'Menu' },
                                  { key: 'canManageOrders', label: lang === 'bs' ? 'Narudžbe' : 'Orders' },
                                  { key: 'canManageReservations', label: lang === 'bs' ? 'Rezervacije' : 'Reservations' },
                                  { key: 'canManageWorkers', label: lang === 'bs' ? 'Radnici' : 'Workers' }
                                ].map(perm => {
                                  const isEnabled = worker.permissions?.[perm.key as keyof WorkerPermissions];
                                  return (
                                    <button
                                      key={perm.key}
                                      onClick={() => togglePermission(worker, perm.key as keyof WorkerPermissions)}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isEnabled 
                                          ? 'bg-brand/10 text-brand border border-brand/20' 
                                          : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                                      }`}
                                    >
                                      {isEnabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                      {perm.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && userRole === 'admin' && appSettings && (
          <div className="space-y-8">
            {settingsSubTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
                  <h2 className="serif text-2xl font-bold mb-6">{lang === 'bs' ? 'Postavke aplikacije' : 'App Settings'}</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-black/5">
                      <div>
                        <h3 className="font-bold text-zinc-900">{lang === 'bs' ? 'Program lojalnosti' : 'Loyalty Program'}</h3>
                        <p className="text-sm text-zinc-500">{lang === 'bs' ? 'Omogući sakupljanje bodova za goste' : 'Enable point collection for guests'}</p>
                      </div>
                      <button
                        onClick={() => onUpdateAppSettings({ ...appSettings, loyaltyProgramEnabled: !appSettings.loyaltyProgramEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${appSettings.loyaltyProgramEnabled ? 'bg-brand' : 'bg-zinc-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appSettings.loyaltyProgramEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {appSettings.loyaltyProgramEnabled && (
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5">
                        <label className="block text-sm font-bold text-zinc-700 mb-2">
                          {lang === 'bs' ? 'Bodovi po KM' : 'Points per KM'}
                        </label>
                        <input
                          type="number"
                          value={appSettings.loyaltyPointsPerKM}
                          onChange={(e) => onUpdateAppSettings({ ...appSettings, loyaltyPointsPerKM: Number(e.target.value) })}
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand outline-none"
                        />
                      </div>
                    )}

                    <div className="p-8 bg-zinc-50 rounded-2xl border border-black/5 flex flex-col items-center text-center">
                      <h3 className="font-bold text-zinc-900 mb-4">{lang === 'bs' ? 'QR Kod Meni' : 'QR Code Menu'}</h3>
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeSVG value={window.location.origin} size={200} />
                      </div>
                      <p className="text-sm text-zinc-500 mb-4">
                        {lang === 'bs' 
                          ? 'Preuzmite ovaj QR kod i postavite ga na stolove kako bi gosti mogli pristupiti meniju.' 
                          : 'Download this QR code and place it on tables so guests can access the menu.'}
                      </p>
                      <button
                        onClick={() => {
                          const svg = document.querySelector('.bg-white svg');
                          if (svg) {
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx?.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL('image/png');
                              const downloadLink = document.createElement('a');
                              downloadLink.download = 'menu-qr-code.png';
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                          }
                        }}
                        className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                      >
                        {lang === 'bs' ? 'Preuzmi QR Kod' : 'Download QR Code'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'branding' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="serif text-2xl font-bold">{t.adminPanel.manageBranding}</h2>
                      <p className="text-sm text-zinc-500">{lang === 'bs' ? 'Prilagodite izgled vaše aplikacije.' : 'Customize the look and feel of your application.'}</p>
                    </div>
                    <button 
                      onClick={handleSaveBranding}
                      className="bg-brand text-white px-8 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" /> {t.adminPanel.saveChanges}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.restaurantName}</label>
                        <input 
                          type="text"
                          value={brandingForm.restaurantName}
                          onChange={e => setBrandingForm({ ...brandingForm, restaurantName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.brandColor}</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="color"
                            value={brandingForm.brandColor}
                            onChange={e => setBrandingForm({ ...brandingForm, brandColor: e.target.value })}
                            className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent"
                          />
                          <input 
                            type="text"
                            value={brandingForm.brandColor}
                            onChange={e => setBrandingForm({ ...brandingForm, brandColor: e.target.value })}
                            className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-mono text-sm uppercase"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.logoUrl}</label>
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={brandingForm.logoUrl}
                              onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                              className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all text-sm"
                              placeholder="https://..."
                            />
                            <label className="cursor-pointer bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-all flex items-center gap-2 whitespace-nowrap">
                              <ImageIcon className="w-4 h-4" />
                              {isUploading ? '...' : t.adminPanel.uploadLogo}
                              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={isUploading} />
                            </label>
                          </div>
                          {brandingForm.logoUrl && (
                            <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 flex items-center justify-center">
                              <img src={brandingForm.logoUrl} alt="Logo Preview" className="max-h-24 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-8 rounded-3xl border border-black/5 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <Palette className="w-8 h-8 text-brand" />
                      </div>
                      <h3 className="font-bold text-zinc-900 mb-2">{lang === 'bs' ? 'Pregled Brendiranja' : 'Branding Preview'}</h3>
                      <p className="text-sm text-zinc-500 mb-6">{lang === 'bs' ? 'Ovako će vaš brend izgledati u aplikaciji.' : 'This is how your brand will look in the app.'}</p>
                      
                      <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-4">
                        <div className="flex items-center gap-2 justify-center">
                          {brandingForm.logoUrl ? (
                            <img src={brandingForm.logoUrl} alt="Preview" className="w-8 h-8 object-contain" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandingForm.brandColor }}>
                              <Utensils className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <span className="serif text-xl font-bold" style={{ color: brandingForm.brandColor }}>
                            {brandingForm.restaurantName}
                          </span>
                        </div>
                        <div className="h-10 w-full rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: brandingForm.brandColor }}>
                          {lang === 'bs' ? 'Primjer Dugmeta' : 'Button Example'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'about' && editAbout && (
              <div className="space-y-8">
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="serif text-2xl font-bold">{t.adminPanel.manageAbout}</h2>
                    <button 
                      onClick={() => onUpdateAboutContent(editAbout)}
                      className="bg-brand text-white px-8 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" /> {t.adminPanel.saveChanges}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Bosnian Content */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🇧🇦</span>
                        <h3 className="font-bold text-zinc-900 uppercase tracking-wider text-sm">{t.common.bosnian}</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editStory}</label>
                          <input 
                            type="text"
                            value={editAbout.bs.storyTitle}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, storyTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.bs.storyText}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, storyText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-32 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editMission}</label>
                          <input 
                            type="text"
                            value={editAbout.bs.missionTitle}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, missionTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.bs.missionText}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, missionText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-24 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editTeam}</label>
                          <input 
                            type="text"
                            value={editAbout.bs.teamTitle}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, teamTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.bs.teamText}
                            onChange={e => setEditAbout({...editAbout, bs: {...editAbout.bs, teamText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-24 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* English Content */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🇺🇸</span>
                        <h3 className="font-bold text-zinc-900 uppercase tracking-wider text-sm">{t.common.english}</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editStory}</label>
                          <input 
                            type="text"
                            value={editAbout.en.storyTitle}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, storyTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.en.storyText}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, storyText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-32 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editMission}</label>
                          <input 
                            type="text"
                            value={editAbout.en.missionTitle}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, missionTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.en.missionText}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, missionText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-24 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.editTeam}</label>
                          <input 
                            type="text"
                            value={editAbout.en.teamTitle}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, teamTitle: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all font-bold"
                          />
                          <textarea 
                            value={editAbout.en.teamText}
                            onChange={e => setEditAbout({...editAbout, en: {...editAbout.en, teamText: e.target.value}})}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-brand outline-none transition-all h-24 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'gallery' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="serif text-2xl font-bold">{t.adminPanel.manageGallery}</h2>
                      <p className="text-sm text-zinc-500">{lang === 'bs' ? 'Dodajte ili obrišite slike koje se prikazuju u galeriji na stranici "O nama".' : 'Add or delete images displayed in the gallery on the "About Us" page.'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5 mb-8">
                    <h3 className="font-bold text-sm text-zinc-900 mb-4">{t.adminPanel.addGalleryImage}</h3>
                    <form onSubmit={(e) => { e.preventDefault(); if(newGalleryUrl) { onAddGalleryImage(newGalleryUrl); setNewGalleryUrl(''); } }} className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-grow">
                        <input 
                          type="url"
                          required
                          value={newGalleryUrl}
                          onChange={e => setNewGalleryUrl(e.target.value)}
                          placeholder={t.adminPanel.imageUrl}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 focus:border-brand outline-none transition-all"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="bg-brand text-white px-8 py-3 rounded-xl font-bold hover:bg-brand/90 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="w-5 h-5" /> {t.adminPanel.addGalleryImage}
                      </button>
                    </form>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {galleryImages.length > 0 ? (
                      galleryImages.map(img => (
                        <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-black/5">
                          <img src={img.url} alt="Gallery" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => onDeleteGalleryImage(img.id)}
                              className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors transform scale-90 group-hover:scale-100 transition-transform shadow-lg"
                              title={t.common.delete}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-300">
                        <p className="text-zinc-500">{lang === 'bs' ? 'Galerija je prazna. Dodajte prvu sliku iznad.' : 'Gallery is empty. Add your first image above.'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-xl font-bold mb-2">{lang === 'bs' ? 'Potvrda brisanja' : 'Confirm Deletion'}</h3>
            <p className="text-zinc-600 mb-6">
              {lang === 'bs' ? 'Da li ste sigurni da želite trajno obrisati ovu narudžbu?' : 'Are you sure you want to permanently delete this order?'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                {lang === 'bs' ? 'Odustani' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {lang === 'bs' ? 'Izbriši' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-xl font-bold mb-2">{lang === 'bs' ? 'Očisti narudžbe' : 'Clear Orders'}</h3>
            <p className="text-zinc-600 mb-6">
              {lang === 'bs' ? 'Da li ste sigurni da želite obrisati sve završene i otkazane narudžbe?' : 'Are you sure you want to delete all completed and cancelled orders?'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                {lang === 'bs' ? 'Odustani' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  onClearOldOrders();
                  setShowClearConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {lang === 'bs' ? 'Očisti' : 'Clear'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {mapOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl"
          >
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-bold">{lang === 'bs' ? 'Mapa dostave' : 'Delivery Map'}</h3>
                <p className="text-sm text-zinc-500">{mapOrder.customerName} - {mapOrder.address}</p>
              </div>
              <button 
                onClick={() => setMapOrder(null)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="h-[400px] relative">
              <Map
                defaultCenter={{ lat: 43.8563, lng: 18.4131 }} // Sarajevo default
                defaultZoom={13}
                mapId="DELIVERY_MAP"
                className="w-full h-full"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                <OrderMap address={mapOrder.address} brandColor={appSettings?.brandColor || '#10b981'} />
              </Map>
              
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapOrder.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-brand text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  {lang === 'bs' ? 'Otvori u Google Maps' : 'Open in Google Maps'}
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  </div>
);
}
