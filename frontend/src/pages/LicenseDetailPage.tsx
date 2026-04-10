import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { trackEvent } from '../api/analytics'
import { getCEProgress } from '../api/ce'
import { getLicense } from '../api/licenses'
import { getRenewalChecklist, type RenewalChecklist } from '../api/renewal'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value || '—'}</span>
    </div>
  )
}

function ProgressBar({ label, completed, required }: { label: string; completed: number; required: number }) {
  const pct = Math.min((completed / required) * 100, 100)
  const isMet = completed >= required
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className={isMet ? 'text-green-600 font-medium' : 'text-gray-900'}>
          {completed} / {required} hrs {isMet ? '\u2713' : ''}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${isMet ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function RenewalPanel({ checklist }: { checklist: RenewalChecklist }) {
  const completedCount = checklist.checklist.filter((c) => c.is_complete).length
  const totalCount = checklist.checklist.length

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Renewal Checklist</h2>
        <span className="text-xs text-gray-500">{completedCount}/{totalCount} ready</span>
      </div>

      {checklist.days_until_expiration !== null && (
        <div className={`rounded-lg p-3 mb-3 ${
          checklist.days_until_expiration <= 30 ? 'bg-red-50 border border-red-200'
          : checklist.days_until_expiration <= 90 ? 'bg-amber-50 border border-amber-200'
          : 'bg-blue-50 border border-blue-200'
        }`}>
          <p className={`text-sm font-medium ${
            checklist.days_until_expiration <= 30 ? 'text-red-800' : checklist.days_until_expiration <= 90 ? 'text-amber-800' : 'text-blue-800'
          }`}>
            {checklist.days_until_expiration <= 0 ? 'License expired! Renew immediately.'
              : checklist.days_until_expiration <= 30 ? `Urgent: ${checklist.days_until_expiration} days left`
              : checklist.days_until_expiration <= 90 ? `${checklist.days_until_expiration} days — renewal window open`
              : `${checklist.days_until_expiration} days until expiration`}
          </p>
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        {checklist.checklist.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              item.is_complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                {item.is_complete
                  ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  : <circle cx="10" cy="10" r="4" />}
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.is_complete ? 'text-green-700' : 'text-gray-900'}`}>{item.item}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              {item.action_url && !item.is_complete && (
                <a href={item.action_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block">Go to portal &rarr;</a>
              )}
            </div>
          </div>
        ))}
      </div>

      <a href={checklist.renewal_url} target="_blank" rel="noopener noreferrer"
        className="block w-full text-center px-6 py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors">
        Renew on Ohio eLicense Portal
      </a>
      <p className="text-[10px] text-gray-400 text-center mt-1.5">Opens eLicense LPI portal in new tab</p>
    </div>
  )
}

export default function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const licenseId = parseInt(id || '0')
  const [showRenewal, setShowRenewal] = useState(false)

  useEffect(() => {
    if (licenseId > 0) trackEvent('license_view', { license_id: licenseId }, `/license/${licenseId}`)
  }, [licenseId])

  const { data: license, isLoading } = useQuery({
    queryKey: ['license', licenseId], queryFn: () => getLicense(licenseId), enabled: licenseId > 0,
  })
  const { data: ceProgress } = useQuery({
    queryKey: ['ce-progress', licenseId], queryFn: () => getCEProgress(licenseId), enabled: licenseId > 0,
  })
  const { data: renewalChecklist } = useQuery({
    queryKey: ['renewal', licenseId], queryFn: () => getRenewalChecklist(licenseId), enabled: licenseId > 0 && showRenewal,
  })

  if (isLoading) return <div className="text-gray-500 text-center py-12">Loading...</div>
  if (!license) return <div className="text-red-500 text-center py-12">License not found</div>

  const stColor = license.status === 'ACTIVE' || license.status === 'ACTIVE / PRINT LICENSE'
    ? 'bg-green-100 text-green-800'
    : license.status.startsWith('INACTIVE') ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/lookup" className="text-sm text-blue-600 active:text-blue-800">&larr; Back</Link>
        <button
          onClick={() => {
            if (!showRenewal) trackEvent('renewal_click', { license_id: licenseId }, `/license/${licenseId}`)
            setShowRenewal(!showRenewal)
          }}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            showRenewal ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white active:bg-blue-800'
          }`}
        >
          {showRenewal ? 'Hide' : 'Renew License'}
        </button>
      </div>

      {showRenewal && renewalChecklist && <RenewalPanel checklist={renewalChecklist} />}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
              {license.first_name} {license.middle_name ? license.middle_name + ' ' : ''}{license.last_name}
              {license.suffix ? ` ${license.suffix}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{license.credential_type}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${stColor}`}>{license.status}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">License Info</h3>
            <InfoRow label="License #" value={license.license_number} />
            <InfoRow label="First Issued" value={license.first_issuance_date} />
            <InfoRow label="Current Issued" value={license.license_issued_date} />
            <InfoRow label="Expiration" value={license.expiration_date} />
            <InfoRow label="CE Due" value={license.ce_due_date} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 mt-3 md:mt-0">Contact</h3>
            <InfoRow label="Email" value={license.email} />
            <InfoRow label="Address" value={license.address1} />
            <InfoRow label="City" value={license.city} />
            <InfoRow label="State" value={license.state} />
            <InfoRow label="Zip" value={license.zip_code} />
          </div>
        </div>
      </div>

      {license.employer_name && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Employer / Supervisor</h2>
          <InfoRow label="Name" value={license.employer_name} />
          <InfoRow label="DBA" value={license.employer_dba} />
          <InfoRow label="Credential" value={license.employer_credential} />
          <InfoRow label="Status" value={license.employer_status} />
        </div>
      )}

      {ceProgress && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">CE Progress</h2>
            {ceProgress.ce_due_date && (
              <span className={`text-xs font-medium ${ceProgress.days_until_due !== null && ceProgress.days_until_due < 90 ? 'text-red-600' : 'text-gray-500'}`}>
                Due: {ceProgress.ce_due_date}
              </span>
            )}
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">Overall</span>
              <span className="text-gray-600">{ceProgress.total_hours}/{ceProgress.total_required} hrs ({ceProgress.percent_complete}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${ceProgress.percent_complete >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(ceProgress.percent_complete, 100)}%` }} />
            </div>
          </div>

          <div className="space-y-2.5">
            {ceProgress.categories.map((cat) => (
              <ProgressBar key={cat.category} label={cat.label} completed={cat.hours_completed} required={cat.hours_required} />
            ))}
          </div>

          {ceProgress.total_hours === 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">No CE records yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
