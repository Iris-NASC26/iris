/** Adapted from Navida's OnboardingTour. Radix owns focus trapping and restoration. */
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';

const steps = [
  { eyebrow: 'Welcome to Iris', title: 'Your Earth-system investigation workspace',
    text: 'Follow a question from a NASA variable to its observations, analysis and evidence. This practice workspace currently has no installed scientific data.', icon: 'globe' },
  { eyebrow: 'Start with a question', title: 'Choose a variable worth investigating',
    text: 'Browse the approved variable list, inspect the intended NASA product and change the explanation level. No AI service is required.', icon: 'search' },
  { eyebrow: 'Inspect before analysis', title: 'Keep the source in view',
    text: 'Check units, coverage, missing months and provenance before drawing a conclusion. Data preview will stay empty until a validated series is connected.', icon: 'layers' },
  { eyebrow: 'Separate signal from noise', title: 'Let the evidence set the pace',
    text: 'The globe and statistical analyses become available after data and methods pass review. An unavailable result will never be replaced with invented observations.', icon: 'activity' },
] as const;

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return <Dialog.Root onOpenChange={open => { if (open) setStep(0); }}>
    <Dialog.Trigger className="sidebar-tool"><Icon name="info" /><span>Take a quick tour</span></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="tour-dialog">
        <Dialog.Close className="dialog-close" aria-label="Skip onboarding">×</Dialog.Close>
        <div className="tour-visual" aria-hidden="true"><span className="tour-orbit" /><Icon name={current.icon} size={42} /></div>
        <p className="eyebrow">{current.eyebrow}</p>
        <Dialog.Title>{current.title}</Dialog.Title>
        <Dialog.Description>{current.text}</Dialog.Description>
        <div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => <i className={index <= step ? 'active' : ''} key={item.title} />)}
        </div>
        <div className="tour-actions"><Dialog.Close className="text-button">Skip tour</Dialog.Close><div>
          {step > 0 && <button className="secondary-button" onClick={() => setStep(n => n - 1)}>Back</button>}
          {step === steps.length - 1 ? <Dialog.Close className="primary-button">Start exploring</Dialog.Close>
            : <button className="primary-button" onClick={() => setStep(n => n + 1)}>Next <Icon name="arrow" size={15} /></button>}
        </div></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
