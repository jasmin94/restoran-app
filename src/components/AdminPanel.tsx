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
  UserPlus
} from 'lucide-react';
import { MenuItem, Reservation, Order, Worker } from '../types';

interface AdminPanelProps {
  menuItems: MenuItem[];
  reservations: Reservation[];
  orders: Order[];
  workers: Worker[];
  userRole: 'admin' | 'worker';
  onUpdateReservation: (id: string, status: Reservation['status']) => void;
  onUpdateOrder: (id: string, status: Order['status']) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onAddWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  t: any;
}

export default function AdminPanel({ 
  menuItems, 
  reservations, 
  orders, 
  workers,
  userRole,
  onUpdateReservation, 
  onUpdateOrder, 
  onAddMenuItem,
  onDeleteMenuItem,
  onAddWorker,
  onDeleteWorker,
  t
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'reservations' | 'orders' | 'menu' | 'workers'>(
    userRole === 'admin' ? 'reservations' : 'orders'
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    category: t.adminPanel.categories.main,
    price: 0,
    name: '',
    description: '',
    image: ''
  });

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
      setNewItem({ category: t.adminPanel.categories.main, price: 0, name: '', description: '', image: '' });
    }
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorker.name && newWorker.email && newWorker.phone && newWorker.password) {
      onAddWorker({
        ...newWorker as Worker,
        id: `w-${Math.random().toString(36).substr(2, 9)}`,
        joinedAt: new Date().toISOString().split('T')[0]
      });
      setShowWorkerForm(false);
      setNewWorker({ name: '', role: t.adminPanel.roles.waiter, email: '', phone: '', password: '' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          {userRole === 'admin' && (
            <button 
              onClick={() => setActiveTab('reservations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'reservations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <ClipboardList className="w-5 h-5" /> {t.adminPanel.reservations}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <Package className="w-5 h-5" /> {t.adminPanel.orders}
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'menu' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            <Utensils className="w-5 h-5" /> {t.adminPanel.menuManagement}
          </button>
          {userRole === 'admin' && (
            <button 
              onClick={() => setActiveTab('workers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'workers' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Users className="w-5 h-5" /> {t.adminPanel.workers}
            </button>
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
                            res.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
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
                                  className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
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
              <div className="p-6 border-b border-black/5">
                <h2 className="serif text-2xl font-bold">{t.adminPanel.overviewOrders}</h2>
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
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                          {order.total.toFixed(2)} {t.common.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
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
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
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
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
                >
                  <Plus className="w-5 h-5" /> {t.adminPanel.newItem}
                </button>
              </div>

              {showAddForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-600/5"
                >
                  <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.itemName}</label>
                      <input 
                        required 
                        type="text" 
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.category}</label>
                      <select 
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value as any})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value={t.adminPanel.categories.appetizers}>{t.adminPanel.categories.appetizers}</option>
                        <option value={t.adminPanel.categories.main}>{t.adminPanel.categories.main}</option>
                        <option value={t.adminPanel.categories.desserts}>{t.adminPanel.categories.desserts}</option>
                        <option value={t.adminPanel.categories.drinks}>{t.adminPanel.categories.drinks}</option>
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
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.imageUrl}</label>
                      <input 
                        required 
                        type="url" 
                        value={newItem.image}
                        onChange={e => setNewItem({...newItem, image: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.description}</label>
                      <textarea 
                        required 
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all h-24"
                      ></textarea>
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
                        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
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
                    <img src={item.image} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-grow">
                      <h4 className="font-bold text-zinc-900">{item.name}</h4>
                      <p className="text-xs text-zinc-500">{item.category}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">{item.price.toFixed(2)} {t.common.currency}</p>
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
                  className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-600/5"
                >
                  <form onSubmit={handleAddWorker} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.workerName}</label>
                      <input 
                        required 
                        type="text" 
                        value={newWorker.name}
                        onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.position}</label>
                      <select 
                        value={newWorker.role}
                        onChange={e => setNewWorker({...newWorker, role: e.target.value as any})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all"
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
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{t.adminPanel.phone}</label>
                      <input 
                        required 
                        type="text" 
                        value={newWorker.phone}
                        onChange={e => setNewWorker({...newWorker, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
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
                          className="flex-grow px-4 py-3 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all" 
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
                        className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
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
                        <tr key={worker.id} className="hover:bg-zinc-50/50 transition-colors">
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
                            <button 
                              onClick={() => onDeleteWorker(worker.id)}
                              className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
