import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Modal } from '@/components/ui/Modal';

const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <header style={{ position: 'sticky', top: 0, backdropFilter: 'blur(8px)' }}>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Modal onClose={() => setOpen(false)} labelledBy="test-modal-title">
          <h2 id="test-modal-title">Ventana</h2>
          <button>Cerrar contenido</button>
        </Modal>
      )}
    </header>
  );
};

describe('modal outside layout containers', () => {
  it('renders on the body instead of inside the sticky blurred header and restores focus on close', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Ventana' });
    expect(dialog.closest('header')).toBeNull();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(trigger).toHaveFocus();
  });

  it('closes on the backdrop but not on a click inside the modal', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Cerrar contenido' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
