import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCartStore } from '../../lib/store';
import { useAuth } from '../auth/AuthContext';
import { playUiSound } from '../../lib/settings';
import { useToast } from '../../components/ui/Toast';
import { CartItem, Order, Shop } from '../../types';

type Speed = 'standard' | 'express';
type Fulfilment = 'seller' | 'newaro_rider' | 'pickup';

// Used until the admin saves delivery settings
const FALLBACK_FEES = { standardDeliveryFee: 150, expressDeliveryFee: 250, minimumOrderNpr: 100 };

const numberOr = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [buyerName, setBuyerName] = useState(profile?.displayName || '');
  const [buyerEmail] = useState(user?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || 'Kathmandu');
  const [address, setAddress] = useState(profile?.address || '');
  const [speed, setSpeed] = useState<Speed>('standard');
  const [fulfilment, setFulfilment] = useState<Fulfilment>('seller');
  const [fees, setFees] = useState(FALLBACK_FEES);
  const [submitting, setSubmitting] = useState(false);
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'platform'))
      .then((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setFees({
          standardDeliveryFee: numberOr(d.standardDeliveryFee, FALLBACK_FEES.standardDeliveryFee),
          expressDeliveryFee: numberOr(d.expressDeliveryFee, FALLBACK_FEES.expressDeliveryFee),
          minimumOrderNpr: numberOr(d.minimumOrderNpr, FALLBACK_FEES.minimumOrderNpr),
        });
      })
      .catch(() => {});
  }, []);

  // One order per shop, so each seller sees only their own items
  const groups = useMemo(() => {
    const byShop = new Map<string, CartItem[]>();
    items.forEach((item) => {
      const key = item.shopId || 'unknown-shop';
      byShop.set(key, [...(byShop.get(key) || []), item]);
    });
    return Array.from(byShop.entries()).map(([shopId, list]) => ({
      shopId,
      items: list,
      shopName: list[0]?.shopName || 'NEWARO Store',
      subtotal: list.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }));
  }, [items]);

  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const feePerOrder =
    fulfilment === 'pickup' ? 0 : speed === 'express' ? fees.expressDeliveryFee : fees.standardDeliveryFee;
  const deliveryTotal = feePerOrder * groups.length;
  const grandTotal = subtotal + deliveryTotal;
  const meetsMinimum = subtotal >= fees.minimumOrderNpr;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!user) {
      addToast('Sign in with Google to place an order.', 'error');
      navigate('/auth');
      return;
    }
    if (!meetsMinimum) {
      addToast(`The minimum order is NPR ${fees.minimumOrderNpr}.`, 'error');
      return;
    }
    if (!buyerName.trim() || !buyerPhone.trim() || !address.trim()) {
      addToast('Please complete your name, phone number, and delivery address.', 'error');
      return;
    }

    setSubmitting(true);
    playUiSound('success');
    try {
      const shippingAddress = `${address.trim()}, ${city.trim()}`;
      const ids: string[] = [];

      for (const group of groups) {
        // The seller account is the shop owner, so the seller can see and manage this order
        let ownerId = '';
        try {
          const shopSnap = await getDoc(doc(db, 'shops', group.shopId));
          if (shopSnap.exists()) ownerId = (shopSnap.data() as Shop).ownerId || '';
        } catch {
          ownerId = '';
        }

        const groupFee = fulfilment === 'pickup' ? 0 : feePerOrder;
        const payload: Omit<Order, 'id'> = {
          buyerId: user.uid,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim(),
          shippingAddress,
          city: city.trim(),
          items: group.items,
          subtotal: group.subtotal,
          deliveryFee: groupFee,
          total: group.subtotal + groupFee,
          paymentMethod: 'COD',
          status: 'pending',
          shopId: group.shopId,
          shopName: group.shopName,
          sellerId: ownerId,
          deliveryOption: speed,
          fulfilment,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const docRef = await addDoc(collection(db, 'orders'), payload);
        ids.push(docRef.id);

        if (buyerEmail && buyerEmail.includes('@')) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_placed',
              to: buyerEmail,
              data: {
                orderId: docRef.id,
                shopName: group.shopName,
                total: group.subtotal + groupFee,
                items: group.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
                shippingAddress,
              },
            }),
          }).catch(() => {});
        }
      }

      clearCart();
      setPlacedOrderIds(ids);
      addToast('Order placed. Cash on Delivery confirmed.', 'success');
    } catch (err) {
      console.warn('Order failed:', err);
      addToast('Could not place the order. Check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrderIds.length > 0) {
    return (
      <div className="max-w-lg mx-auto my-8 bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-sm space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Thank you for your order!</h1>
        <p className="text-sm text-slate-500">
          {placedOrderIds.length === 1
            ? 'Your order has been sent to the seller.'
            : `Your ${placedOrderIds.length} orders have been sent to the sellers.`}{' '}
          Pay Cash on Delivery or at pickup.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            to="/orders"
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm text-center"
          >
            Track my orders
          </Link>
          <Link
            to="/"
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm text-center"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Your cart is empty</h2>
        <Link to="/shops" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Browse shops
        </Link>
      </div>
    );
  }

  const inputClass = 'w-full text-sm p-2.5 bg-slate-50 border rounded-xl outline-hidden focus:bg-white';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white border text-slate-600 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Checkout (Cash on Delivery)</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="bg-white rounded-3xl border p-6 space-y-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
            <input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone number *</label>
            <input
              type="tel"
              required
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, street, ward, or landmark"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700 mb-2">Who delivers?</legend>
          {(
            [
              { id: 'seller', label: 'Seller delivers' },
              { id: 'newaro_rider', label: 'NEWARO rider delivers' },
              { id: 'pickup', label: 'Pick up from the seller (free)' },
            ] as { id: Fulfilment; label: string }[]
          ).map((option) => (
            <label key={option.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer">
              <input
                type="radio"
                name="fulfilment"
                checked={fulfilment === option.id}
                onChange={() => setFulfilment(option.id)}
              />
              <span className="text-sm text-slate-800">{option.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700 mb-2">Delivery speed</legend>
          {(['standard', 'express'] as Speed[]).map((option) => (
            <label
              key={option}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer ${
                fulfilment === 'pickup' ? 'opacity-50' : ''
              }`}
            >
              <span className="flex items-center gap-3 text-sm text-slate-800">
                <input
                  type="radio"
                  name="speed"
                  disabled={fulfilment === 'pickup'}
                  checked={speed === option}
                  onChange={() => setSpeed(option)}
                />
                {option === 'standard' ? 'Standard' : 'Express'}
              </span>
              <span className="text-sm font-bold tabular-nums text-slate-900">
                NPR {(option === 'standard' ? fees.standardDeliveryFee : fees.expressDeliveryFee).toLocaleString()}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="pt-3 border-t space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Items</span>
            <span className="tabular-nums">NPR {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery{groups.length > 1 ? ` (${groups.length} orders)` : ''}</span>
            <span className="tabular-nums">NPR {deliveryTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-black text-slate-900 pt-1">
            <span>Total</span>
            <span className="tabular-nums">NPR {grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {!meetsMinimum && (
          <p className="text-xs text-rose-600">
            The minimum order is NPR {fees.minimumOrderNpr.toLocaleString()}. Add NPR{' '}
            {(fees.minimumOrderNpr - subtotal).toLocaleString()} more to place this order.
          </p>
        )}

        <div className="flex justify-end">
          {user ? (
            <button
              type="submit"
              disabled={submitting || !meetsMinimum}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm order (COD)'}
            </button>
          ) : (
            <Link to="/auth" className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm">
              Sign in with Google to order
            </Link>
          )}
        </div>
      </form>
    </div>
  );
};
