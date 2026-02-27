import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-bg-base">
        <AdminSidebar />
        <div className="lg:ltr:pl-64 lg:rtl:pr-64">
          <AdminTopbar />
          <main className="px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  )
}
