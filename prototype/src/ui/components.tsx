import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

interface StatusPillProps {
  icon: IconName
  label: string
  value: string
  tone?: 'coin' | 'danger' | 'info' | 'success' | 'warning'
}

export function StatusPill({ icon, label, value, tone = 'info' }: StatusPillProps) {
  return (
    <div className={`status-pill status-pill--${tone}`}>
      <Icon name={icon} className="status-pill__icon" />
      <span className="status-pill__label">{label}</span>
      <strong className="status-pill__value">{value}</strong>
    </div>
  )
}

interface ControlButtonProps {
  active?: boolean
  disabled?: boolean
  icon: IconName
  label: string
  meta?: string
  tone?: 'danger' | 'neutral' | 'primary' | 'success' | 'warning'
  onClick: () => void
}

export function ControlButton({
  active = false,
  disabled = false,
  icon,
  label,
  meta,
  tone = 'neutral',
  onClick,
}: ControlButtonProps) {
  return (
    <button
      className={`control-button control-button--${tone}${active ? ' is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="control-button__icon">
        <Icon name={icon} />
      </span>
      <span className="control-button__text">
        <strong>{label}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </button>
  )
}

interface IconButtonProps {
  icon: IconName
  label: string
  onClick: () => void
}

export function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button aria-label={label} className="icon-button" onClick={onClick} title={label} type="button">
      <Icon name={icon} />
    </button>
  )
}

interface InfoCardProps {
  icon: IconName
  title: string
  value: string
  detail: string
  tone?: 'danger' | 'info' | 'success' | 'warning'
}

export function InfoCard({ icon, title, value, detail, tone = 'info' }: InfoCardProps) {
  return (
    <section className={`info-card info-card--${tone}`}>
      <Icon name={icon} className="info-card__icon" />
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  )
}

interface SheetProps {
  children: ReactNode
  onClose: () => void
  title: string
}

export function Sheet({ children, onClose, title }: SheetProps) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <section className="sheet" onClick={(event) => event.stopPropagation()}>
        <header className="sheet__header">
          <h2>{title}</h2>
          <IconButton icon="close" label="Đóng" onClick={onClose} />
        </header>
        {children}
      </section>
    </div>
  )
}
