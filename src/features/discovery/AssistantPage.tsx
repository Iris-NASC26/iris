'use client';

/** Ask the Detective: Navida's confirm-before-search chat flow, run as local rule-based discovery. */
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { interpretTopic, normalizeKeyword, suggest, type Suggestion, type TopicIntent } from './discovery';

type Stage = 'topic' | 'review' | 'results';
interface Turn { id: number; role: 'assistant' | 'user'; text: string }

const examples = [
  'Why might rainfall and soil moisture change in a rain forest?',
  'Is the air above a large city getting more polluted?',
  'What changes in a desert over time?',
  'How is the ocean along a tidal estuary changing?',
];
const welcome = 'What are you curious about? Describe a topic, a place or a period. I will suggest variables from the approved list only. Nothing is searched or loaded until you confirm.';

function periodText(years: NonNullable<TopicIntent['years']>) {
  return years.start === years.end ? `from ${years.start}` : `${years.start}–${years.end}`;
}

function describe(intent: TopicIntent): string {
  if (!intent.keywords.length) {
    return 'I could not match that to the approved variables. Add your own keywords below, or describe a different topic using words like rain, heat, ocean, snow, smoke or vegetation.';
  }
  const notes = [intent.place && `Place noted: ${intent.place}.`, intent.years && `Period noted: ${periodText(intent.years)}.`].filter(Boolean).join(' ');
  return `I found ${intent.keywords.length} search term${intent.keywords.length === 1 ? '' : 's'} in ${intent.themes.join(', ').toLowerCase() || 'no'} themes. Review them, then confirm.${notes ? ` ${notes} Place and period are not applied to any selection yet.` : ''}`;
}

export function AssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([{ id: 0, role: 'assistant', text: welcome }]);
  const [stage, setStage] = useState<Stage>('topic');
  const [intent, setIntent] = useState<TopicIntent | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [input, setInput] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const thread = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [turns, stage]);

  const say = (role: Turn['role'], text: string) => setTurns(previous => [...previous, { id: nextId.current++, role, text }]);

  function ask(message: string) {
    const clean = message.trim();
    if (!clean || stage !== 'topic') return;
    const found = interpretTopic(clean);
    say('user', clean); say('assistant', describe(found));
    setInput(''); setIntent(found); setKeywords(found.keywords); setStage('review');
  }
  function addKeyword(event: FormEvent) {
    event.preventDefault();
    const value = normalizeKeyword(newKeyword);
    if (value && !keywords.includes(value)) setKeywords([...keywords, value]);
    setNewKeyword('');
  }
  function confirm() {
    const found = suggest(keywords);
    setResults(found); setStage('results');
    say('user', `Search the approved variables for: ${keywords.join(', ')}.`);
    say('assistant', found.length
      ? `${found.length} approved variable${found.length === 1 ? '' : 's'} match. These are planned sources only: no data have been searched or loaded, and a match is not evidence of a trend.`
      : 'None of the approved variables match those terms. The list is not extended to unsupported sources. Try other keywords or browse the full list.');
  }
  function reset() {
    setStage('topic'); setIntent(null); setKeywords([]); setResults([]); setNewKeyword('');
    setTurns([{ id: 0, role: 'assistant', text: welcome }]);
  }

  return <section className="si-chat" aria-label="Ask the Detective">
    <div className="page-heading"><p className="eyebrow">ASK THE DETECTIVE</p><h1>Explore a research topic</h1>
      <p>A guided, rule-based question flow. It suggests only from the approved variable list and works without any AI service.</p></div>
    <div className="si-thread" ref={thread} role="log" aria-live="polite" aria-label="Conversation">
      {turns.map(turn => <article className={`si-turn ${turn.role}`} key={turn.id}>
        <span className="si-avatar" aria-hidden="true">{turn.role === 'assistant' ? <Icon name="sparkles" size={14} /> : 'Y'}</span>
        <div><span className="si-speaker">{turn.role === 'assistant' ? 'Detective' : 'You'}</span><p>{turn.text}</p></div>
      </article>)}
      {turns.length === 1 && <div className="si-suggestions">{examples.map(text =>
        <button className="secondary-button" key={text} type="button" onClick={() => ask(text)}>{text}</button>)}</div>}
      {stage === 'review' && intent && <section className="si-card" aria-label="Review search terms">
        <h2>Review before searching</h2>
        <div className="si-keywords" aria-label="Search terms">{keywords.map(keyword => <span className="si-chip" key={keyword}>{keyword}
          <button type="button" aria-label={`Remove ${keyword}`} onClick={() => setKeywords(keywords.filter(item => item !== keyword))}>×</button></span>)}
          {!keywords.length && <span className="si-empty">No search terms yet.</span>}</div>
        <form className="si-add" onSubmit={addKeyword}><input aria-label="Add a search term" placeholder="Add a search term" value={newKeyword} onChange={event => setNewKeyword(event.target.value)} />
          <button className="secondary-button" type="submit" disabled={!newKeyword.trim()}>Add</button></form>
        <div className="si-actions"><span>The approved list is searched only after you confirm.</span>
          <button className="primary-button" type="button" disabled={!keywords.length} onClick={confirm}>Confirm and search <Icon name="arrow" size={15} /></button></div>
      </section>}
      {stage === 'results' && <section className="si-card" aria-label="Suggested variables">
        <h2>{results.length} suggested variable{results.length === 1 ? '' : 's'}</h2>
        <ul className="si-results">{results.map(({ variable, matched }) => <li key={variable.id}>
          <div><span className="variable-id">{variable.id} / {variable.theme}</span><strong>{variable.name}</strong>
            <small>Matches: {matched.join(', ')} · {variable.units}</small></div>
          <Link className="secondary-button" href={`/workspace/data-selection?variable=${variable.id}`}>Inspect {variable.id}<Icon name="arrow" size={14} /></Link></li>)}</ul>
        <div className="si-actions"><span>Order reflects keyword matches only, not scientific importance.</span>
          <Link className="secondary-button" href="/workspace/data-selection">Browse all variables</Link></div>
      </section>}
    </div>
    <form className="si-composer" onSubmit={event => { event.preventDefault(); ask(input); }}>
      <label className="sr-only" htmlFor="si-input">Describe a research topic</label>
      <textarea id="si-input" rows={2} value={input} disabled={stage !== 'topic'} onChange={event => setInput(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(input); } }}
        placeholder={stage === 'topic' ? 'Describe a topic, a place or a period…' : 'Review the search terms above, or start a new topic.'} />
      <div>{stage !== 'topic' && <button className="secondary-button" type="button" onClick={reset}>New topic</button>}
        <button className="primary-button" type="submit" disabled={stage !== 'topic' || !input.trim()}>Send <Icon name="arrow" size={15} /></button></div>
    </form>
    <p className="si-note">Local · rule-based · no external request is made from this page.</p>
  </section>;
}
