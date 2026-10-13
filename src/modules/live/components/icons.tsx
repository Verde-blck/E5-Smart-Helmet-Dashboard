import type { ReactNode } from 'react'

function Icon({ children, className = 'h-4 w-4' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const VideoIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="M15 10l6-3v10l-6-3" />
  </Icon>
)

export const PhoneIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icon>
)

export const HangUpIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M3 14.5c5-4.5 13-4.5 18 0l-2.2 2.6-3.3-1.6v-2.4a11 11 0 0 0-7 0v2.4l-3.3 1.6Z" />
  </Icon>
)

export const MicIcon = ({ off, className }: { off?: boolean; className?: string }) => (
  <Icon className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    {off && <path d="M4 4l16 16" />}
  </Icon>
)

export const CameraIcon = ({ off, className }: { off?: boolean; className?: string }) => (
  <Icon className={className}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="M15 10l6-3v10l-6-3" />
    {off && <path d="M3 3l18 18" />}
  </Icon>
)

export const SpeakerIcon = ({ off, className }: { off?: boolean; className?: string }) => (
  <Icon className={className}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {off ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8a5 5 0 0 1 0 8M19.5 5.5a9 9 0 0 1 0 13" />}
  </Icon>
)
