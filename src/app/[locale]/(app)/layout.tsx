import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Topbar } from '@/components/layout/Topbar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { ToastProvider } from '@/components/ui/Toast'
import { OnboardingWizard } from '@/components/ui/OnboardingWizard'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-base">
        <Sidebar />
        <MobileSidebar />
        <div className="lg:ltr:pl-64 lg:rtl:pr-64">
          <Topbar />
          <main className="px-4 py-4 pb-20 lg:px-6 lg:py-6 lg:pb-6">
            {children}
          </main>
        </div>
        <BottomNav />
        <OnboardingWizard />
        <ToastProvider />
      </div>
    </AuthGuard>
  )
}
