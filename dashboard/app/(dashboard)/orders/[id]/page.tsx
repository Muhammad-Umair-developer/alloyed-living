import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getOrder } from "@/src/lib/data/orders"
import PageHeader from "@/src/components/ui/PageHeader"
import OrderStatusControl from "./OrderStatusControl"
import CancelOrderControl from "./CancelOrderControl"
import PaymentPanel from "./PaymentPanel"
import CancellationPanel from "./CancellationPanel"

// Order status changes here — always read fresh.
export const dynamic = "force-dynamic"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()

  return (
    <div>
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800 mb-6">
        <ArrowLeft size={13} /> Back to Orders
      </Link>

      <PageHeader
        title={order.id}
        description={`Placed ${new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`}
        action={
          <div className="flex items-center gap-2">
            <OrderStatusControl orderId={order.id} status={order.status} />
            <CancelOrderControl order={order} />
          </div>
        }
      />

      {order.status === "cancelled" && (
        <div className="max-w-4xl mb-6">
          <CancellationPanel order={order} />
        </div>
      )}

      {order.paymentMethod && (
        <div className="max-w-4xl mb-6">
          <PaymentPanel order={order} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-4xl">
        {/* Items */}
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-4">Items</p>
          <ul className="divide-y divide-stone-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded-md object-cover bg-stone-100 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-stone-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-stone-800 truncate">{item.name}</p>
                  <p className="text-[11px] text-stone-600">Qty {item.quantity}</p>
                </div>
                <p className="text-[13px] text-stone-700 tabular-nums">PKR {(item.price * item.quantity).toLocaleString()}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5">
            <div className="flex justify-between text-[12px] text-stone-500">
              <span>Subtotal</span>
              <span className="tabular-nums">PKR {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[12px] text-stone-500">
              <span>Delivery</span>
              <span className="tabular-nums">{order.delivery === 0 ? "Complimentary" : `PKR ${order.delivery.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold text-stone-900 pt-1.5 border-t border-stone-100">
              <span>Total</span>
              <span className="tabular-nums">PKR {order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Customer + shipping */}
        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-3">Customer</p>
            <p className="text-[13px] font-medium text-stone-800">{order.customer.name}</p>
            <p className="text-[12px] text-stone-500 mt-1">{order.customer.email}</p>
            {order.customer.phone && <p className="text-[12px] text-stone-500">{order.customer.phone}</p>}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-3">Shipping Address</p>
            <p className="text-[13px] text-stone-700 leading-relaxed">
              {order.shippingAddress.street}
              <br />
              {order.shippingAddress.city}
              {order.shippingAddress.province ? `, ${order.shippingAddress.province}` : ""}
              {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
              <br />
              {order.shippingAddress.country}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
