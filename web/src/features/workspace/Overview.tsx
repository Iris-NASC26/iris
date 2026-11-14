import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/ui/Icon';
import { usePreferences } from '../../state/preferences';

const descriptions = {
  explorer: 'Start with a place and a question. Follow the observations to discover what is changing on Earth.',
  student: 'Explore NASA variables, inspect monthly observations, and distinguish a measured trend from statistical evidence.',
  scientist: 'Inspect product identity, temporal support, units, regional aggregation and method assumptions before interpreting a trend.',
};
const steps: { to: string; icon: IconName; title: string; text: string; state: string }[] = [
  { to: 'data-selection', icon: 'search', title: 'Find your variable', text: 'Explore the approved Earth-system variables and their intended sources.', state: 'Browse planned catalog' },
  { to: 'data-preview', icon: 'layers', title: 'Inspect the observations', text: 'Check timestamps, units, missing months and source provenance.', state: 'Waiting for data' },
  { to: 'visualize', icon: 'activity', title: 'Follow the evidence', text: 'View trends and uncertainty once reviewed methods are connected.', state: 'Awaiting reviewed methods' },
];

export function Overview() {
  const { level } = usePreferences();
  return <>
    <section className="welcome-hero">
      <div className="hero-copy"><p className="eyebrow"><span className="tiny-orbit" />YOUR NEXT INVESTIGATION STARTS HERE</p>
        <h1>A changing planet.<br /><em>A world of clues.</em></h1><p className="hero-description">{descriptions[level]}</p>
        <div className="hero-actions"><Link className="primary-button" to="data-selection">Explore the variables <Icon name="arrow" size={17} /></Link>
          <Link className="text-button" to="evidence">How evidence works <Icon name="chevron" size={15} /></Link></div>
        <p className="hero-note">A local practice workspace. Scientific results are not available yet.</p>
      </div>
      <div className="planet-art" aria-hidden="true"><div className="planet-orbit orbit-one" /><div className="planet-orbit orbit-two" />
        <div className="planet"><div className="planet-grid" /><span className="planet-glow" /></div><span className="planet-satellite" />
        <span className="planet-caption">OBSERVE · QUESTION · UNDERSTAND</span></div>
    </section>
    <section aria-labelledby="workflow-title" className="workflow-section"><div className="section-heading"><div><p className="eyebrow">THE INVESTIGATION</p><h2 id="workflow-title">From curiosity to evidence</h2></div><span className="small-label">One traceable workflow</span></div>
      <div className="workflow-grid">{steps.map((step, index) => <Link className="workflow-card" to={step.to} key={step.to}>
        <div className="card-top"><span className="icon-tile"><Icon name={step.icon} size={23} /></span><span className="step-number">0{index + 1}</span></div>
        <h3>{step.title}</h3><p>{step.text}</p><div className="card-bottom"><span>{step.state}</span><Icon name="arrow" size={17} /></div>
      </Link>)}</div>
    </section>
    <section className="evidence-strip"><span className="icon-tile"><Icon name="check" size={25} /></span><div><h2>Good questions deserve trustworthy answers.</h2>
      <p>Sources, missing observations and scientific limitations stay visible throughout your investigation.</p></div><Link to="evidence" className="secondary-button">Our approach <Icon name="arrow" size={16} /></Link></section>
  </>;
}
