import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KpiCards } from '@/sections/KpiCards'
import { CashflowChart } from '@/sections/CashflowChart'
import { OutstandingInvoices } from '@/sections/OutstandingInvoices'
import { ActivityFeed } from '@/sections/ActivityFeed'
import { QuickAdd } from '@/sections/QuickAdd'

export default function Overview() {
  const { data, loading } = useAccount()

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  return (
    <>
      <PageHeader
        title="Overview"
        description="The money picture at a glance"
        actions={<QuickAdd />}
      />
      <div className="space-y-6">
        <KpiCards data={data} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CashflowChart monthly={data.monthly} incomeLabel={data.incomeLabel} />
          </div>
          <OutstandingInvoices invoices={data.unpaidInvoices} />
        </div>
        <ActivityFeed activity={data.activity} />
      </div>
    </>
  )
}
