import React, { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { MODERATION_REASON_LENGTH } from '@/constants/statuses';

interface ReasonDialogProps {
  title: string;
  description: React.ReactNode;
  label: string;
  placeholder: string;
  confirmLabel: string;
  tone?: 'danger' | 'neutral';
  onConfirm: (reason: string) => Promise<boolean>;
  onClose: () => void;
}

export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}) => {
  const fieldId = useId();
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const length = reason.trim().length;
  const isValid = length >= MODERATION_REASON_LENGTH.min;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      setShowError(true);
      return;
    }
    setIsSaving(true);
    const done = await onConfirm(reason.trim());
    setIsSaving(false);
    if (done) onClose();
  };

  return (
    <Modal onClose={() => !isSaving && onClose()} labelledBy={`${fieldId}-title`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
        <div className="space-y-1.5">
          <h2 id={`${fieldId}-title`} className="text-base font-bold text-slate-900">
            {title}
          </h2>
          <div className="text-sm text-slate-600">{description}</div>
        </div>
        <div>
          <label htmlFor={`${fieldId}-reason`} className="mb-1 block text-xs font-semibold text-slate-700">
            {label} *
          </label>
          <textarea
            id={`${fieldId}-reason`}
            rows={4}
            autoFocus
            maxLength={MODERATION_REASON_LENGTH.max}
            value={reason}
            aria-invalid={showError && !isValid}
            aria-describedby={`${fieldId}-help`}
            onChange={event => setReason(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-slate-500 focus:bg-white aria-invalid:border-rose-400"
          />
          <p
            id={`${fieldId}-help`}
            role={showError && !isValid ? 'alert' : undefined}
            className={`mt-1 text-[11px] ${showError && !isValid ? 'font-medium text-rose-700' : 'text-slate-500'}`}
          >
            {showError && !isValid
              ? `Escribí el motivo: al menos ${MODERATION_REASON_LENGTH.min} caracteres. Queda en el registro de auditoría.`
              : `${length}/${MODERATION_REASON_LENGTH.max} · Queda en el registro de auditoría.`}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-60 ${
              tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
