import React from 'react';
import { useNavigate } from 'react-router';
import { PackageCheck, CheckCircle2, CreditCard, Truck, BookOpen } from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useSession } from '../auth/SessionProvider';
import { useOrders } from './OrdersProvider';

export const OrdersPage: React.FC = () => {
  const { currentUser } = useSession();
  const { orders } = useOrders();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
        <PackageCheck className="w-16 h-16 text-slate-300 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900">Inicia sesión para ver tu historial de pedidos</h3>
      </div>
    );
  }

  const userOrders = orders.filter(o => o.buyerId === currentUser.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <PackageCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Historial de Pedidos y Pagos
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Registro de todas tus compras, métodos de pago y estados de confirmación.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
          {userOrders.length} {userOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
        </span>
      </div>

      {userOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Aún no has realizado ningún pedido</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando adquieras tus primeros libros, podrás consultar los comprobantes y estados de pago aquí.
          </p>
          <button
            onClick={() => navigate(ROUTES.home)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
            >
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Número de Pedido</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">{order.id}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha de Compra</span>
                    <span className="font-medium text-slate-700">
                      {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Pagado</span>
                    <span className="font-black text-slate-900 text-sm">${order.totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pago Aprobado</span>
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-10 h-14 object-cover rounded-lg shadow-2xs border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{item.author}</p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            item.condition === 'digital' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-slate-800">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Medio de pago: <strong className="text-slate-800">{order.paymentMethod}</strong></span>
                  </div>

                  {order.shippingAddress && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span>Destino: <strong className="text-slate-800">{order.shippingAddress}</strong></span>
                    </div>
                  )}

                  <button
                    onClick={() => navigate(ROUTES.library)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Leer en Mi Biblioteca</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
